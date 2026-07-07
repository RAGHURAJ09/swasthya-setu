/**
 * API Service — calls Cloud Functions REST endpoints
 * Falls back to mock data when VITE_API_URL is not set (local dev without emulator)
 */

const BASE = import.meta.env.VITE_API_URL || '';

async function apiFetch(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Forecast (Module B) ───────────────────────────────────────────────────────
export async function getFacilityForecast(facilityId) {
  return apiFetch(`/forecast/${facilityId}`);
}

// ── Redistribution (Module C) ─────────────────────────────────────────────────
export async function getRedistributionSuggestions(params = {}) {
  const q = new URLSearchParams(params).toString();
  return apiFetch(`/redistribution${q ? '?' + q : ''}`);
}
export async function generateRedistribution(district = 'baghpat') {
  return apiFetch('/redistribution/generate', { method: 'POST', body: JSON.stringify({ district }) });
}
export async function approveRedistribution(id, approvedBy = 'officer') {
  return apiFetch(`/redistribution/${id}/approve`, { method: 'PATCH', body: JSON.stringify({ approvedBy }) });
}

// ── Alerts (Module D) ─────────────────────────────────────────────────────────
export async function runAlertRules() {
  return apiFetch('/alerts/run-rules', { method: 'POST' });
}
export async function getFacilityAlertSummary(facilityId) {
  return apiFetch(`/alerts/summary/${facilityId}`);
}
export async function getDistrictAlertSummary(district = 'baghpat') {
  return apiFetch(`/alerts/district-summary?district=${district}`);
}
export async function resolveAlert(id, resolution) {
  return apiFetch(`/api/alerts/${id}/resolve`, { method: 'PATCH', body: JSON.stringify({ resolution }) });
}

// ── Voice/Text Intake (Module E) ──────────────────────────────────────────────
export async function submitVoiceIntake({ audioBase64, language, facilityId, recordType }) {
  return apiFetch('/intake/voice', {
    method: 'POST',
    body: JSON.stringify({ audioBase64, language, facilityId, recordType }),
  });
}
export async function submitTextIntake({ text, language, facilityId, recordType }) {
  return apiFetch('/intake/text', {
    method: 'POST',
    body: JSON.stringify({ text, language, facilityId, recordType }),
  });
}
export async function tts({ text, language }) {
  return apiFetch('/intake/tts', { method: 'POST', body: JSON.stringify({ text, language }) });
}

// ── SMS test (Module G) ───────────────────────────────────────────────────────
export async function testSmsUpdate({ phcId, message }) {
  return apiFetch('/sms/test', { method: 'POST', body: JSON.stringify({ phcId, message }) });
}

// ── Facilities (Module A) ─────────────────────────────────────────────────────
export async function getFacilities(district) {
  const q = district ? `?district=${district}` : '';
  return apiFetch(`/api/facilities${q}`);
}
export async function getFacilityInventory(facilityId, lowStock = false) {
  return apiFetch(`/api/facilities/${facilityId}/inventory${lowStock ? '?lowStock=true' : ''}`);
}
