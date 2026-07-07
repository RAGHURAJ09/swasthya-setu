/**
 * Module B — Stock-out Prediction & Demand Forecast
 *
 * Pipeline:
 *  1. Pull 30-day stock history from Firestore per facility
 *  2. Compute weighted moving-average daily consumption (recent days weighted 2×)
 *  3. Export aggregated time-series rows to BigQuery (dataset: swasthya_setu)
 *  4. Call Gemini API with trend context for reasoning-based projection
 *  5. HTTP endpoint: GET /forecast/:facilityId  → ranked list by urgency
 *
 * BigQuery table schema: stock_history
 *   facility_id STRING, medicine_id STRING, medicine_name STRING,
 *   snapshot_date DATE, qty_on_hand INT64, daily_consumption FLOAT64,
 *   days_until_stockout FLOAT64, recorded_at TIMESTAMP
 */

'use strict';

const { BigQuery } = require('@google-cloud/bigquery');
const admin        = require('firebase-admin');

const bq      = new BigQuery();
const BQ_DS   = process.env.BQ_DATASET   || 'swasthya_setu';
const BQ_TBL  = process.env.BQ_TABLE     || 'stock_history';
const PROJECT  = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || 'swasthya-setu-1969d';

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const axios = require('axios');
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const GEMINI_KEY = process.env.GEMINI_API_KEY;

async function callGemini(prompt) {
  if (!GEMINI_KEY) return null;
  try {
    const res = await axios.post(`${GEMINI_URL}?key=${GEMINI_KEY}`, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    });
    return res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch { return null; }
}

/**
 * Weighted moving average — last 7 days weighted 2×, older days 1×
 */
function computeWMA(dailySeries) {
  if (!dailySeries || dailySeries.length === 0) return 0;
  const recent = dailySeries.slice(-7);
  const older  = dailySeries.slice(0, -7);
  const sumRecent = recent.reduce((a, b) => a + b, 0);
  const sumOlder  = older.reduce((a, b) => a + b, 0);
  const totalWeight = recent.length * 2 + older.length;
  return totalWeight > 0 ? (sumRecent * 2 + sumOlder) / totalWeight : 0;
}

/**
 * Fetch last N days of stock snapshots for a facility from Firestore.
 * Uses the existing stock sub-collection (avgDailyConsumption + currentQty).
 * For a richer signal we also pull footfall counts as a demand proxy.
 */
async function buildFacilityForecast(facilityId) {
  const db = admin.firestore();

  // Get facility metadata
  const facDoc = await db.collection('phcs').doc(facilityId).get();
  if (!facDoc.exists) throw new Error(`Facility ${facilityId} not found`);
  const facility = { id: facilityId, ...facDoc.data() };

  // Get all stock items
  const stockSnap = await db.collection('phcs').doc(facilityId).collection('stock').get();
  if (stockSnap.empty) return { facility, forecasts: [] };

  // Get last 30 days of footfall for demand scaling
  const today   = new Date();
  const dates30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split('T')[0];
  });

  const footfallSnap = await db.collection('phcs').doc(facilityId)
    .collection('footfall')
    .where(admin.firestore.FieldPath.documentId(), '>=', dates30[0])
    .where(admin.firestore.FieldPath.documentId(), '<=', dates30[29])
    .get();

  const footfallByDate = {};
  footfallSnap.docs.forEach(d => { footfallByDate[d.id] = d.data().patientCount || 0; });

  // Build a synthetic daily-consumption series using footfall scaling
  const avgFootfall = Object.values(footfallByDate).reduce((a, b) => a + b, 0) /
    Math.max(1, Object.values(footfallByDate).length);

  const forecasts = stockSnap.docs.map(doc => {
    const s = doc.data();
    const baseDaily = s.avgDailyConsumption || 1;

    // Simulate daily consumption series: scale by footfall ratio per day
    const dailySeries = dates30.map(date => {
      const ff = footfallByDate[date];
      if (!ff || avgFootfall === 0) return baseDaily;
      return baseDaily * (ff / avgFootfall);
    });

    const wmaConsumption = computeWMA(dailySeries);
    const effectiveDaily = Math.max(0.1, wmaConsumption);
    const daysLeft       = s.currentQty / effectiveDaily;
    const trend          = wmaConsumption > baseDaily * 1.1 ? 'increasing' :
                           wmaConsumption < baseDaily * 0.9 ? 'decreasing' : 'stable';

    // Urgency: 0–100 (higher = more urgent)
    const urgency = daysLeft <= 0 ? 100 :
                    daysLeft < 3  ? 90 :
                    daysLeft < 7  ? 70 :
                    daysLeft < 14 ? 40 :
                    daysLeft < 30 ? 15 : 0;

    return {
      medicineId:          doc.id,
      medicineName:        s.medicineName,
      currentQty:          s.currentQty,
      unit:                s.unit,
      reorderThreshold:    s.reorderThreshold,
      baseAvgConsumption:  baseDaily,
      wmaConsumption:      parseFloat(effectiveDaily.toFixed(2)),
      daysLeft:            parseFloat(daysLeft.toFixed(1)),
      trend,
      urgency,
      status: urgency >= 90 ? 'critical' : urgency >= 70 ? 'warning' : urgency >= 15 ? 'watch' : 'ok',
      dailySeries,    // used for BQ export, stripped from API response
    };
  });

  // Sort by urgency descending
  forecasts.sort((a, b) => b.urgency - a.urgency);
  return { facility, forecasts };
}

/**
 * Export forecast data to BigQuery for historical analytics.
 * Creates dataset/table if they don't exist.
 */
async function exportToBigQuery(facilityId, forecasts) {
  try {
    const dataset = bq.dataset(BQ_DS, { projectId: PROJECT });

    // Ensure dataset exists
    const [dsExists] = await dataset.exists();
    if (!dsExists) {
      await bq.createDataset(BQ_DS, { location: 'asia-south1' });
    }

    const table = dataset.table(BQ_TBL);
    const [tblExists] = await table.exists();
    if (!tblExists) {
      await dataset.createTable(BQ_TBL, {
        schema: {
          fields: [
            { name: 'facility_id',        type: 'STRING' },
            { name: 'medicine_id',        type: 'STRING' },
            { name: 'medicine_name',      type: 'STRING' },
            { name: 'snapshot_date',      type: 'DATE' },
            { name: 'qty_on_hand',        type: 'INTEGER' },
            { name: 'daily_consumption',  type: 'FLOAT' },
            { name: 'days_until_stockout',type: 'FLOAT' },
            { name: 'urgency_score',      type: 'INTEGER' },
            { name: 'trend',              type: 'STRING' },
            { name: 'recorded_at',        type: 'TIMESTAMP' },
          ],
        },
        timePartitioning: { type: 'DAY', field: 'snapshot_date' },
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const rows  = forecasts.map(f => ({
      facility_id:         facilityId,
      medicine_id:         f.medicineId,
      medicine_name:       f.medicineName,
      snapshot_date:       today,
      qty_on_hand:         Math.round(f.currentQty),
      daily_consumption:   f.wmaConsumption,
      days_until_stockout: f.daysLeft,
      urgency_score:       f.urgency,
      trend:               f.trend,
      recorded_at:         new Date().toISOString(),
    }));

    if (rows.length > 0) {
      await table.insert(rows, { skipInvalidRows: true, ignoreUnknownValues: true });
    }
    return rows.length;
  } catch (e) {
    console.error('BQ export error (non-fatal):', e.message);
    return 0;
  }
}

// ─── HTTP Handler: GET /forecast/:facilityId ───────────────────────────────────

async function handleForecast(req, res) {
  const facilityId = req.params.facilityId;
  if (!facilityId) return res.status(400).json({ success: false, error: 'facilityId required' });

  try {
    const { facility, forecasts } = await buildFacilityForecast(facilityId);

    // Get Gemini narrative for top 3 urgent drugs
    const urgent = forecasts.filter(f => f.urgency >= 40).slice(0, 3);
    let aiSummary = null;

    if (urgent.length > 0) {
      const lines = urgent.map(f =>
        `- ${f.medicineName}: ${f.currentQty} ${f.unit} left, consuming ${f.wmaConsumption}/day (${f.trend}), ~${f.daysLeft} days left`
      ).join('\n');

      const prompt = `You are a healthcare supply chain AI for Indian public health facilities.
Facility: ${facility.name} (${facility.block}, ${facility.districtName || facility.district})
Critical inventory situation:
${lines}
Write 2 sentences summarizing the risk and one specific action to take. Max 60 words. No bullets. No markdown.`;

      aiSummary = await callGemini(prompt);
    }

    // Export to BQ asynchronously (don't block response)
    exportToBigQuery(facilityId, forecasts).catch(() => {});

    // Strip dailySeries from API response
    const responseForecasts = forecasts.map(({ dailySeries: _, ...f }) => f);

    res.json({
      success: true,
      data: {
        facilityId,
        facilityName:  facility.name,
        generatedAt:   new Date().toISOString(),
        aiSummary,
        totalDrugs:    forecasts.length,
        criticalCount: forecasts.filter(f => f.status === 'critical').length,
        warningCount:  forecasts.filter(f => f.status === 'warning').length,
        forecasts:     responseForecasts,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}

// ─── Scheduled: daily BQ export for ALL facilities ────────────────────────────

async function runDailyExport() {
  const snap = await db.collection('phcs').get();
  let total  = 0;
  for (const doc of snap.docs) {
    const { forecasts } = await buildFacilityForecast(doc.id);
    const n = await exportToBigQuery(doc.id, forecasts);
    total += n;
    // Update daysUntilStockout in Firestore stock docs
    const batch = db.batch();
    forecasts.forEach(f => {
      batch.update(
        db.collection('phcs').doc(doc.id).collection('stock').doc(f.medicineId),
        { daysUntilStockout: f.daysLeft, wmaConsumption: f.wmaConsumption, trend: f.trend }
      );
    });
    await batch.commit();
  }
  return total;
}

module.exports = { handleForecast, runDailyExport };
