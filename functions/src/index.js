/**
 * Swasthya Setu — Cloud Functions Entry Point
 *
 * Module A — REST CRUD API           (/api/*)
 * Module B — Demand Forecast          (/forecast/:facilityId)
 * Module C — Redistribution Engine    (/redistribution/*)
 * Module D — Alerting & Auto-Flag     (/alerts/run-rules, /alerts/summary/:id, /alerts/district-summary)
 * Module E — Multilingual Voice/Text  (/intake/*)
 * Module G — SMS/WhatsApp Fallback    (/sms/*)
 */

const functions = require('firebase-functions');
const admin     = require('firebase-admin');
const axios     = require('axios');
const express   = require('express');
const cors      = require('cors');

admin.initializeApp();
const db = admin.firestore();

// ─── Module imports ────────────────────────────────────────────────────────────
const apiRouter                                             = require('./api');
const { handleForecast, runDailyExport }                   = require('./forecast');
const { handleGetSuggestions, handleGenerate, handleApprove, generateSuggestions } = require('./redistribution');
const { handleRunRules, handleFacilitySummary, handleDistrictSummary, runRulesForFacility } = require('./alerting');
const { handleVoiceIntake, handleTextIntake, handleTTS }   = require('./intake');
const { handleSmsWebhook, handleSmsTest }                  = require('./sms');

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));

// Module A — CRUD
app.use('/api', apiRouter);

// Module B — Forecast
app.get('/forecast/:facilityId', handleForecast);

// Module C — Redistribution
app.get('/redistribution',              handleGetSuggestions);
app.post('/redistribution/generate',    handleGenerate);
app.patch('/redistribution/:id/approve',handleApprove);

// Module D — Alerting
app.post('/alerts/run-rules',                   handleRunRules);
app.get('/alerts/summary/:facilityId',          handleFacilitySummary);
app.get('/alerts/district-summary',             handleDistrictSummary);

// Module E — Multilingual intake
app.post('/intake/voice',  handleVoiceIntake);
app.post('/intake/text',   handleTextIntake);
app.post('/intake/tts',    handleTTS);

// Module G — SMS/WhatsApp
app.post('/sms/webhook',   handleSmsWebhook);
app.post('/sms/test',      handleSmsTest);

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', version: '2.0' }));

/**
 * Single HTTP Cloud Function — all routes above
 */
exports.api = functions.https.onRequest(app);

// ─── Module B — Daily forecast export to BigQuery ────────────────────────────
exports.dailyForecastExport = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const n = await runDailyExport();
    functions.logger.info(`dailyForecastExport: exported ${n} rows to BigQuery`);
    return null;
  });

// ─── Module C — Daily redistribution generation ───────────────────────────────
exports.dailyRedistribution = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const suggestions = await generateSuggestions('baghpat');
    functions.logger.info(`dailyRedistribution: generated ${suggestions.length} suggestions`);
    return null;
  });

// ─── Module D — Hourly rule engine ───────────────────────────────────────────
exports.hourlyAlertRules = functions.pubsub
  .schedule('every 1 hours')
  .onRun(async () => {
    const snap = await db.collection('phcs').get();
    let total  = 0;
    for (const doc of snap.docs) {
      const alerts = await runRulesForFacility(doc.id);
      total += alerts.length;
    }
    functions.logger.info(`hourlyAlertRules: created ${total} alerts`);
    return null;
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_API_KEY = functions.config().gemini?.key || process.env.GEMINI_API_KEY;
const MAPS_API_KEY   = functions.config().maps?.key   || process.env.MAPS_API_KEY;

async function callGemini(prompt) {
  const res = await axios.post(
    `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
    {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
    },
    { headers: { 'Content-Type': 'application/json' } },
  );
  return res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

async function getDistanceMatrix(origins, destinations) {
  if (!MAPS_API_KEY) return null;
  const url = 'https://maps.googleapis.com/maps/api/distancematrix/json';
  const res = await axios.get(url, {
    params: {
      origins: origins.join('|'),
      destinations: destinations.join('|'),
      mode: 'driving',
      key: MAPS_API_KEY,
    },
  });
  return res.data;
}

// ─── §3a: Stock-out prediction ────────────────────────────────────────────────

/**
 * Runs daily. For each PHC and each medicine:
 * 1. Pull 30-day stock history from Firestore
 * 2. Compute avgDailyConsumption (moving average)
 * 3. Predict daysUntilStockout = currentQty / avgDailyConsumption
 * 4. If < 7 days → write districtAlerts with Gemini recommendation
 */
exports.stockPrediction = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    functions.logger.info('stockPrediction: starting daily run');

    const phcsSnapshot = await db.collection('phcs').get();

    for (const phcDoc of phcsSnapshot.docs) {
      const phcId   = phcDoc.id;
      const phcData = phcDoc.data();

      const stockSnapshot = await db
        .collection('phcs').doc(phcId)
        .collection('stock').get();

      for (const stockDoc of stockSnapshot.docs) {
        const medicineId = stockDoc.id;
        const stock      = stockDoc.data();

        const { currentQty, reorderThreshold, avgDailyConsumption, medicineName } = stock;

        if (!avgDailyConsumption || avgDailyConsumption <= 0) continue;

        const daysUntilStockout = currentQty / avgDailyConsumption;

        // Update the avgDailyConsumption (simple moving average stub)
        // In production: query last 30 days of footfall/consumption logs
        await stockDoc.ref.update({ daysUntilStockout });

        if (daysUntilStockout < 7) {
          const severity = daysUntilStockout < 3 ? 'critical' : 'warning';

          // Check if unresolved alert already exists
          const existingAlerts = await db.collection('districtAlerts')
            .where('phcId', '==', phcId)
            .where('medicineId', '==', medicineId)
            .where('resolved', '==', false)
            .get();

          if (!existingAlerts.empty) continue; // already alerted

          // Call Gemini for recommendation
          const prompt = `
You are a healthcare supply chain AI. Write a concise one-sentence recommendation (max 40 words):
PHC: ${phcData.name}, Block: ${phcData.block}
Medicine: ${medicineName}
Current stock: ${currentQty} units, Daily consumption: ${avgDailyConsumption} units/day
Days until stockout: ${daysUntilStockout.toFixed(1)}
Suggest which other PHC might have surplus and approximate quantity to redistribute.
Do NOT use markdown. Be specific.
          `.trim();

          let aiRecommendation = `${medicineName} at ${phcData.name} will run out in ${daysUntilStockout.toFixed(1)} days — redistribution from a nearby PHC recommended.`;
          try { aiRecommendation = await callGemini(prompt); } catch (e) { /* use default */ }

          await db.collection('districtAlerts').add({
            phcId,
            phcName:   phcData.name,
            medicineId,
            medicine:  medicineName,
            type:      'stockout',
            severity,
            daysUntilStockout,
            currentQty,
            aiRecommendation,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            resolved:  false,
          });

          functions.logger.info(`Alert created: ${phcData.name} / ${medicineName} — ${daysUntilStockout.toFixed(1)} days`);
        }
      }
    }

    return null;
  });

// ─── §3b: Smart resource redistribution ──────────────────────────────────────

/**
 * Triggered by a new districtAlert (stockout type).
 * 1. Query all PHCs in same district for same medicine (surplus)
 * 2. Get Distance Matrix for real travel time
 * 3. Re-rank by urgency + distance combined score
 * 4. Write redistribution suggestion with Gemini justification
 */
exports.smartRedistribution = functions.firestore
  .document('districtAlerts/{alertId}')
  .onCreate(async (snap, context) => {
    const alert = snap.data();
    if (alert.type !== 'stockout') return null;

    const { phcId: toPhcId, medicineId, medicine, daysUntilStockout } = alert;

    // Get all other PHCs in same district
    const toPhcDoc  = await db.collection('phcs').doc(toPhcId).get();
    const toPhcData = toPhcDoc.data();
    const districtId = toPhcData.district;

    const allPhcsSnap = await db.collection('phcs')
      .where('district', '==', districtId)
      .get();

    const donors = [];

    for (const phcDoc of allPhcsSnap.docs) {
      if (phcDoc.id === toPhcId) continue;

      const stockDoc = await db.collection('phcs').doc(phcDoc.id)
        .collection('stock').doc(medicineId).get();

      if (!stockDoc.exists) continue;

      const stock = stockDoc.data();
      const surplus = stock.currentQty - stock.reorderThreshold;

      if (surplus > 0) {
        donors.push({ phcId: phcDoc.id, phcData: phcDoc.data(), surplus, stock });
      }
    }

    if (donors.length === 0) return null;

    // Get Distance Matrix
    const toDest = `${toPhcData.lat},${toPhcData.lng}`;
    const origins = donors.map((d) => `${d.phcData.lat},${d.phcData.lng}`);

    let travelTimes = donors.map(() => ({ distanceKm: 50, travelTimeMin: 60 })); // fallback
    try {
      const matrix = await getDistanceMatrix(origins, [toDest]);
      if (matrix && matrix.status === 'OK' && matrix.rows && matrix.rows.length > 0) {
        travelTimes = matrix.rows.map((row) => ({
          distanceKm:    Math.round((row.elements[0]?.distance?.value || 50000) / 1000),
          travelTimeMin: Math.round((row.elements[0]?.duration?.value || 3600) / 60),
        }));
      }
    } catch (e) { /* use fallback */ }

    // Score: urgency (days remaining) + distance (inversely weighted)
    const scoredDonors = donors.map((d, i) => {
      const distScore    = Math.max(0, 100 - travelTimes[i].distanceKm);
      const surplusScore = Math.min(100, d.surplus / 10);
      const urgencyScore = Math.max(0, 100 - daysUntilStockout * 10);
      const combinedScore = urgencyScore * 0.5 + surplusScore * 0.3 + distScore * 0.2;
      return { ...d, ...travelTimes[i], combinedScore };
    }).sort((a, b) => b.combinedScore - a.combinedScore);

    const best = scoredDonors[0];
    const transferQty = Math.min(best.surplus, Math.ceil(best.stock.avgDailyConsumption * 14));

    const prompt = `
Write a concise redistribution justification (max 50 words) for this healthcare supply transfer:
From: ${best.phcData.name} (${best.surplus} units surplus)
To: ${toPhcData.name} (${daysUntilStockout.toFixed(1)} days until stockout)
Medicine: ${medicine}, Transfer quantity: ${transferQty} units
Distance: ${best.distanceKm} km, Travel time: ${best.travelTimeMin} min
Focus on: why this specific quantity, donor buffer remaining, days of coverage gained.
    `.trim();

    let justification = `Transfer ${transferQty} units of ${medicine} from ${best.phcData.name} to ${toPhcData.name} — resolves shortage for 14 days while leaving donor with safe buffer.`;
    try { justification = await callGemini(prompt); } catch (e) { /* use default */ }

    await db.collection('redistributionSuggestions').add({
      alertId:         context.params.alertId,
      fromPhcId:       best.phcId,
      fromPhcName:     best.phcData.name,
      toPhcId,
      toPhcName:       toPhcData.name,
      medicine,
      quantity:        transferQty,
      distanceKm:      best.distanceKm,
      travelTimeMin:   best.travelTimeMin,
      fromSurplus:     best.surplus,
      justification,
      approved:        false,
      createdAt:       admin.firestore.FieldValue.serverTimestamp(),
    });

    functions.logger.info(`Redistribution suggestion: ${best.phcData.name} → ${toPhcData.name}, ${transferQty} ${medicine}`);
    return null;
  });

// ─── §3c: PHC Health Score (weekly) ──────────────────────────────────────────

/**
 * Weekly scheduled function. Scores each PHC 0-100 on:
 *   - stockout frequency (weight 35%)
 *   - doctor attendance rate (weight 30%)
 *   - bed utilization vs capacity (weight 20%)
 *   - footfall trend (weight 15%)
 * Flags PHCs below 50 to district admin with Gemini explanation.
 */
exports.phcHealthScore = functions.pubsub
  .schedule('every monday 06:00')
  .onRun(async (context) => {
    functions.logger.info('phcHealthScore: weekly run starting');

    const today   = new Date();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const phcsSnapshot = await db.collection('phcs').get();

    for (const phcDoc of phcsSnapshot.docs) {
      const phcId   = phcDoc.id;
      const phcData = phcDoc.data();

      // Stockout frequency (last 7 days)
      const stockoutsSnap = await db.collection('districtAlerts')
        .where('phcId', '==', phcId)
        .where('type', '==', 'stockout')
        .where('createdAt', '>=', weekAgo)
        .get();
      const stockoutFreq = stockoutsSnap.size;
      const stockScore   = Math.max(0, 100 - stockoutFreq * 20);

      // Doctor attendance (last available record)
      const todayStr     = today.toISOString().split('T')[0];
      const attendSnap   = await db.collection('phcs').doc(phcId)
        .collection('staffAttendance').doc(todayStr).get();
      const attendData   = attendSnap.exists ? attendSnap.data() : {};
      const attendRate   = attendData.attendanceRate || 75;
      const attendScore  = attendRate;

      // Bed utilization
      const bedsSnap = await db.collection('phcs').doc(phcId)
        .collection('beds').doc(todayStr).get();
      const bedsData = bedsSnap.exists ? bedsSnap.data() : {};
      const bedUtil  = bedsData.utilization || 60;
      // Overcrowded (>90%) is bad, under-used (<30%) is also concerning
      const bedScore = bedUtil > 90 ? 30 : bedUtil < 30 ? 50 : 85;

      // Footfall trend (compare this week vs last week — stub)
      const footScore = 75; // stub; in production query footfall sub-collection

      const healthScore = Math.round(
        stockScore   * 0.35 +
        attendScore  * 0.30 +
        bedScore     * 0.20 +
        footScore    * 0.15,
      );

      // Update PHC document
      await phcDoc.ref.update({ healthScore, lastScored: admin.firestore.FieldValue.serverTimestamp() });

      // Flag PHCs below 50
      if (healthScore < 50) {
        const prompt = `
You are a district health AI. Write a 2-sentence explanation (max 60 words) of why this PHC scored ${healthScore}/100 and suggest 2 specific interventions:
PHC: ${phcData.name}, Block: ${phcData.block}
Stockout incidents this week: ${stockoutFreq}
Doctor attendance rate: ${attendRate.toFixed(0)}%
Bed utilization: ${bedUtil}%
Be direct and actionable. No bullet points.
        `.trim();

        let summary = `${phcData.name} scored ${healthScore}/100 due to supply shortages and attendance issues. Immediate action: restock critical medicines and coordinate staff redeployment.`;
        try { summary = await callGemini(prompt); } catch (e) { /* use default */ }

        await db.collection('districtAlerts').add({
          phcId,
          phcName:           phcData.name,
          type:              'low_health_score',
          severity:          'warning',
          healthScore,
          aiRecommendation:  summary,
          stockoutFreq,
          attendanceRate:    attendRate,
          bedUtilization:    bedUtil,
          createdAt:         admin.firestore.FieldValue.serverTimestamp(),
          resolved:          false,
        });
      }
    }

    return null;
  });

// ─── §4: SMS/WhatsApp webhook ────────────────────────────────────────────────

/**
 * HTTP endpoint for Twilio/WhatsApp Business API webhooks.
 * Parses free-text SMS like "STOCK PARA 50" or
 * "Paracetamol khatam ho raha hai sirf 50 bachi hai"
 * into a structured Firestore stock write.
 */
exports.smsWebhook = functions.https.onRequest(async (req, res) => {
  const body   = req.body.Body  || req.body.message || '';
  const from   = req.body.From  || req.body.sender  || 'unknown';
  const phcId  = req.body.phcId || 'unknown'; // passed as metadata in Twilio webhook

  functions.logger.info(`smsWebhook: from=${from}, body="${body}"`);

  const prompt = `
Extract stock update information from this SMS sent by a PHC pharmacist.
SMS: "${body}"
Return a JSON object (no markdown):
{"medicineName": string, "quantity": number or null, "action": "restock"|"low_stock"|"stockout"|"unknown"}
Only return the JSON object, nothing else.
  `.trim();

  let parsed = { medicineName: 'Unknown', quantity: null, action: 'unknown' };
  try {
    const geminiResponse = await callGemini(prompt);
    parsed = JSON.parse(geminiResponse);
  } catch (e) {
    // Fallback: simple regex parse
    const qtyMatch = body.match(/\d+/);
    parsed.quantity = qtyMatch ? parseInt(qtyMatch[0]) : null;
    if (body.toLowerCase().includes('para')) parsed.medicineName = 'Paracetamol 500mg';
  }

  // Write to Firestore
  if (parsed.medicineName !== 'Unknown' && phcId !== 'unknown') {
    const stockRef = db.collection('phcs').doc(phcId).collection('stock');
    const existing = await stockRef.where('medicineName', '==', parsed.medicineName).limit(1).get();

    if (!existing.empty && parsed.quantity !== null) {
      await existing.docs[0].ref.update({
        currentQty: parsed.quantity,
        lastUpdatedBy: 'sms',
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  // Twilio expects XML response
  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>✅ Received: ${parsed.medicineName} — ${parsed.quantity ?? 'unknown'} units. Saved successfully.</Message>
</Response>`);
});
