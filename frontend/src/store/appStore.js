import { create } from 'zustand';
import {
  DISTRICT, PHCS, STOCK_DATA, BEDS_DATA, STAFF_DATA,
  FOOTFALL_DATA, DISTRICT_ALERTS, REDISTRIBUTION_SUGGESTIONS,
} from '../data/seedData';

export const useAppStore = create((set, get) => ({
  // Auth
  currentUser: null,
  currentRole: null, // 'officer' | 'staff' | 'citizen'

  // Language
  language: 'en', // 'en' | 'hi' | 'mr'

  // Data
  district: DISTRICT,
  phcs: PHCS,
  stockData: STOCK_DATA,
  bedsData: BEDS_DATA,
  staffData: STAFF_DATA,
  footfallData: FOOTFALL_DATA,
  alerts: DISTRICT_ALERTS,
  redistributionSuggestions: REDISTRIBUTION_SUGGESTIONS,

  // Selected PHC (for detail view)
  selectedPhcId: null,

  // Sidebar
  sidebarCollapsed: false,

  // Actions
  login: (role) => {
    const users = {
      officer: { name: 'Dr. Priya Sharma', email: 'priya.sharma@pune.gov.in', role: 'officer' },
      staff:   { name: 'ANM Kavita Devi', email: 'kavita@shirur.phc.in', role: 'staff', phcId: 'phc-001' },
      citizen: { name: 'Ramesh Patil', email: 'ramesh@gmail.com', role: 'citizen' },
    };
    set({ currentUser: users[role], currentRole: role });
  },

  logout: () => set({ currentUser: null, currentRole: null }),

  setLanguage: (lang) => set({ language: lang }),

  setSelectedPhc: (phcId) => set({ selectedPhcId: phcId }),

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  resolveAlert: (alertId) =>
    set((s) => ({
      alerts: s.alerts.map((a) => a.id === alertId ? { ...a, resolved: true } : a),
    })),

  approveRedistribution: (redistId) =>
    set((s) => ({
      redistributionSuggestions: s.redistributionSuggestions.map((r) =>
        r.id === redistId ? { ...r, approved: true } : r
      ),
      alerts: s.alerts.map((a) => {
        const redist = s.redistributionSuggestions.find((r) => r.id === redistId);
        return redist && a.id === redist.alertId ? { ...a, resolved: true } : a;
      }),
    })),

  updateStock: (phcId, medicineId, newQty) =>
    set((s) => ({
      stockData: {
        ...s.stockData,
        [phcId]: s.stockData[phcId].map((item) =>
          item.medicineId === medicineId ? { ...item, currentQty: newQty } : item
        ),
      },
    })),

  // Computed helpers
  getActiveCriticalAlerts: () => get().alerts.filter((a) => !a.resolved && a.severity === 'critical'),
  getActiveWarningAlerts: () => get().alerts.filter((a) => !a.resolved && a.severity === 'warning'),
  getPHCById: (id) => get().phcs.find((p) => p.id === id),
}));
