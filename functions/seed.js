/**
 * Swasthya Setu — Seed Script
 *
 * Generates 30 days of realistic mock data for 8 PHCs/CHCs in Baghpat District, UP.
 *
 * Facilities:
 *   phc-rampur    → Normal operations
 *   phc-hasanpur  → ⚠️  Trending stock-out (Paracetamol, ORS)
 *   phc-nagla     → Normal operations
 *   chc-baghpat   → CHC, normal (larger capacity)
 *   phc-baraut    → ⚠️  Understaffed (doctor attendance 40-55%)
 *   phc-pilana    → Normal operations
 *   chc-khekra    → ⚠️  CRITICAL — stock-out AND understaffed
 *   phc-titawi    → Normal operations
 *
 * Usage:
 *   # Against emulator (default):
 *   FIRESTORE_EMULATOR_HOST=localhost:8080 node functions/seed.js
 *
 *   # Against live Firebase (requires service account):
 *   GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json node functions/seed.js
 *
 *   # Force live project (no emulator):
 *   USE_LIVE=true GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json node functions/seed.js
 */

'use strict';

const admin = require('firebase-admin');

// ─── Firebase init ─────────────────────────────────────────────────────────────
const useEmulator = !process.env.USE_LIVE;
if (useEmulator && !process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
}

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'swasthya-setu-1969d',
  });
}
const db = admin.firestore();

// ─── District & Facility Definitions ─────────────────────────────────────────

const DISTRICT = 'baghpat';
const DISTRICT_NAME = 'Baghpat';
const STATE = 'Uttar Pradesh';

const FACILITIES = [
  {
    id: 'phc-rampur',
    name: 'Rampur PHC',
    block: 'Rampur',
    type: 'PHC',
    lat: 28.9421, lng: 77.2195,
    staffCount: 8,
    bedCapacity: 10,
    scenario: 'normal',
  },
  {
    id: 'phc-hasanpur',
    name: 'Hasanpur PHC',
    block: 'Hasanpur',
    type: 'PHC',
    lat: 28.9850, lng: 77.2780,
    staffCount: 6,
    bedCapacity: 8,
    scenario: 'stockout', // Paracetamol + ORS trending to stockout
  },
  {
    id: 'phc-nagla',
    name: 'Nagla PHC',
    block: 'Nagla',
    type: 'PHC',
    lat: 28.9123, lng: 77.3010,
    staffCount: 7,
    bedCapacity: 10,
    scenario: 'normal',
  },
  {
    id: 'chc-baghpat',
    name: 'Baghpat CHC',
    block: 'Baghpat',
    type: 'CHC',
    lat: 28.9445, lng: 77.2167,
    staffCount: 24,
    bedCapacity: 50,
    scenario: 'normal',
  },
  {
    id: 'phc-baraut',
    name: 'Baraut PHC',
    block: 'Baraut',
    type: 'PHC',
    lat: 29.1029, lng: 77.2629,
    staffCount: 8,
    bedCapacity: 10,
    scenario: 'understaffed', // chronic low doctor attendance
  },
  {
    id: 'phc-pilana',
    name: 'Pilana PHC',
    block: 'Pilana',
    type: 'PHC',
    lat: 28.9700, lng: 77.1900,
    staffCount: 7,
    bedCapacity: 8,
    scenario: 'normal',
  },
  {
    id: 'chc-khekra',
    name: 'Khekra CHC',
    block: 'Khekra',
    type: 'CHC',
    lat: 28.8673, lng: 77.2750,
    staffCount: 18,
    bedCapacity: 30,
    scenario: 'critical', // stockout + understaffed
  },
  {
    id: 'phc-titawi',
    name: 'Titawi PHC',
    block: 'Titawi',
    type: 'PHC',
    lat: 29.0320, lng: 77.3100,
    staffCount: 7,
    bedCapacity: 10,
    scenario: 'normal',
  },
];

// ─── Medicine Catalogue ────────────────────────────────────────────────────────

const MEDICINES = [
  { id: 'paracetamol-500',  name: 'Paracetamol 500mg',      unit: 'tablets',  baseDailyUse: 40, reorderThreshold: 200,  initialStock: 800 },
  { id: 'ors-sachets',      name: 'ORS Sachets',             unit: 'sachets',  baseDailyUse: 15, reorderThreshold: 100,  initialStock: 500 },
  { id: 'amoxicillin-500',  name: 'Amoxicillin 500mg',       unit: 'capsules', baseDailyUse: 20, reorderThreshold: 150,  initialStock: 600 },
  { id: 'metformin-500',    name: 'Metformin 500mg',          unit: 'tablets',  baseDailyUse: 12, reorderThreshold: 100,  initialStock: 450 },
  { id: 'amlodipine-5',     name: 'Amlodipine 5mg',           unit: 'tablets',  baseDailyUse: 8,  reorderThreshold: 80,   initialStock: 350 },
  { id: 'iron-folic',       name: 'Iron & Folic Acid',        unit: 'tablets',  baseDailyUse: 25, reorderThreshold: 150,  initialStock: 700 },
  { id: 'cotrimoxazole',    name: 'Cotrimoxazole 480mg',      unit: 'tablets',  baseDailyUse: 18, reorderThreshold: 120,  initialStock: 550 },
  { id: 'chloroquine',      name: 'Chloroquine 250mg',        unit: 'tablets',  baseDailyUse: 6,  reorderThreshold: 60,   initialStock: 300 },
  { id: 'doxycycline-100',  name: 'Doxycycline 100mg',        unit: 'capsules', baseDailyUse: 10, reorderThreshold: 80,   initialStock: 350 },
  { id: 'metronidazole-400',name: 'Metronidazole 400mg',      unit: 'tablets',  baseDailyUse: 14, reorderThreshold: 100,  initialStock: 420 },
  { id: 'omeprazole-20',    name: 'Omeprazole 20mg',          unit: 'capsules', baseDailyUse: 16, reorderThreshold: 100,  initialStock: 480 },
  { id: 'cetirizine-10',    name: 'Cetirizine 10mg',          unit: 'tablets',  baseDailyUse: 12, reorderThreshold: 80,   initialStock: 380 },
  { id: 'ibuprofen-400',    name: 'Ibuprofen 400mg',          unit: 'tablets',  baseDailyUse: 18, reorderThreshold: 120,  initialStock: 520 },
  { id: 'vitamin-c-500',    name: 'Vitamin C 500mg',          unit: 'tablets',  baseDailyUse: 10, reorderThreshold: 80,   initialStock: 400 },
  { id: 'salbutamol-inh',   name: 'Salbutamol Inhaler',       unit: 'inhalers', baseDailyUse: 2,  reorderThreshold: 15,   initialStock: 60  },
];

// ─── Tests Catalogue ──────────────────────────────────────────────────────────

const TESTS = [
  { id: 'malaria-rdt',      name: 'Malaria RDT',             category: 'diagnostic' },
  { id: 'dengue-ns1',       name: 'Dengue NS1 Antigen',      category: 'diagnostic' },
  { id: 'hb-estimation',    name: 'Haemoglobin Estimation',  category: 'haematology' },
  { id: 'urine-routine',    name: 'Urine Routine',           category: 'pathology' },
  { id: 'blood-sugar-fbs',  name: 'Blood Sugar (Fasting)',   category: 'biochemistry' },
  { id: 'thyroid-tsh',      name: 'TSH (Thyroid)',           category: 'hormones' },
  { id: 'pregnancy-test',   name: 'Pregnancy Test (UPT)',    category: 'obstetrics' },
  { id: 'sputum-afb',       name: 'Sputum for AFB (TB)',     category: 'microbiology' },
  { id: 'widal-test',       name: 'Widal Test (Typhoid)',    category: 'serology' },
  { id: 'hiv-rapid',        name: 'HIV Rapid Test',          category: 'serology' },
];

// ─── Staff Definitions ────────────────────────────────────────────────────────

const STAFF_TEMPLATES = {
  PHC: [
    { role: 'doctor',          name: 'Dr. Arvind Kumar',    department: 'OPD' },
    { role: 'doctor',          name: 'Dr. Priya Sharma',    department: 'Maternity' },
    { role: 'nurse',           name: 'Kamla Devi',          department: 'OPD' },
    { role: 'nurse',           name: 'Sunita Singh',        department: 'Maternity' },
    { role: 'pharmacist',      name: 'Ravi Gupta',          department: 'Pharmacy' },
    { role: 'lab_technician',  name: 'Ajay Verma',          department: 'Lab' },
    { role: 'anm',             name: 'Geeta Rani',          department: 'MCH' },
    { role: 'asha_supervisor', name: 'Meena Kumari',        department: 'Community' },
  ],
  CHC: [
    { role: 'doctor',          name: 'Dr. Suresh Yadav',    department: 'Medicine' },
    { role: 'doctor',          name: 'Dr. Rekha Mishra',    department: 'Gynaecology' },
    { role: 'doctor',          name: 'Dr. Pankaj Jain',     department: 'Paediatrics' },
    { role: 'doctor',          name: 'Dr. Neha Agarwal',    department: 'Surgery' },
    { role: 'nurse',           name: 'Rita Pandey',         department: 'OPD' },
    { role: 'nurse',           name: 'Asha Sharma',         department: 'Emergency' },
    { role: 'nurse',           name: 'Seema Gupta',         department: 'Maternity' },
    { role: 'pharmacist',      name: 'Dinesh Kumar',        department: 'Pharmacy' },
    { role: 'pharmacist',      name: 'Vinod Tiwari',        department: 'Pharmacy' },
    { role: 'lab_technician',  name: 'Sanjay Prasad',       department: 'Lab' },
    { role: 'lab_technician',  name: 'Mohan Lal',           department: 'Lab' },
    { role: 'radiographer',    name: 'Deepak Srivastava',   department: 'Radiology' },
    { role: 'anm',             name: 'Mamta Tripathi',      department: 'MCH' },
    { role: 'anm',             name: 'Savita Devi',         department: 'MCH' },
    { role: 'asha_supervisor', name: 'Poonam Joshi',        department: 'Community' },
    { role: 'ward_boy',        name: 'Bhola Prasad',        department: 'Ward' },
    { role: 'receptionist',    name: 'Kavita Singh',        department: 'Reception' },
    { role: 'driver',          name: 'Ramesh Chauhan',      department: 'Ambulance' },
  ],
};

// ─── Utility functions ────────────────────────────────────────────────────────

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function dateStr(date) {
  return date.toISOString().split('T')[0];
}

/**
 * Returns an array of 30 date strings ending yesterday
 */
function getLast30Days() {
  const dates = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    dates.push(dateStr(d));
  }
  return dates;
}

/**
 * Commit a batch of writes, auto-splitting if >499 ops
 */
async function commitBatches(ops) {
  const BATCH_LIMIT = 499;
  let batch = db.batch();
  let count = 0;
  let total = 0;

  for (const { ref, data, merge } of ops) {
    if (merge) {
      batch.set(ref, data, { merge: true });
    } else {
      batch.set(ref, data);
    }
    count++;
    total++;

    if (count >= BATCH_LIMIT) {
      await batch.commit();
      console.log(`  ✓ Committed batch of ${count} ops (${total} total so far)`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`  ✓ Committed final batch of ${count} ops (${total} total)`);
  }

  return total;
}

// ─── Seed Facilities ──────────────────────────────────────────────────────────

async function seedFacilities() {
  console.log('\n📍 Seeding facility profiles...');
  const ops = FACILITIES.map(f => ({
    ref: db.collection('phcs').doc(f.id),
    data: {
      name:         f.name,
      district:     DISTRICT,
      districtName: DISTRICT_NAME,
      state:        STATE,
      block:        f.block,
      type:         f.type,
      lat:          f.lat,
      lng:          f.lng,
      staffCount:   f.staffCount,
      bedCapacity:  f.bedCapacity,
      scenario:     f.scenario, // helps frontend show demo labels
      healthScore:  f.scenario === 'critical' ? 38 :
                    f.scenario === 'understaffed' ? 48 :
                    f.scenario === 'stockout' ? 55 : rand(68, 85),
      lastScored:   admin.firestore.Timestamp.now(),
      createdAt:    admin.firestore.Timestamp.now(),
    },
  }));
  await commitBatches(ops);
  console.log(`  → ${ops.length} facilities written`);
}

// ─── Seed Inventory ───────────────────────────────────────────────────────────

async function seedInventory() {
  console.log('\n💊 Seeding inventory (stock)...');
  const ops = [];

  for (const fac of FACILITIES) {
    for (const med of MEDICINES) {
      // Stockout scenario: Paracetamol + ORS consume 2.5× faster, start lower
      const isStockoutMed = ['paracetamol-500', 'ors-sachets'].includes(med.id);
      const isAmoxStockout = med.id === 'amoxicillin-500';

      let dailyUse  = med.baseDailyUse;
      let startQty  = med.initialStock;

      if (fac.scenario === 'stockout' && isStockoutMed) {
        dailyUse = Math.round(med.baseDailyUse * 2.5); // burn faster
        startQty = Math.round(med.initialStock * 0.25); // started 30d ago already low
      } else if (fac.scenario === 'critical' && isAmoxStockout) {
        dailyUse = Math.round(med.baseDailyUse * 3);
        startQty = Math.round(med.initialStock * 0.15);
      } else if (fac.type === 'CHC') {
        dailyUse = Math.round(med.baseDailyUse * 2); // CHCs serve more patients
        startQty = Math.round(med.initialStock * 2);
      }

      // Simulate 30 days of consumption
      const consumed30d = dailyUse * 30 + rand(-dailyUse * 3, dailyUse * 3);
      const currentQty  = Math.max(0, startQty - consumed30d);
      const daysUntilStockout = dailyUse > 0 ? Math.round(currentQty / dailyUse) : 999;

      const lastRestockedDaysAgo = fac.scenario === 'stockout' || fac.scenario === 'critical'
        ? rand(25, 30) // not restocked recently
        : rand(5, 20);

      const lastRestocked = dateStr(addDays(new Date(), -lastRestockedDaysAgo));

      ops.push({
        ref: db.collection('phcs').doc(fac.id).collection('stock').doc(med.id),
        data: {
          medicineName:       med.name,
          currentQty,
          unit:               med.unit,
          reorderThreshold:   fac.type === 'CHC' ? med.reorderThreshold * 2 : med.reorderThreshold,
          avgDailyConsumption: dailyUse,
          daysUntilStockout,
          lastRestocked,
          updatedAt: admin.firestore.Timestamp.now(),
        },
      });
    }
  }

  await commitBatches(ops);
  console.log(`  → ${ops.length} stock records written`);
}

// ─── Seed Footfall ────────────────────────────────────────────────────────────

async function seedFootfall(dates) {
  console.log('\n👥 Seeding footfall (30 days)...');
  const ops = [];

  for (const fac of FACILITIES) {
    const baseFootfall = fac.type === 'CHC' ? 120 : 45;

    for (const date of dates) {
      // Weekend dip
      const dayOfWeek = new Date(date).getDay();
      const weekendMult = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.65 : 1;

      // Seasonal: rainy season (July) = higher
      const monthMult = new Date(date).getMonth() === 6 ? 1.3 : 1;

      const totalPatients = Math.max(
        5,
        Math.round(baseFootfall * weekendMult * monthMult * randFloat(0.75, 1.25))
      );

      const emergency = Math.round(totalPatients * randFloat(0.05, 0.12));
      const maternity  = fac.type === 'CHC'
        ? Math.round(totalPatients * randFloat(0.08, 0.15))
        : Math.round(totalPatients * randFloat(0.03, 0.08));
      const opd = totalPatients - emergency - maternity;

      ops.push({
        ref: db.collection('phcs').doc(fac.id).collection('footfall').doc(date),
        data: {
          date,
          patientCount: totalPatients,
          departments: { opd: Math.max(0, opd), emergency, maternity },
          source: Math.random() > 0.2 ? 'manual' : 'voice',
          recordedAt: admin.firestore.Timestamp.fromDate(new Date(date + 'T18:00:00')),
        },
      });
    }
  }

  await commitBatches(ops);
  console.log(`  → ${ops.length} footfall records written`);
}

// ─── Seed Bed Status ──────────────────────────────────────────────────────────

async function seedBeds(dates) {
  console.log('\n🛏️  Seeding bed status (30 days)...');
  const ops = [];

  for (const fac of FACILITIES) {
    const total = fac.bedCapacity;

    for (const date of dates) {
      // CHCs run higher utilization; problem facility Khekra = overcrowded
      const baseUtil = fac.scenario === 'critical' ? randFloat(0.88, 0.97) :
                       fac.type === 'CHC'          ? randFloat(0.55, 0.80) :
                                                     randFloat(0.35, 0.72);

      const occupied = Math.min(total, Math.round(total * baseUtil));
      const util     = Math.round((occupied / total) * 100);

      const generalBeds  = Math.round(occupied * 0.6);
      const matBeds      = fac.type === 'CHC' ? Math.round(occupied * 0.25) : Math.round(occupied * 0.20);
      const emergBeds    = occupied - generalBeds - matBeds;

      ops.push({
        ref: db.collection('phcs').doc(fac.id).collection('beds').doc(date),
        data: {
          date,
          totalBeds:    total,
          occupiedBeds: occupied,
          utilization:  util,
          departments: {
            general:   Math.max(0, generalBeds),
            maternity: Math.max(0, matBeds),
            emergency: Math.max(0, emergBeds),
          },
          recordedAt: admin.firestore.Timestamp.fromDate(new Date(date + 'T08:00:00')),
        },
      });
    }
  }

  await commitBatches(ops);
  console.log(`  → ${ops.length} bed records written`);
}

// ─── Seed Staff Attendance ────────────────────────────────────────────────────

async function seedStaffAttendance(dates) {
  console.log('\n👨‍⚕️  Seeding staff attendance (30 days)...');
  const ops = [];

  for (const fac of FACILITIES) {
    const staffTemplate = STAFF_TEMPLATES[fac.type] || STAFF_TEMPLATES.PHC;

    for (const date of dates) {
      const dayOfWeek = new Date(date).getDay();
      const isSunday  = dayOfWeek === 0;

      const staff = staffTemplate.map((s, idx) => {
        // Base attendance probability by scenario
        let presentProb;
        if (fac.scenario === 'understaffed' || fac.scenario === 'critical') {
          presentProb = s.role === 'doctor' ? randFloat(0.35, 0.55) : randFloat(0.50, 0.70);
        } else {
          presentProb = s.role === 'doctor' ? randFloat(0.80, 0.95) : randFloat(0.85, 0.98);
        }

        if (isSunday) presentProb *= 0.3; // Sunday emergency only

        const present     = Math.random() < presentProb;
        const checkInHour = present ? rand(8, 10) : null;
        const checkInMin  = present ? rand(0, 59) : null;
        const checkInTime = present
          ? `${String(checkInHour).padStart(2, '0')}:${String(checkInMin).padStart(2, '0')}`
          : null;

        return {
          doctorId:   `${fac.id}-staff-${idx}`,
          name:       s.name,
          role:       s.role,
          department: s.department,
          present,
          checkInTime,
        };
      });

      const presentCount   = staff.filter(s => s.present).length;
      const attendanceRate = Math.round((presentCount / staff.length) * 100);

      ops.push({
        ref: db.collection('phcs').doc(fac.id).collection('staffAttendance').doc(date),
        data: {
          date,
          staff,
          presentCount,
          totalStaff:    staff.length,
          attendanceRate,
          recordedAt: admin.firestore.Timestamp.fromDate(new Date(date + 'T09:00:00')),
        },
      });
    }
  }

  await commitBatches(ops);
  console.log(`  → ${ops.length} attendance records written`);
}

// ─── Seed Test Availability ───────────────────────────────────────────────────

async function seedTestAvailability() {
  console.log('\n🔬 Seeding test availability...');
  const ops = [];

  for (const fac of FACILITIES) {
    // CHCs have all tests; PHCs have subset; problem facilities have some unavailable
    const availableTests = fac.type === 'CHC' ? TESTS : TESTS.slice(0, 7);

    for (const test of availableTests) {
      // Unavailable tests for problem facilities
      let available = true;
      if (fac.scenario === 'critical' && ['thyroid-tsh', 'dengue-ns1', 'sputum-afb'].includes(test.id)) {
        available = false;
      } else if (fac.scenario === 'understaffed' && ['thyroid-tsh', 'dengue-ns1'].includes(test.id)) {
        available = false;
      } else if (Math.random() < 0.05) {
        available = false; // 5% random unavailability for all facilities
      }

      const lastAuditDaysAgo = rand(1, 14);
      const lastAuditDate    = dateStr(addDays(new Date(), -lastAuditDaysAgo));

      ops.push({
        ref: db.collection('phcs').doc(fac.id).collection('testAvailability').doc(test.id),
        data: {
          testName:     test.name,
          category:     test.category,
          available,
          lastAuditDate,
          updatedAt: admin.firestore.Timestamp.now(),
        },
      });
    }
  }

  await commitBatches(ops);
  console.log(`  → ${ops.length} test records written`);
}

// ─── Seed Alerts ─────────────────────────────────────────────────────────────

async function seedAlerts() {
  console.log('\n🚨 Seeding pre-computed alerts...');
  const ops = [];
  const now = admin.firestore.Timestamp.now();

  // ── Hasanpur: Paracetamol trending to stockout in ~3 days ─────────────────
  {
    const ref = db.collection('districtAlerts').doc('alert-hasanpur-para');
    ops.push({
      ref,
      data: {
        phcId:            'phc-hasanpur',
        phcName:          'Hasanpur PHC',
        medicineId:       'paracetamol-500',
        medicine:         'Paracetamol 500mg',
        type:             'stockout',
        severity:         'warning',
        daysUntilStockout: 3.2,
        currentQty:       128,
        aiRecommendation: 'Paracetamol at Hasanpur PHC will run out in ~3 days at current usage (40 tabs/day). Rampur PHC has 620 units surplus — redistribute 200 units immediately.',
        resolved:         false,
        createdAt:        now,
      },
    });
  }

  // ── Hasanpur: ORS trending to stockout in ~4 days ─────────────────────────
  {
    const ref = db.collection('districtAlerts').doc('alert-hasanpur-ors');
    ops.push({
      ref,
      data: {
        phcId:            'phc-hasanpur',
        phcName:          'Hasanpur PHC',
        medicineId:       'ors-sachets',
        medicine:         'ORS Sachets',
        type:             'stockout',
        severity:         'warning',
        daysUntilStockout: 4.1,
        currentQty:       62,
        aiRecommendation: 'ORS sachets at Hasanpur PHC critically low (4 days remaining). Baghpat CHC holds 380+ sachets — request 150 units for diarrheal disease season.',
        resolved:         false,
        createdAt:        now,
      },
    });
  }

  // ── Khekra CHC: Amoxicillin CRITICAL (<1 day) ──────────────────────────────
  {
    const ref = db.collection('districtAlerts').doc('alert-khekra-amox');
    ops.push({
      ref,
      data: {
        phcId:            'chc-khekra',
        phcName:          'Khekra CHC',
        medicineId:       'amoxicillin-500',
        medicine:         'Amoxicillin 500mg',
        type:             'stockout',
        severity:         'critical',
        daysUntilStockout: 0.8,
        currentQty:       48,
        aiRecommendation: 'URGENT: Amoxicillin at Khekra CHC exhausted in <1 day. Baghpat CHC has 950 units — emergency transfer of 300 units needed today. Contact Block MO immediately.',
        resolved:         false,
        createdAt:        now,
      },
    });
  }

  // ── Baraut PHC: Understaffing alert ───────────────────────────────────────
  {
    const ref = db.collection('districtAlerts').doc('alert-baraut-staff');
    ops.push({
      ref,
      data: {
        phcId:            'phc-baraut',
        phcName:          'Baraut PHC',
        type:             'understaffed',
        severity:         'warning',
        attendanceRate:   47,
        aiRecommendation: 'Baraut PHC averaging 47% doctor attendance over the past 7 days. OPD service disrupted. Recommend redeployment of 1 doctor from Nagla PHC (currently 91% attended) on temporary basis.',
        resolved:         false,
        createdAt:        now,
      },
    });
  }

  // ── Khekra CHC: Low health score (combined problems) ──────────────────────
  {
    const ref = db.collection('districtAlerts').doc('alert-khekra-score');
    ops.push({
      ref,
      data: {
        phcId:            'chc-khekra',
        phcName:          'Khekra CHC',
        type:             'low_health_score',
        severity:         'critical',
        healthScore:      38,
        stockoutFreq:     3,
        attendanceRate:   42,
        bedUtilization:   91,
        aiRecommendation: 'Khekra CHC scored 38/100 due to 3 stockout incidents, 42% doctor attendance, and 91% bed overcrowding. Immediate actions: (1) Emergency medicine transfer from Baghpat CHC; (2) District CMO to audit staffing roster this week.',
        resolved:         false,
        createdAt:        now,
      },
    });
  }

  await commitBatches(ops);
  console.log(`  → ${ops.length} alerts written`);
}

// ─── Seed Redistribution Suggestions ─────────────────────────────────────────

async function seedRedistributionSuggestions() {
  console.log('\n🔄 Seeding redistribution suggestions...');
  const ops = [];
  const now = admin.firestore.Timestamp.now();

  ops.push({
    ref: db.collection('redistributionSuggestions').doc('redist-001'),
    data: {
      alertId:      'alert-hasanpur-para',
      fromPhcId:    'phc-rampur',
      fromPhcName:  'Rampur PHC',
      toPhcId:      'phc-hasanpur',
      toPhcName:    'Hasanpur PHC',
      medicine:     'Paracetamol 500mg',
      quantity:     200,
      distanceKm:   12,
      travelTimeMin: 22,
      fromSurplus:  620,
      justification: 'Transferring 200 tablets from Rampur PHC (620 surplus, 85% above reorder threshold) to Hasanpur PHC resolves the 3-day stockout risk and provides 5 days of coverage, leaving Rampur with a safe 420-unit buffer.',
      approved:     false,
      createdAt:    now,
    },
  });

  ops.push({
    ref: db.collection('redistributionSuggestions').doc('redist-002'),
    data: {
      alertId:      'alert-khekra-amox',
      fromPhcId:    'chc-baghpat',
      fromPhcName:  'Baghpat CHC',
      toPhcId:      'chc-khekra',
      toPhcName:    'Khekra CHC',
      medicine:     'Amoxicillin 500mg',
      quantity:     300,
      distanceKm:   18,
      travelTimeMin: 32,
      fromSurplus:  950,
      justification: 'URGENT transfer of 300 capsules from Baghpat CHC (950 units, 58% surplus above reorder) to Khekra CHC. Covers 5 days of demand at Khekra while keeping Baghpat well above its reorder threshold of 300.',
      approved:     false,
      createdAt:    now,
    },
  });

  await commitBatches(ops);
  console.log(`  → ${ops.length} redistribution suggestions written`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   Swasthya Setu — Seed Script (Baghpat District, UP)     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Project:  ${process.env.FIREBASE_PROJECT_ID || 'swasthya-setu-1969d'}`);
  console.log(`Mode:     ${process.env.FIRESTORE_EMULATOR_HOST ? 'Emulator @ ' + process.env.FIRESTORE_EMULATOR_HOST : 'Live Firebase'}`);
  console.log(`Facilities: ${FACILITIES.length} | Medicines: ${MEDICINES.length} | Tests: ${TESTS.length}`);
  console.log('');

  const dates = getLast30Days();
  console.log(`Date range: ${dates[0]} → ${dates[dates.length - 1]} (${dates.length} days)`);

  const start = Date.now();
  await seedFacilities();
  await seedInventory();
  await seedFootfall(dates);
  await seedBeds(dates);
  await seedStaffAttendance(dates);
  await seedTestAvailability();
  await seedAlerts();
  await seedRedistributionSuggestions();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log(`║  ✅  Seeding complete in ${elapsed}s`);
  console.log('║');
  console.log('║  Problem Facilities Seeded:');
  console.log('║   🟡 Hasanpur PHC     — Paracetamol & ORS < 5 days');
  console.log('║   🟡 Baraut PHC       — Doctor attendance ~47%');
  console.log('║   🔴 Khekra CHC       — Amoxicillin < 1 day + attendance 42%');
  console.log('║');
  console.log('║  Normal Facilities Seeded:');
  console.log('║   🟢 Rampur, Nagla, Pilana, Titawi PHCs');
  console.log('║   🟢 Baghpat CHC');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  process.exit(0);
}

main().catch(e => {
  console.error('\n❌ Seed failed:', e.message);
  console.error(e.stack);
  process.exit(1);
});
