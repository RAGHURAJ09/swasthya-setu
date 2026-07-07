/**
 * Swasthya Setu — REST API Cloud Function
 *
 * Exposes HTTP CRUD endpoints for all Firestore collections:
 *   /facilities              → phcs
 *   /facilities/:id/inventory     → phcs/{id}/stock
 *   /facilities/:id/footfall      → phcs/{id}/footfall
 *   /facilities/:id/beds          → phcs/{id}/beds
 *   /facilities/:id/staff-attendance → phcs/{id}/staffAttendance
 *   /facilities/:id/tests         → phcs/{id}/testAvailability
 *   /alerts                  → districtAlerts
 *
 * All writes use Firebase Admin SDK (bypasses Firestore security rules).
 * Responses follow: { success: bool, data?: any, error?: string }
 */

const express = require('express');
const cors    = require('cors');
const admin   = require('firebase-admin');

// Guard: admin may already be initialized by index.js
if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

const router = express.Router();
router.use(cors({ origin: true }));
router.use(express.json());

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ok  = (res, data, status = 200) => res.status(status).json({ success: true, data });
const err = (res, message, status = 400) => res.status(status).json({ success: false, error: message });

/** Convert Firestore doc → plain JS object with id field */
const toObj = (doc) => ({ id: doc.id, ...doc.data() });

/** Convert Firestore Timestamp fields to ISO strings for JSON serialization */
const serialize = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v.toDate === 'function') {
      out[k] = v.toDate().toISOString();
    } else if (Array.isArray(v)) {
      out[k] = v.map(serialize);
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      out[k] = serialize(v);
    } else {
      out[k] = v;
    }
  }
  return out;
};

const serializeDoc = (doc) => serialize(toObj(doc));

// ─── FACILITIES (phcs) ────────────────────────────────────────────────────────

/**
 * GET /facilities
 * Query params: district (optional filter)
 */
router.get('/facilities', async (req, res) => {
  try {
    let ref = db.collection('phcs');
    if (req.query.district) {
      ref = ref.where('district', '==', req.query.district);
    }
    const snap = await ref.get();
    ok(res, snap.docs.map(serializeDoc));
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * POST /facilities
 * Body: { name, district, block, lat, lng, staffCount, bedCapacity, type }
 */
router.post('/facilities', async (req, res) => {
  try {
    const { name, district, block, lat, lng, staffCount, bedCapacity, type = 'PHC' } = req.body;
    if (!name || !district || !block) return err(res, 'name, district, block are required');

    const data = {
      name, district, block,
      lat: lat ?? 0, lng: lng ?? 0,
      staffCount: staffCount ?? 0,
      bedCapacity: bedCapacity ?? 0,
      type,
      healthScore: 75,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection('phcs').add(data);
    ok(res, { id: ref.id, ...data }, 201);
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * GET /facilities/:id
 */
router.get('/facilities/:id', async (req, res) => {
  try {
    const doc = await db.collection('phcs').doc(req.params.id).get();
    if (!doc.exists) return err(res, 'Facility not found', 404);
    ok(res, serializeDoc(doc));
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * PUT /facilities/:id  — full replace
 * PATCH /facilities/:id — partial update
 */
router.put('/facilities/:id', async (req, res) => {
  try {
    const ref = db.collection('phcs').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'Facility not found', 404);

    await ref.set({ ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: false });
    const updated = await ref.get();
    ok(res, serializeDoc(updated));
  } catch (e) {
    err(res, e.message, 500);
  }
});

router.patch('/facilities/:id', async (req, res) => {
  try {
    const ref = db.collection('phcs').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'Facility not found', 404);

    await ref.update({ ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const updated = await ref.get();
    ok(res, serializeDoc(updated));
  } catch (e) {
    err(res, e.message, 500);
  }
});

// ─── INVENTORY (stock) ────────────────────────────────────────────────────────

/**
 * GET /facilities/:id/inventory
 * Query params: lowStock=true (filter items below reorderThreshold)
 */
router.get('/facilities/:id/inventory', async (req, res) => {
  try {
    let ref = db.collection('phcs').doc(req.params.id).collection('stock');
    const snap = await ref.get();
    let items = snap.docs.map(serializeDoc);

    if (req.query.lowStock === 'true') {
      items = items.filter(i => i.currentQty <= i.reorderThreshold);
    }
    ok(res, items);
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * POST /facilities/:id/inventory
 * Body: { medicineName, currentQty, unit, reorderThreshold, avgDailyConsumption, lastRestocked }
 */
router.post('/facilities/:id/inventory', async (req, res) => {
  try {
    const { medicineName, currentQty, unit, reorderThreshold, avgDailyConsumption } = req.body;
    if (!medicineName) return err(res, 'medicineName is required');

    const data = {
      medicineName,
      currentQty: currentQty ?? 0,
      unit: unit ?? 'tablets',
      reorderThreshold: reorderThreshold ?? 100,
      avgDailyConsumption: avgDailyConsumption ?? 10,
      daysUntilStockout: avgDailyConsumption > 0
        ? Math.round((currentQty ?? 0) / avgDailyConsumption)
        : 999,
      lastRestocked: req.body.lastRestocked || new Date().toISOString().split('T')[0],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection('phcs').doc(req.params.id)
      .collection('stock').add(data);
    ok(res, { id: ref.id, ...data }, 201);
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * GET /facilities/:id/inventory/:medicineId
 */
router.get('/facilities/:id/inventory/:medicineId', async (req, res) => {
  try {
    const doc = await db.collection('phcs').doc(req.params.id)
      .collection('stock').doc(req.params.medicineId).get();
    if (!doc.exists) return err(res, 'Medicine record not found', 404);
    ok(res, serializeDoc(doc));
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * PUT /facilities/:id/inventory/:medicineId
 * Also recalculates daysUntilStockout
 */
router.put('/facilities/:id/inventory/:medicineId', async (req, res) => {
  try {
    const ref = db.collection('phcs').doc(req.params.id)
      .collection('stock').doc(req.params.medicineId);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'Medicine record not found', 404);

    const merged = { ...doc.data(), ...req.body };
    const daysUntilStockout = merged.avgDailyConsumption > 0
      ? Math.round(merged.currentQty / merged.avgDailyConsumption)
      : 999;

    await ref.set({ ...merged, daysUntilStockout, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const updated = await ref.get();
    ok(res, serializeDoc(updated));
  } catch (e) {
    err(res, e.message, 500);
  }
});

// ─── FOOTFALL ─────────────────────────────────────────────────────────────────

/**
 * GET /facilities/:id/footfall
 * Query params: from=YYYY-MM-DD, to=YYYY-MM-DD (default last 7 days)
 */
router.get('/facilities/:id/footfall', async (req, res) => {
  try {
    const to   = req.query.to   || new Date().toISOString().split('T')[0];
    const from = req.query.from || (() => {
      const d = new Date(); d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    })();

    const snap = await db.collection('phcs').doc(req.params.id)
      .collection('footfall')
      .where(admin.firestore.FieldPath.documentId(), '>=', from)
      .where(admin.firestore.FieldPath.documentId(), '<=', to)
      .get();

    ok(res, snap.docs.map(serializeDoc));
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * POST /facilities/:id/footfall
 * Body: { date (YYYY-MM-DD), patientCount, opd, emergency, maternity, source }
 */
router.post('/facilities/:id/footfall', async (req, res) => {
  try {
    const { date, patientCount, opd = 0, emergency = 0, maternity = 0, source = 'manual' } = req.body;
    if (!date || !patientCount) return err(res, 'date and patientCount are required');

    const data = {
      date, patientCount,
      departments: { opd, emergency, maternity },
      source,
      recordedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    // Use date as doc ID so each day is one record
    await db.collection('phcs').doc(req.params.id)
      .collection('footfall').doc(date).set(data, { merge: true });
    ok(res, { id: date, ...data }, 201);
  } catch (e) {
    err(res, e.message, 500);
  }
});

// ─── BED STATUS ───────────────────────────────────────────────────────────────

/**
 * GET /facilities/:id/beds
 * Query params: from, to (date strings YYYY-MM-DD)
 */
router.get('/facilities/:id/beds', async (req, res) => {
  try {
    const to   = req.query.to   || new Date().toISOString().split('T')[0];
    const from = req.query.from || (() => {
      const d = new Date(); d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    })();

    const snap = await db.collection('phcs').doc(req.params.id)
      .collection('beds')
      .where(admin.firestore.FieldPath.documentId(), '>=', from)
      .where(admin.firestore.FieldPath.documentId(), '<=', to)
      .get();

    ok(res, snap.docs.map(serializeDoc));
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * POST /facilities/:id/beds
 * Body: { date, totalBeds, occupiedBeds, general, maternity, emergency }
 */
router.post('/facilities/:id/beds', async (req, res) => {
  try {
    const { date, totalBeds, occupiedBeds, general = 0, maternity = 0, emergency = 0 } = req.body;
    if (!date || totalBeds === undefined || occupiedBeds === undefined) {
      return err(res, 'date, totalBeds, occupiedBeds are required');
    }

    const utilization = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
    const data = {
      date, totalBeds, occupiedBeds, utilization,
      departments: { general, maternity, emergency },
      recordedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('phcs').doc(req.params.id)
      .collection('beds').doc(date).set(data, { merge: true });
    ok(res, { id: date, ...data }, 201);
  } catch (e) {
    err(res, e.message, 500);
  }
});

// ─── STAFF ATTENDANCE ─────────────────────────────────────────────────────────

/**
 * GET /facilities/:id/staff-attendance
 * Query params: from, to (date strings)
 */
router.get('/facilities/:id/staff-attendance', async (req, res) => {
  try {
    const to   = req.query.to   || new Date().toISOString().split('T')[0];
    const from = req.query.from || (() => {
      const d = new Date(); d.setDate(d.getDate() - 7);
      return d.toISOString().split('T')[0];
    })();

    const snap = await db.collection('phcs').doc(req.params.id)
      .collection('staffAttendance')
      .where(admin.firestore.FieldPath.documentId(), '>=', from)
      .where(admin.firestore.FieldPath.documentId(), '<=', to)
      .get();

    ok(res, snap.docs.map(serializeDoc));
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * POST /facilities/:id/staff-attendance
 * Body: { date, staff: [{ doctorId, name, role, present, checkInTime, department }] }
 */
router.post('/facilities/:id/staff-attendance', async (req, res) => {
  try {
    const { date, staff = [] } = req.body;
    if (!date) return err(res, 'date is required');

    const presentCount  = staff.filter(s => s.present).length;
    const attendanceRate = staff.length > 0
      ? Math.round((presentCount / staff.length) * 100)
      : 0;

    const data = {
      date, staff, presentCount, totalStaff: staff.length, attendanceRate,
      recordedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    await db.collection('phcs').doc(req.params.id)
      .collection('staffAttendance').doc(date).set(data, { merge: true });
    ok(res, { id: date, ...data }, 201);
  } catch (e) {
    err(res, e.message, 500);
  }
});

// ─── TEST AVAILABILITY ────────────────────────────────────────────────────────

/**
 * GET /facilities/:id/tests
 */
router.get('/facilities/:id/tests', async (req, res) => {
  try {
    const snap = await db.collection('phcs').doc(req.params.id)
      .collection('testAvailability').get();
    ok(res, snap.docs.map(serializeDoc));
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * POST /facilities/:id/tests
 * Body: { testName, available, lastAuditDate }
 */
router.post('/facilities/:id/tests', async (req, res) => {
  try {
    const { testName, available = true, lastAuditDate } = req.body;
    if (!testName) return err(res, 'testName is required');

    const data = {
      testName,
      available,
      lastAuditDate: lastAuditDate || new Date().toISOString().split('T')[0],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection('phcs').doc(req.params.id)
      .collection('testAvailability').add(data);
    ok(res, { id: ref.id, ...data }, 201);
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * PUT /facilities/:id/tests/:testId
 */
router.put('/facilities/:id/tests/:testId', async (req, res) => {
  try {
    const ref = db.collection('phcs').doc(req.params.id)
      .collection('testAvailability').doc(req.params.testId);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'Test record not found', 404);

    await ref.update({ ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    const updated = await ref.get();
    ok(res, serializeDoc(updated));
  } catch (e) {
    err(res, e.message, 500);
  }
});

// ─── ALERTS ───────────────────────────────────────────────────────────────────

/**
 * GET /alerts
 * Query params: phcId, type, resolved (bool), severity, limit (default 50)
 */
router.get('/alerts', async (req, res) => {
  try {
    let ref = db.collection('districtAlerts').orderBy('createdAt', 'desc');

    if (req.query.phcId)    ref = ref.where('phcId',    '==', req.query.phcId);
    if (req.query.type)     ref = ref.where('type',     '==', req.query.type);
    if (req.query.severity) ref = ref.where('severity', '==', req.query.severity);
    if (req.query.resolved !== undefined) {
      ref = ref.where('resolved', '==', req.query.resolved === 'true');
    }

    ref = ref.limit(parseInt(req.query.limit) || 50);
    const snap = await ref.get();
    ok(res, snap.docs.map(serializeDoc));
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * POST /alerts
 * Manually create an alert (e.g. from PHC staff)
 */
router.post('/alerts', async (req, res) => {
  try {
    const { phcId, type, severity = 'warning', aiRecommendation = '' } = req.body;
    if (!phcId || !type) return err(res, 'phcId and type are required');

    const data = {
      ...req.body,
      severity,
      aiRecommendation,
      resolved: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = await db.collection('districtAlerts').add(data);
    ok(res, { id: ref.id, ...data }, 201);
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * PATCH /alerts/:id/resolve
 * Body: { resolvedBy, resolution }
 */
router.patch('/alerts/:id/resolve', async (req, res) => {
  try {
    const ref = db.collection('districtAlerts').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) return err(res, 'Alert not found', 404);

    await ref.update({
      resolved:    true,
      resolvedAt:  admin.firestore.FieldValue.serverTimestamp(),
      resolvedBy:  req.body.resolvedBy  || 'officer',
      resolution:  req.body.resolution  || 'Manually resolved',
    });
    const updated = await ref.get();
    ok(res, serializeDoc(updated));
  } catch (e) {
    err(res, e.message, 500);
  }
});

/**
 * GET /alerts/:id
 */
router.get('/alerts/:id', async (req, res) => {
  try {
    const doc = await db.collection('districtAlerts').doc(req.params.id).get();
    if (!doc.exists) return err(res, 'Alert not found', 404);
    ok(res, serializeDoc(doc));
  } catch (e) {
    err(res, e.message, 500);
  }
});

// ─── Health check ─────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'swasthya-setu-api' }));

// ─── 404 fallthrough ──────────────────────────────────────────────────────────
router.use((_req, res) => err(res, 'Endpoint not found', 404));

module.exports = router;
