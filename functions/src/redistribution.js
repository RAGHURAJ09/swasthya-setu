/**
 * Module C — Smart Redistribution Recommender
 *
 * Given district-wide inventory, finds:
 *   - Facilities with surplus (currentQty >> reorderThreshold)
 *   - Facilities with deficit (daysLeft < threshold)
 * Scores matches by urgency × surplus × proximity (Maps Distance Matrix).
 * Generates Gemini plain-language justification.
 *
 * Endpoints:
 *   GET /redistribution                  → all pending suggestions for district
 *   POST /redistribution/generate        → run recommendation engine now
 *   PATCH /redistribution/:id/approve    → officer approves, updates both stock docs
 */

'use strict';

const admin = require('firebase-admin');
const axios  = require('axios');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const GEMINI_URL  = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_KEY  = process.env.GEMINI_API_KEY;
const MAPS_KEY    = process.env.MAPS_API_KEY;

// Days-left threshold below which a facility is a "receiver"
const RECEIVER_THRESHOLD = 14;
// Surplus ratio above which a facility is a "donor" (qty > threshold * factor)
const DONOR_FACTOR = 2.0;
// Max travel distance in km for redistribution to be practical
const MAX_DIST_KM = 80;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function callGemini(prompt) {
  if (!GEMINI_KEY) return null;
  try {
    const res = await axios.post(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 200 },
    });
    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch { return null; }
}

async function getRoadDistance(originLatLng, destLatLng) {
  if (!MAPS_KEY) {
    // Haversine fallback
    const R = 6371;
    const dLat = (destLatLng.lat - originLatLng.lat) * Math.PI / 180;
    const dLng = (destLatLng.lng - originLatLng.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
      Math.cos(originLatLng.lat * Math.PI/180) * Math.cos(destLatLng.lat * Math.PI/180) *
      Math.sin(dLng/2)**2;
    const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return { distanceKm: parseFloat(distKm.toFixed(1)), travelTimeMin: Math.round(distKm * 1.5) };
  }
  try {
    const res = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins:      `${originLatLng.lat},${originLatLng.lng}`,
        destinations: `${destLatLng.lat},${destLatLng.lng}`,
        mode: 'driving', key: MAPS_KEY,
      },
    });
    const el = res.data?.rows?.[0]?.elements?.[0];
    return {
      distanceKm:    parseFloat(((el?.distance?.value || 50000) / 1000).toFixed(1)),
      travelTimeMin: Math.round((el?.duration?.value  || 3600)  / 60),
    };
  } catch {
    return { distanceKm: 50, travelTimeMin: 60 };
  }
}

// ─── Core recommendation engine ───────────────────────────────────────────────

async function generateSuggestions(districtId) {
  // Load all facilities in district
  const facSnap = await db.collection('phcs').where('district', '==', districtId).get();
  if (facSnap.empty) return [];

  // Load stock for all facilities
  const facilityStocks = await Promise.all(facSnap.docs.map(async doc => {
    const stockSnap = await db.collection('phcs').doc(doc.id).collection('stock').get();
    const stock = {};
    stockSnap.docs.forEach(s => { stock[s.id] = { id: s.id, ...s.data() }; });
    return { id: doc.id, ...doc.data(), stock };
  }));

  const suggestions = [];
  const allMedicineIds = [...new Set(facilityStocks.flatMap(f => Object.keys(f.stock)))];

  for (const medId of allMedicineIds) {
    const receivers = facilityStocks.filter(f => {
      const s = f.stock[medId];
      if (!s) return false;
      const daily = s.wmaConsumption || s.avgDailyConsumption || 1;
      const daysLeft = s.currentQty / daily;
      return daysLeft < RECEIVER_THRESHOLD;
    });

    const donors = facilityStocks.filter(f => {
      const s = f.stock[medId];
      if (!s) return false;
      return s.currentQty > s.reorderThreshold * DONOR_FACTOR;
    });

    for (const receiver of receivers) {
      const recStock = receiver.stock[medId];
      const recDaily = recStock.wmaConsumption || recStock.avgDailyConsumption || 1;
      const recDaysLeft = recStock.currentQty / recDaily;

      // Rank donors for this receiver
      const scoredDonors = await Promise.all(
        donors
          .filter(d => d.id !== receiver.id)
          .map(async donor => {
            const donorStock = donor.stock[medId];
            const surplus    = donorStock.currentQty - donorStock.reorderThreshold;
            const geo        = await getRoadDistance(
              { lat: donor.lat, lng: donor.lng },
              { lat: receiver.lat, lng: receiver.lng }
            );
            if (geo.distanceKm > MAX_DIST_KM) return null;

            // Combined score: urgency (40%) + surplus (35%) + proximity (25%)
            const urgencyScore  = Math.max(0, 100 - recDaysLeft * 5);
            const surplusScore  = Math.min(100, surplus / 10);
            const proxScore     = Math.max(0, 100 - geo.distanceKm);
            const score         = urgencyScore * 0.4 + surplusScore * 0.35 + proxScore * 0.25;

            return { donor, donorStock, surplus, ...geo, score };
          })
      );

      const valid = scoredDonors.filter(Boolean).sort((a, b) => b.score - a.score);
      if (valid.length === 0) continue;

      const best      = valid[0];
      const transferQty = Math.min(
        Math.floor(best.surplus * 0.5),                       // max half the surplus
        Math.ceil(recDaily * 21)                               // 3-week coverage
      );
      if (transferQty <= 0) continue;

      // Check for duplicate suggestion already pending
      const existing = await db.collection('redistributionSuggestions')
        .where('fromPhcId', '==', best.donor.id)
        .where('toPhcId',   '==', receiver.id)
        .where('medicineId','==', medId)
        .where('approved',  '==', false)
        .limit(1).get();
      if (!existing.empty) continue;

      const justification = await callGemini(`
Write one sentence justifying this medicine transfer (max 50 words, no markdown):
From: ${best.donor.name} (surplus: ${best.surplus} ${recStock.unit})
To: ${receiver.name} (only ${recDaysLeft.toFixed(1)} days of stock left)
Medicine: ${recStock.medicineName}, Transfer: ${transferQty} ${recStock.unit}
Distance: ${best.distanceKm} km (${best.travelTimeMin} min drive)`
      ) || `${receiver.name} will run out of ${recStock.medicineName} in ${recDaysLeft.toFixed(1)} days; ${best.donor.name} has surplus ${best.surplus} ${recStock.unit} just ${best.distanceKm} km away.`;

      suggestions.push({
        fromPhcId:     best.donor.id,
        fromPhcName:   best.donor.name,
        toPhcId:       receiver.id,
        toPhcName:     receiver.name,
        medicineId:    medId,
        medicine:      recStock.medicineName,
        quantity:      transferQty,
        unit:          recStock.unit,
        distanceKm:    best.distanceKm,
        travelTimeMin: best.travelTimeMin,
        fromSurplus:   best.surplus,
        receiverDaysLeft: parseFloat(recDaysLeft.toFixed(1)),
        urgencyScore:  parseFloat(best.score.toFixed(1)),
        justification,
        approved:      false,
        createdAt:     admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // Write all new suggestions to Firestore
  const batch = db.batch();
  suggestions.forEach(s => {
    batch.set(db.collection('redistributionSuggestions').doc(), s);
  });
  await batch.commit();

  return suggestions;
}

// ─── HTTP Handlers ─────────────────────────────────────────────────────────────

async function handleGetSuggestions(req, res) {
  try {
    const districtId = req.query.district || 'baghpat';
    let q = db.collection('redistributionSuggestions')
      .orderBy('urgencyScore', 'desc').limit(50);
    if (req.query.approved !== undefined) {
      q = q.where('approved', '==', req.query.approved === 'true');
    }
    const snap = await q.get();
    const data = snap.docs.map(d => ({ id: d.id, ...d.data(),
      createdAt: d.data().createdAt?.toDate?.()?.toISOString() }));
    res.json({ success: true, data });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

async function handleGenerate(req, res) {
  try {
    const district = req.body.district || req.query.district || 'baghpat';
    const suggestions = await generateSuggestions(district);
    res.json({ success: true, data: { generated: suggestions.length, suggestions } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

async function handleApprove(req, res) {
  const { id } = req.params;
  try {
    const ref = db.collection('redistributionSuggestions').doc(id);
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ success: false, error: 'Not found' });

    const s = doc.data();
    if (s.approved) return res.status(400).json({ success: false, error: 'Already approved' });

    // Update both stock records atomically
    const batch = db.batch();

    // Deduct from donor
    const fromRef = db.collection('phcs').doc(s.fromPhcId).collection('stock').doc(s.medicineId);
    const fromDoc = await fromRef.get();
    if (fromDoc.exists) {
      batch.update(fromRef, {
        currentQty: Math.max(0, (fromDoc.data().currentQty || 0) - s.quantity),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Add to receiver
    const toRef = db.collection('phcs').doc(s.toPhcId).collection('stock').doc(s.medicineId);
    const toDoc = await toRef.get();
    if (toDoc.exists) {
      batch.update(toRef, {
        currentQty: (toDoc.data().currentQty || 0) + s.quantity,
        lastRestocked: new Date().toISOString().split('T')[0],
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Mark suggestion approved
    batch.update(ref, {
      approved:   true,
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: req.body.approvedBy || 'officer',
    });

    await batch.commit();
    const updated = await ref.get();
    res.json({ success: true, data: { id, ...updated.data() } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

module.exports = { handleGetSuggestions, handleGenerate, handleApprove, generateSuggestions };
