// ============================================================
// Mock seed data — 5 PHCs in Pune District, Maharashtra
// Mimics Firestore collections structure from prompt §2
// ============================================================

export const DISTRICT = {
  id: 'pune',
  name: 'Pune District',
  state: 'Maharashtra',
  totalPHCs: 5,
  population: 94000,
};

export const PHCS = [
  {
    id: 'phc-001',
    name: 'Shirur PHC',
    block: 'Shirur',
    district: 'pune',
    lat: 18.826,
    lng: 74.372,
    staffCount: 14,
    bedCapacity: 30,
    healthScore: 82,
    status: 'good',
  },
  {
    id: 'phc-002',
    name: 'Baramati PHC',
    block: 'Baramati',
    district: 'pune',
    lat: 18.152,
    lng: 74.583,
    staffCount: 18,
    bedCapacity: 50,
    healthScore: 61,
    status: 'warning',
  },
  {
    id: 'phc-003',
    name: 'Junnar PHC',
    block: 'Junnar',
    district: 'pune',
    lat: 19.207,
    lng: 73.877,
    staffCount: 10,
    bedCapacity: 25,
    healthScore: 38,
    status: 'critical',
  },
  {
    id: 'phc-004',
    name: 'Bhor PHC',
    block: 'Bhor',
    district: 'pune',
    lat: 18.152,
    lng: 73.845,
    staffCount: 12,
    bedCapacity: 20,
    healthScore: 74,
    status: 'good',
  },
  {
    id: 'phc-005',
    name: 'Ambegaon PHC',
    block: 'Ambegaon',
    district: 'pune',
    lat: 19.059,
    lng: 73.703,
    staffCount: 9,
    bedCapacity: 20,
    healthScore: 55,
    status: 'warning',
  },
];

export const MEDICINES = [
  { id: 'med-001', name: 'Paracetamol 500mg', unit: 'tablets' },
  { id: 'med-002', name: 'Amoxicillin 250mg', unit: 'capsules' },
  { id: 'med-003', name: 'ORS Sachets', unit: 'packets' },
  { id: 'med-004', name: 'Metformin 500mg', unit: 'tablets' },
  { id: 'med-005', name: 'Atenolol 50mg', unit: 'tablets' },
  { id: 'med-006', name: 'Iron Folic Acid', unit: 'tablets' },
  { id: 'med-007', name: 'Albendazole 400mg', unit: 'tablets' },
  { id: 'med-008', name: 'Zinc 20mg', unit: 'tablets' },
];

export const STOCK_DATA = {
  'phc-001': [
    { medicineId: 'med-001', medicineName: 'Paracetamol 500mg', currentQty: 850, reorderThreshold: 200, avgDailyConsumption: 45, lastRestocked: '2026-06-20', daysUntilStockout: 18.9 },
    { medicineId: 'med-002', medicineName: 'Amoxicillin 250mg', currentQty: 320, reorderThreshold: 100, avgDailyConsumption: 20, lastRestocked: '2026-06-25', daysUntilStockout: 16 },
    { medicineId: 'med-003', medicineName: 'ORS Sachets', currentQty: 180, reorderThreshold: 150, avgDailyConsumption: 18, lastRestocked: '2026-06-15', daysUntilStockout: 10 },
    { medicineId: 'med-004', medicineName: 'Metformin 500mg', currentQty: 600, reorderThreshold: 100, avgDailyConsumption: 30, lastRestocked: '2026-06-22', daysUntilStockout: 20 },
    { medicineId: 'med-006', medicineName: 'Iron Folic Acid', currentQty: 750, reorderThreshold: 200, avgDailyConsumption: 40, lastRestocked: '2026-06-18', daysUntilStockout: 18.75 },
  ],
  'phc-002': [
    { medicineId: 'med-001', medicineName: 'Paracetamol 500mg', currentQty: 120, reorderThreshold: 200, avgDailyConsumption: 55, lastRestocked: '2026-06-01', daysUntilStockout: 2.18 },
    { medicineId: 'med-002', medicineName: 'Amoxicillin 250mg', currentQty: 200, reorderThreshold: 100, avgDailyConsumption: 25, lastRestocked: '2026-06-10', daysUntilStockout: 8 },
    { medicineId: 'med-003', medicineName: 'ORS Sachets', currentQty: 90, reorderThreshold: 150, avgDailyConsumption: 22, lastRestocked: '2026-05-28', daysUntilStockout: 4.09 },
    { medicineId: 'med-005', medicineName: 'Atenolol 50mg', currentQty: 400, reorderThreshold: 80, avgDailyConsumption: 15, lastRestocked: '2026-06-20', daysUntilStockout: 26.7 },
    { medicineId: 'med-006', medicineName: 'Iron Folic Acid', currentQty: 50, reorderThreshold: 200, avgDailyConsumption: 35, lastRestocked: '2026-05-15', daysUntilStockout: 1.43 },
  ],
  'phc-003': [
    { medicineId: 'med-001', medicineName: 'Paracetamol 500mg', currentQty: 60, reorderThreshold: 200, avgDailyConsumption: 30, lastRestocked: '2026-05-20', daysUntilStockout: 2 },
    { medicineId: 'med-002', medicineName: 'Amoxicillin 250mg', currentQty: 30, reorderThreshold: 100, avgDailyConsumption: 12, lastRestocked: '2026-05-10', daysUntilStockout: 2.5 },
    { medicineId: 'med-007', medicineName: 'Albendazole 400mg', currentQty: 500, reorderThreshold: 50, avgDailyConsumption: 8, lastRestocked: '2026-06-20', daysUntilStockout: 62.5 },
    { medicineId: 'med-008', medicineName: 'Zinc 20mg', currentQty: 10, reorderThreshold: 100, avgDailyConsumption: 15, lastRestocked: '2026-05-01', daysUntilStockout: 0.67 },
  ],
  'phc-004': [
    { medicineId: 'med-001', medicineName: 'Paracetamol 500mg', currentQty: 1200, reorderThreshold: 200, avgDailyConsumption: 38, lastRestocked: '2026-06-25', daysUntilStockout: 31.6 },
    { medicineId: 'med-002', medicineName: 'Amoxicillin 250mg', currentQty: 450, reorderThreshold: 100, avgDailyConsumption: 18, lastRestocked: '2026-06-22', daysUntilStockout: 25 },
    { medicineId: 'med-004', medicineName: 'Metformin 500mg', currentQty: 800, reorderThreshold: 100, avgDailyConsumption: 22, lastRestocked: '2026-06-20', daysUntilStockout: 36.4 },
    { medicineId: 'med-006', medicineName: 'Iron Folic Acid', currentQty: 900, reorderThreshold: 200, avgDailyConsumption: 28, lastRestocked: '2026-06-15', daysUntilStockout: 32.1 },
  ],
  'phc-005': [
    { medicineId: 'med-001', medicineName: 'Paracetamol 500mg', currentQty: 300, reorderThreshold: 200, avgDailyConsumption: 42, lastRestocked: '2026-06-10', daysUntilStockout: 7.14 },
    { medicineId: 'med-003', medicineName: 'ORS Sachets', currentQty: 450, reorderThreshold: 150, avgDailyConsumption: 20, lastRestocked: '2026-06-20', daysUntilStockout: 22.5 },
    { medicineId: 'med-005', medicineName: 'Atenolol 50mg', currentQty: 220, reorderThreshold: 80, avgDailyConsumption: 14, lastRestocked: '2026-06-18', daysUntilStockout: 15.7 },
    { medicineId: 'med-008', medicineName: 'Zinc 20mg', currentQty: 180, reorderThreshold: 100, avgDailyConsumption: 25, lastRestocked: '2026-06-12', daysUntilStockout: 7.2 },
  ],
};

export const BEDS_DATA = {
  'phc-001': { totalBeds: 30, occupiedBeds: 18, opd: 8, maternity: 6, emergency: 4, utilization: 60 },
  'phc-002': { totalBeds: 50, occupiedBeds: 48, opd: 20, maternity: 18, emergency: 10, utilization: 96 },
  'phc-003': { totalBeds: 25, occupiedBeds: 22, opd: 10, maternity: 8, emergency: 4, utilization: 88 },
  'phc-004': { totalBeds: 20, occupiedBeds: 10, opd: 4, maternity: 4, emergency: 2, utilization: 50 },
  'phc-005': { totalBeds: 20, occupiedBeds: 14, opd: 6, maternity: 6, emergency: 2, utilization: 70 },
};

export const STAFF_DATA = {
  'phc-001': { totalStaff: 14, presentToday: 13, doctors: 3, nurses: 6, pharmacists: 2, support: 3, attendanceRate: 92.9 },
  'phc-002': { totalStaff: 18, presentToday: 11, doctors: 4, nurses: 8, pharmacists: 2, support: 4, attendanceRate: 61.1 },
  'phc-003': { totalStaff: 10, presentToday: 6, doctors: 2, nurses: 4, pharmacists: 1, support: 3, attendanceRate: 60 },
  'phc-004': { totalStaff: 12, presentToday: 12, doctors: 3, nurses: 5, pharmacists: 2, support: 2, attendanceRate: 100 },
  'phc-005': { totalStaff: 9, presentToday: 7, doctors: 2, nurses: 3, pharmacists: 1, support: 3, attendanceRate: 77.8 },
};

export const FOOTFALL_DATA = {
  'phc-001': { today: 87, yesterday: 92, opd: 55, emergency: 12, maternity: 20 },
  'phc-002': { today: 165, yesterday: 158, opd: 110, emergency: 28, maternity: 27 },
  'phc-003': { today: 48, yesterday: 51, opd: 32, emergency: 10, maternity: 6 },
  'phc-004': { today: 72, yesterday: 68, opd: 48, emergency: 12, maternity: 12 },
  'phc-005': { today: 58, yesterday: 55, opd: 40, emergency: 8, maternity: 10 },
};

export const DISTRICT_ALERTS = [
  {
    id: 'alert-001',
    phcId: 'phc-003',
    phcName: 'Junnar PHC',
    type: 'stockout',
    medicine: 'Zinc 20mg',
    severity: 'critical',
    daysUntilStockout: 0.67,
    currentQty: 10,
    unit: 'tablets',
    aiRecommendation: 'Zinc 20mg at Junnar PHC will run out in less than 1 day at current usage — immediate redistribution of 200 units from Bhor PHC (currently at 400% surplus, 52 km away, ~65 min drive) is advised.',
    createdAt: '2026-07-06T08:30:00Z',
    resolved: false,
  },
  {
    id: 'alert-002',
    phcId: 'phc-002',
    phcName: 'Baramati PHC',
    type: 'stockout',
    medicine: 'Iron Folic Acid',
    severity: 'critical',
    daysUntilStockout: 1.43,
    currentQty: 50,
    unit: 'tablets',
    aiRecommendation: 'Iron Folic Acid at Baramati PHC will deplete in ~1.4 days. Shirur PHC has 750 units (275% above threshold). Recommend transferring 400 units — this covers Baramati for 11 days and leaves Shirur with adequate buffer.',
    createdAt: '2026-07-06T07:15:00Z',
    resolved: false,
  },
  {
    id: 'alert-003',
    phcId: 'phc-002',
    phcName: 'Baramati PHC',
    type: 'stockout',
    medicine: 'Paracetamol 500mg',
    severity: 'critical',
    daysUntilStockout: 2.18,
    currentQty: 120,
    unit: 'tablets',
    aiRecommendation: 'Paracetamol 500mg at Baramati PHC critically low. Bhor PHC has a 500% surplus (1200 units). Recommend redistribution of 600 units to sustain Baramati for ~11 days.',
    createdAt: '2026-07-06T06:00:00Z',
    resolved: false,
  },
  {
    id: 'alert-004',
    phcId: 'phc-003',
    phcName: 'Junnar PHC',
    type: 'understaffed',
    severity: 'warning',
    aiRecommendation: 'Junnar PHC staff attendance is at 60% — below district average of 86%. Only 1 doctor present today. Consider emergency staff redeployment from Shirur PHC (13/14 staff present).',
    createdAt: '2026-07-06T09:00:00Z',
    resolved: false,
  },
  {
    id: 'alert-005',
    phcId: 'phc-002',
    phcName: 'Baramati PHC',
    type: 'overcrowded',
    severity: 'warning',
    aiRecommendation: 'Baramati PHC bed occupancy at 96% (48/50 beds). OPD load 165 patients today vs capacity of ~120. Recommend activating overflow protocol and diverting non-emergency cases to Bhor PHC.',
    createdAt: '2026-07-06T10:00:00Z',
    resolved: false,
  },
  {
    id: 'alert-006',
    phcId: 'phc-005',
    phcName: 'Ambegaon PHC',
    type: 'stockout',
    medicine: 'Paracetamol 500mg',
    severity: 'warning',
    daysUntilStockout: 7.14,
    currentQty: 300,
    unit: 'tablets',
    aiRecommendation: 'Paracetamol 500mg at Ambegaon PHC will run out in ~7 days. Early action recommended — Bhor PHC surplus available for redistribution.',
    createdAt: '2026-07-06T05:00:00Z',
    resolved: false,
  },
];

export const REDISTRIBUTION_SUGGESTIONS = [
  {
    id: 'redist-001',
    alertId: 'alert-001',
    fromPhcId: 'phc-004',
    fromPhcName: 'Bhor PHC',
    toPhcId: 'phc-003',
    toPhcName: 'Junnar PHC',
    medicine: 'Zinc 20mg',
    quantity: 200,
    unit: 'tablets',
    distanceKm: 52,
    travelTimeMin: 65,
    fromSurplus: 180,
    justification: 'Bhor PHC has 180 units vs reorder threshold of 100 — transferring 200 units will still leave Bhor with a safe buffer of 80 units while fully resolving the critical shortage at Junnar for 13+ days.',
    approved: false,
  },
  {
    id: 'redist-002',
    alertId: 'alert-002',
    fromPhcId: 'phc-001',
    fromPhcName: 'Shirur PHC',
    toPhcId: 'phc-002',
    toPhcName: 'Baramati PHC',
    medicine: 'Iron Folic Acid',
    quantity: 400,
    unit: 'tablets',
    distanceKm: 78,
    travelTimeMin: 95,
    fromSurplus: 550,
    justification: 'Shirur PHC has 750 units vs threshold of 200 — 550 unit surplus. Transfer of 400 leaves Shirur at 350 units (safe) and gives Baramati 11+ days of supply at current consumption rate.',
    approved: false,
  },
];

// Weekly footfall trend (last 7 days, all PHCs combined)
export const FOOTFALL_TREND = [
  { day: 'Mon', patients: 398 },
  { day: 'Tue', patients: 415 },
  { day: 'Wed', patients: 442 },
  { day: 'Thu', patients: 380 },
  { day: 'Fri', patients: 428 },
  { day: 'Sat', patients: 460 },
  { day: 'Sun', patients: 312 },
];

export const PHC_HEALTH_SCORES_TREND = [
  { week: 'W1', shirur: 88, baramati: 72, junnar: 50, bhor: 78, ambegaon: 62 },
  { week: 'W2', shirur: 85, baramati: 68, junnar: 45, bhor: 76, ambegaon: 60 },
  { week: 'W3', shirur: 83, baramati: 64, junnar: 40, bhor: 75, ambegaon: 57 },
  { week: 'W4', shirur: 82, baramati: 61, junnar: 38, bhor: 74, ambegaon: 55 },
];
