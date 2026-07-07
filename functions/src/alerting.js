/**
 * Module D — Alerting & Auto-Flagging Engine
 *
 * Rule-based triggers:
 *   - stock below reorder_threshold          → 'stockout' alert
 *   - staff absent 3+ consecutive days       → 'understaffed' alert
 *   - bed occupancy > 90%                    → 'overcrowded' alert
 *   - diagnostic test unavailable > 48 hrs   → 'low_test_capacity' alert
 *
 * AI layer: Gemini summarises all open alerts per facility into one
 * paragraph → 'underperforming'/'under-resourced' flag for admin.
 *
 * Endpoints (mounted on Express router in index.js):
 *   POST /alerts/run-rules                   → run rule engine now for all facilities
 *   GET  /alerts/summary/:facilityId         → Gemini summary for a facility
 *   GET  /alerts/district-summary            → ranked list across whole district
 */

'use strict';

const admin = require('firebase-admin');
const axios  = require('axios');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function callGemini(prompt) {
  if (!GEMINI_KEY) return null;
  try {
    const res = await axios.post(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 300 },
    });
    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch { return null; }
}

function today() { return new Date().toISOString().split('T')[0]; }
function nDaysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ─── Rule Evaluators ──────────────────────────────────────────────────────────

async function checkStockRules(facilityId, facilityData) {
  const alerts = [];
  const snap = await db.collection('phcs').doc(facilityId).collection('stock').get();

  for (const doc of snap.docs) {
    const s = doc.data();
    if (s.currentQty <= s.reorderThreshold) {
      const daily    = s.wmaConsumption || s.avgDailyConsumption || 1;
      const daysLeft = s.currentQty / daily;
      const severity = daysLeft < 3 ? 'critical' : 'warning';

      // Deduplicate: skip if unresolved alert already exists
      const dup = await db.collection('districtAlerts')
        .where('phcId',      '==', facilityId)
        .where('medicineId', '==', doc.id)
        .where('type',       '==', 'stockout')
        .where('resolved',   '==', false)
        .limit(1).get();
      if (!dup.empty) continue;

      alerts.push({
        phcId: facilityId, phcName: facilityData.name,
        type: 'stockout', severity,
        medicineId: doc.id,
        medicine:   s.medicineName,
        currentQty: s.currentQty,
        reorderThreshold: s.reorderThreshold,
        daysUntilStockout: parseFloat(daysLeft.toFixed(1)),
        resolved: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
  return alerts;
}

async function checkStaffRules(facilityId, facilityData) {
  const alerts = [];
  const dates  = [today(), nDaysAgo(1), nDaysAgo(2)]; // last 3 days

  const snaps = await Promise.all(
    dates.map(d => db.collection('phcs').doc(facilityId).collection('staffAttendance').doc(d).get())
  );

  const rates = snaps.filter(s => s.exists).map(s => s.data().attendanceRate || 100);
  if (rates.length < 2) return alerts;

  const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  if (avgRate < 60) {
    const dup = await db.collection('districtAlerts')
      .where('phcId',    '==', facilityId)
      .where('type',     '==', 'understaffed')
      .where('resolved', '==', false)
      .limit(1).get();
    if (dup.empty) {
      alerts.push({
        phcId: facilityId, phcName: facilityData.name,
        type: 'understaffed',
        severity: avgRate < 40 ? 'critical' : 'warning',
        attendanceRate: parseFloat(avgRate.toFixed(1)),
        daysChecked: rates.length,
        resolved: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
  return alerts;
}

async function checkBedRules(facilityId, facilityData) {
  const alerts = [];
  const snap = await db.collection('phcs').doc(facilityId)
    .collection('beds').doc(today()).get();
  if (!snap.exists) return alerts;

  const b = snap.data();
  if (b.utilization > 90) {
    const dup = await db.collection('districtAlerts')
      .where('phcId',    '==', facilityId)
      .where('type',     '==', 'overcrowded')
      .where('resolved', '==', false)
      .limit(1).get();
    if (dup.empty) {
      alerts.push({
        phcId: facilityId, phcName: facilityData.name,
        type: 'overcrowded', severity: 'warning',
        bedUtilization: b.utilization,
        occupiedBeds: b.occupiedBeds,
        totalBeds: b.totalBeds,
        resolved: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
  return alerts;
}

async function checkTestRules(facilityId, facilityData) {
  const alerts = [];
  const snap = await db.collection('phcs').doc(facilityId)
    .collection('testAvailability').where('available', '==', false).get();

  for (const doc of snap.docs) {
    const t = doc.data();
    // Check if audit date is > 2 days ago
    if (!t.lastAuditDate) continue;
    const auditAge = (Date.now() - new Date(t.lastAuditDate).getTime()) / (1000 * 3600 * 24);
    if (auditAge < 2) continue;

    const dup = await db.collection('districtAlerts')
      .where('phcId',    '==', facilityId)
      .where('testId',   '==', doc.id)
      .where('type',     '==', 'low_test_capacity')
      .where('resolved', '==', false)
      .limit(1).get();
    if (dup.empty) {
      alerts.push({
        phcId: facilityId, phcName: facilityData.name,
        type: 'low_test_capacity', severity: 'warning',
        testId: doc.id, testName: t.testName,
        unavailableSinceDays: parseFloat(auditAge.toFixed(0)),
        resolved: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
  return alerts;
}

// ─── Run all rules for one facility ──────────────────────────────────────────

async function runRulesForFacility(facilityId) {
  const facDoc = await db.collection('phcs').doc(facilityId).get();
  if (!facDoc.exists) return [];

  const facilityData = facDoc.data();
  const [stockAlerts, staffAlerts, bedAlerts, testAlerts] = await Promise.all([
    checkStockRules(facilityId, facilityData),
    checkStaffRules(facilityId, facilityData),
    checkBedRules(facilityId, facilityData),
    checkTestRules(facilityId, facilityData),
  ]);

  const allAlerts = [...stockAlerts, ...staffAlerts, ...bedAlerts, ...testAlerts];
  if (allAlerts.length > 0) {
    const batch = db.batch();
    allAlerts.forEach(a => batch.set(db.collection('districtAlerts').doc(), a));
    await batch.commit();
  }
  return allAlerts;
}

// ─── Gemini facility summary ──────────────────────────────────────────────────

async function getFacilitySummary(facilityId) {
  const facDoc = await db.collection('phcs').doc(facilityId).get();
  const fac    = facDoc.exists ? facDoc.data() : { name: facilityId };

  const openAlerts = await db.collection('districtAlerts')
    .where('phcId',    '==', facilityId)
    .where('resolved', '==', false)
    .orderBy('createdAt', 'desc')
    .get();

  if (openAlerts.empty) {
    return { facilityId, facilityName: fac.name, alertCount: 0, severity: 'ok', summary: 'No open alerts.', alerts: [] };
  }

  const alerts = openAlerts.docs.map(d => d.data());
  const hasCritical = alerts.some(a => a.severity === 'critical');

  const lines = alerts.map(a => {
    if (a.type === 'stockout')         return `Stock-out risk: ${a.medicine} — ${a.daysUntilStockout} days left (${a.severity})`;
    if (a.type === 'understaffed')     return `Staff attendance: ${a.attendanceRate}% over last ${a.daysChecked} days (${a.severity})`;
    if (a.type === 'overcrowded')      return `Beds: ${a.bedUtilization}% occupied (${a.occupiedBeds}/${a.totalBeds}) — overcrowded`;
    if (a.type === 'low_test_capacity')return `Test unavailable: ${a.testName} for ${a.unavailableSinceDays}+ days`;
    return `${a.type}: ${a.severity}`;
  }).join('\n');

  const prompt = `You are a district health administrator's AI assistant in India.
Facility: ${fac.name} (${fac.block || ''}, ${fac.districtName || ''})
Open alerts (${alerts.length} total):
${lines}
Write ONE paragraph (max 80 words) flagging this facility as underperforming or under-resourced. 
Be specific. Mention the two most critical issues. No bullet points. No markdown.`;

  const aiSummary = await callGemini(prompt) ||
    `${fac.name} has ${alerts.length} open alerts including ${hasCritical ? 'critical' : 'warning'}-level issues requiring immediate district intervention.`;

  return {
    facilityId,
    facilityName:  fac.name,
    alertCount:    alerts.length,
    severity:      hasCritical ? 'critical' : 'warning',
    summary:       aiSummary,
    alerts:        alerts.map(a => ({ type: a.type, severity: a.severity, medicine: a.medicine, testName: a.testName })),
  };
}

// ─── HTTP Handlers ─────────────────────────────────────────────────────────────

async function handleRunRules(req, res) {
  try {
    const snap  = await db.collection('phcs').get();
    const results = await Promise.all(snap.docs.map(d => runRulesForFacility(d.id)));
    const total = results.flat().length;
    res.json({ success: true, data: { alertsCreated: total, facilitiesChecked: snap.size } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

async function handleFacilitySummary(req, res) {
  try {
    const summary = await getFacilitySummary(req.params.facilityId);
    res.json({ success: true, data: summary });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

async function handleDistrictSummary(req, res) {
  try {
    const district = req.query.district || 'baghpat';
    const snap = await db.collection('phcs').where('district', '==', district).get();
    const summaries = await Promise.all(snap.docs.map(d => getFacilitySummary(d.id)));
    // Rank: critical first, then by alert count
    summaries.sort((a, b) => {
      if (a.severity === 'critical' && b.severity !== 'critical') return -1;
      if (b.severity === 'critical' && a.severity !== 'critical') return 1;
      return b.alertCount - a.alertCount;
    });
    res.json({ success: true, data: summaries });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
}

module.exports = {
  handleRunRules,
  handleFacilitySummary,
  handleDistrictSummary,
  runRulesForFacility,
};
