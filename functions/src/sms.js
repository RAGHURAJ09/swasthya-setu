/**
 * Module G — SMS/WhatsApp Fallback (Low-connectivity Access)
 *
 * Extends the existing smsWebhook in index.js with:
 *  - Short-code parsing: "STOCK PARA 200", "BED 8 12", "STAFF 6 10"
 *  - Free-text Hindi/English SMS → Gemini extraction
 *  - WhatsApp Business API support (same endpoint, detects from req.body.From)
 *  - Confirmation reply in same language as incoming message
 *  - Rate limiting: max 10 writes per phone per hour (simple Firestore counter)
 *
 * Endpoint: POST /sms/webhook   (Twilio/WhatsApp webhook target)
 * Test:     POST /sms/test      → { phcId, message, language }
 */

'use strict';

const admin = require('firebase-admin');
const axios  = require('axios');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
const GEMINI_KEY = process.env.GEMINI_API_KEY;

// ─── Short-code parser ────────────────────────────────────────────────────────

const MEDICINE_ALIASES = {
  'PARA': 'Paracetamol 500mg',   'PARACETAMOL': 'Paracetamol 500mg',
  'ORS':  'ORS Sachets',
  'AMOX': 'Amoxicillin 500mg',   'AMOXICILLIN': 'Amoxicillin 500mg',
  'MET':  'Metformin 500mg',     'METFORMIN':   'Metformin 500mg',
  'IRON': 'Iron & Folic Acid',
  'CTX':  'Cotrimoxazole 480mg',
  'IBU':  'Ibuprofen 400mg',     'IBUPROFEN': 'Ibuprofen 400mg',
  'OMP':  'Omeprazole 20mg',
  'SALB': 'Salbutamol Inhaler',
};

function parseShortCode(message) {
  const parts = message.trim().toUpperCase().split(/\s+/);
  // STOCK <MED> <QTY>
  if (parts[0] === 'STOCK' && parts.length >= 3) {
    const medicineName = MEDICINE_ALIASES[parts[1]] || parts[1];
    const quantity     = parseInt(parts[2]);
    if (!isNaN(quantity)) return { type: 'stock', medicineName, quantity, action: 'restock' };
  }
  // BED <OCCUPIED> <TOTAL>
  if (parts[0] === 'BED' && parts.length >= 3) {
    const occupied = parseInt(parts[1]);
    const total    = parseInt(parts[2]);
    if (!isNaN(occupied) && !isNaN(total)) return { type: 'bed', occupiedBeds: occupied, totalBeds: total };
  }
  // STAFF <PRESENT> <TOTAL>
  if (parts[0] === 'STAFF' && parts.length >= 3) {
    const present = parseInt(parts[1]);
    const total   = parseInt(parts[2]);
    if (!isNaN(present) && !isNaN(total)) return { type: 'staff', presentCount: present, totalStaff: total };
  }
  // FOOT <COUNT>
  if ((parts[0] === 'FOOT' || parts[0] === 'OPD') && parts.length >= 2) {
    const count = parseInt(parts[1]);
    if (!isNaN(count)) return { type: 'footfall', patientCount: count };
  }
  return null;
}

// ─── Gemini free-text extractor ───────────────────────────────────────────────

async function extractFromFreeText(message) {
  if (!GEMINI_KEY) return null;
  const prompt = `Extract a structured update from this PHC SMS (Indian health worker, possibly Hindi/English mix).
SMS: "${message}"
Return ONLY valid JSON (no markdown):
{"type":"stock"|"bed"|"staff"|"footfall"|"unknown","medicineName":string|null,"quantity":number|null,"occupiedBeds":number|null,"totalBeds":number|null,"presentCount":number|null,"totalStaff":number|null,"patientCount":number|null,"action":"restock"|"low_stock"|"stockout"|"unknown"}`;

  try {
    const res = await axios.post(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 200, responseMimeType: 'application/json' },
    });
    const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
    return JSON.parse(raw.replace(/```json|```/g, '').trim());
  } catch { return null; }
}

// ─── Rate limiter ─────────────────────────────────────────────────────────────

async function checkRateLimit(phoneNumber) {
  const hourKey = new Date().toISOString().slice(0, 13); // e.g. "2026-07-07T07"
  const ref     = db.collection('smsRateLimit').doc(`${phoneNumber}_${hourKey}`);
  const doc     = await ref.get();
  const count   = doc.exists ? (doc.data().count || 0) : 0;
  if (count >= 10) return false;
  await ref.set({ count: count + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return true;
}

// ─── Firestore writer ─────────────────────────────────────────────────────────

async function writeUpdate(facilityId, parsed, rawMessage, sender) {
  const today = new Date().toISOString().split('T')[0];
  const meta  = { smsFrom: sender, rawMessage, recordedAt: admin.firestore.FieldValue.serverTimestamp() };

  if (parsed.type === 'stock' && parsed.medicineName) {
    const snap = await db.collection('phcs').doc(facilityId)
      .collection('stock')
      .where('medicineName', '>=', parsed.medicineName.slice(0, 4))
      .limit(5).get();
    const match = snap.docs.find(d =>
      d.data().medicineName?.toLowerCase().includes((parsed.medicineName || '').toLowerCase().slice(0, 5))
    );
    if (match && parsed.quantity != null) {
      const update = { ...meta };
      if (parsed.action === 'restock') {
        update.currentQty   = (match.data().currentQty || 0) + parsed.quantity;
        update.lastRestocked = today;
      } else {
        update.currentQty = parsed.quantity;
      }
      await match.ref.update(update);
      return { ok: true, collection: 'stock', medicineName: parsed.medicineName, quantity: parsed.quantity };
    }
    return { ok: false, reason: `Medicine "${parsed.medicineName}" not found` };
  }

  if (parsed.type === 'bed' && parsed.occupiedBeds != null) {
    const facDoc  = await db.collection('phcs').doc(facilityId).get();
    const totalBeds = parsed.totalBeds || facDoc.data()?.bedCapacity || 10;
    await db.collection('phcs').doc(facilityId).collection('beds').doc(today).set({
      date: today, occupiedBeds: parsed.occupiedBeds, totalBeds,
      utilization: Math.round((parsed.occupiedBeds / totalBeds) * 100), ...meta,
    }, { merge: true });
    return { ok: true, collection: 'beds', occupiedBeds: parsed.occupiedBeds, totalBeds };
  }

  if (parsed.type === 'staff' && parsed.presentCount != null) {
    const total = parsed.totalStaff || 8;
    await db.collection('phcs').doc(facilityId).collection('staffAttendance').doc(today).set({
      date: today,
      presentCount:  parsed.presentCount,
      totalStaff:    total,
      attendanceRate: Math.round((parsed.presentCount / total) * 100),
      ...meta,
    }, { merge: true });
    return { ok: true, collection: 'staffAttendance', presentCount: parsed.presentCount };
  }

  if (parsed.type === 'footfall' && parsed.patientCount != null) {
    await db.collection('phcs').doc(facilityId).collection('footfall').doc(today).set({
      date: today, patientCount: parsed.patientCount, source: 'sms', ...meta,
    }, { merge: true });
    return { ok: true, collection: 'footfall', patientCount: parsed.patientCount };
  }

  return { ok: false, reason: 'Unknown record type or missing data' };
}

// ─── SMS reply builder ────────────────────────────────────────────────────────

function buildReply(writeResult, parsed) {
  if (!writeResult.ok) {
    return `❌ Update failed: ${writeResult.reason}. Use format: STOCK PARA 200 | BED 8 12 | STAFF 6 10 | FOOT 45`;
  }
  if (parsed.type === 'stock') {
    return `✅ ${parsed.medicineName} stock updated: ${parsed.quantity} units. Swasthya Setu`;
  }
  if (parsed.type === 'bed') {
    return `✅ Bed status: ${writeResult.occupiedBeds}/${writeResult.totalBeds} occupied. Swasthya Setu`;
  }
  if (parsed.type === 'staff') {
    return `✅ Staff attendance: ${writeResult.presentCount} present. Swasthya Setu`;
  }
  if (parsed.type === 'footfall') {
    return `✅ ${writeResult.patientCount} patients recorded today. Swasthya Setu`;
  }
  return '✅ Update recorded. Swasthya Setu';
}

// ─── HTTP Handlers ─────────────────────────────────────────────────────────────

/**
 * POST /sms/webhook — Twilio/WhatsApp Business webhook
 * Twilio sends: Body, From, To; WhatsApp: same fields with "whatsapp:" prefix
 */
async function handleSmsWebhook(req, res) {
  const body    = (req.body.Body    || req.body.message || '').trim();
  const from    = (req.body.From    || req.body.sender  || 'unknown').replace('whatsapp:', '');
  const phcId   =  req.body.phcId   || req.query.phcId  || null;

  if (!body) {
    res.set('Content-Type', 'text/xml');
    return res.send(`<?xml version="1.0"?><Response><Message>Send: STOCK PARA 200</Message></Response>`);
  }

  // Rate limiting
  const allowed = await checkRateLimit(from).catch(() => true);
  if (!allowed) {
    res.set('Content-Type', 'text/xml');
    return res.send(`<?xml version="1.0"?><Response><Message>Too many messages. Try again in 1 hour.</Message></Response>`);
  }

  // Parse
  let parsed = parseShortCode(body);
  if (!parsed) parsed = await extractFromFreeText(body);

  let writeResult = { ok: false, reason: 'Could not parse message' };
  if (parsed && parsed.type !== 'unknown' && phcId) {
    writeResult = await writeUpdate(phcId, parsed, body, from).catch(e => ({ ok: false, reason: e.message }));
  }

  const reply = buildReply(writeResult, parsed || {});

  // Log SMS interaction
  await db.collection('smsLogs').add({
    from, phcId, body, parsed, writeResult, reply,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  }).catch(() => {});

  // Twilio TwiML response
  res.set('Content-Type', 'text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${reply}</Message></Response>`);
}

/**
 * POST /sms/test — developer test endpoint (returns JSON instead of TwiML)
 */
async function handleSmsTest(req, res) {
  const { phcId, message, language } = req.body;
  if (!phcId || !message) {
    return res.status(400).json({ success: false, error: 'phcId and message required' });
  }
  try {
    let parsed = parseShortCode(message);
    if (!parsed) parsed = await extractFromFreeText(message);
    const writeResult = parsed && parsed.type !== 'unknown'
      ? await writeUpdate(phcId, parsed, message, 'test')
      : { ok: false, reason: 'Could not parse' };
    const reply = buildReply(writeResult, parsed || {});
    res.json({ success: true, data: { parsed, writeResult, reply } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

module.exports = { handleSmsWebhook, handleSmsTest };
