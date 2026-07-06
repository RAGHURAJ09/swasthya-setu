// ============================================================
// Gemini AI service — simulates Vertex AI / Gemini API calls
// In production: replace with actual @google/generative-ai SDK
// ============================================================

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Simulates stock-out prediction recommendation (Prompt §3a)
export async function getStockoutRecommendation(alert) {
  await delay(900);
  if (alert.type === 'stockout') {
    return alert.aiRecommendation;
  }
  return null;
}

// Simulates redistribution suggestion (Prompt §3b)
export async function getRedistributionSuggestion(fromPhc, toPhc, medicine, qty, distance, travelTime) {
  await delay(1200);
  return `Transfer ${qty} units of ${medicine} from ${fromPhc} → ${toPhc}. ` +
    `Distance: ${distance} km (~${travelTime} min). ` +
    `This resolves the shortage and leaves the donor PHC with a safe buffer above reorder threshold.`;
}

// Simulates PHC Health Score explanation (Prompt §3c)
export async function getPHCHealthScoreExplanation(phc, score, stockoutFreq, attendanceRate, bedUtil) {
  await delay(800);
  const issues = [];
  if (stockoutFreq > 2) issues.push(`frequent stockouts (${stockoutFreq} incidents this month)`);
  if (attendanceRate < 70) issues.push(`low staff attendance (${attendanceRate.toFixed(0)}%)`);
  if (bedUtil > 90) issues.push(`overcrowded beds (${bedUtil}% occupancy)`);
  if (issues.length === 0) issues.push('minor supply irregularities');

  return `${phc} scored ${score}/100 due to ${issues.join(', ')}. ` +
    `Recommended interventions: (1) Emergency medicine resupply within 48 hours, ` +
    `(2) Coordinate with District CMO for staff redeployment, ` +
    `(3) Activate overflow protocol to nearest PHC.`;
}

// Simulates multimodal photo stock verification (Prompt §3d)
export async function verifyStockFromPhoto(medicineName, systemQty, imageName) {
  await delay(2000);
  // Simulate slight discrepancy detection
  const detected = Math.max(5, Math.round(systemQty * (0.75 + Math.random() * 0.4)));
  const discrepancy = Math.abs(detected - systemQty);
  const discrepancyPct = ((discrepancy / systemQty) * 100).toFixed(1);
  const flagged = discrepancyPct > 15;

  return {
    detected,
    systemQty,
    discrepancy,
    discrepancyPct,
    flagged,
    summary: flagged
      ? `⚠️ Discrepancy detected: System shows ${systemQty} units but photo analysis estimates ${detected} units of ${medicineName} (${discrepancyPct}% variance — FLAGGED for audit).`
      : `✅ Stock verified: Photo analysis estimates ${detected} units of ${medicineName}. Within 15% tolerance of system record (${systemQty} units).`,
  };
}

// Voice input parsing (Prompt §4 — simulates Speech-to-Text + Gemini extraction)
export async function parseVoiceStockUpdate(transcript) {
  await delay(700);
  // Simple keyword extraction simulation
  const lowerT = transcript.toLowerCase();
  let medicineName = 'Unknown Medicine';
  let quantity = null;
  let action = 'update';

  const medicineKeywords = {
    'paracetamol': 'Paracetamol 500mg',
    'amoxicillin': 'Amoxicillin 250mg',
    'ors': 'ORS Sachets',
    'metformin': 'Metformin 500mg',
    'atenolol': 'Atenolol 50mg',
    'iron': 'Iron Folic Acid',
    'zinc': 'Zinc 20mg',
    'albendazole': 'Albendazole 400mg',
  };

  for (const [key, val] of Object.entries(medicineKeywords)) {
    if (lowerT.includes(key)) { medicineName = val; break; }
  }

  const numMatch = transcript.match(/\d+/);
  if (numMatch) quantity = parseInt(numMatch[0]);

  if (lowerT.includes('khatam') || lowerT.includes('out') || lowerT.includes('zero')) action = 'stockout';
  else if (lowerT.includes('bachi') || lowerT.includes('left') || lowerT.includes('remaining')) action = 'low_stock';
  else if (lowerT.includes('add') || lowerT.includes('received') || lowerT.includes('mila')) action = 'restock';

  return {
    medicineName,
    quantity,
    action,
    confidence: 0.87,
    confirmation: quantity
      ? `मैंने समझा: ${medicineName} — ${quantity} units ${action === 'restock' ? 'received' : 'remaining'}. क्या यह सही है?`
      : `मैंने समझा: ${medicineName} का स्टॉक अपडेट। Quantity unclear — please confirm.`,
  };
}

// Translation simulation (Prompt §4)
export async function translateText(text, targetLang) {
  await delay(300);
  const translations = {
    hi: {
      'Stock Alerts': 'स्टॉक अलर्ट',
      'District Dashboard': 'जिला डैशबोर्ड',
      'Total PHCs': 'कुल पीएचसी',
      'Critical Alerts': 'गंभीर अलर्ट',
      'Approve Transfer': 'स्थानांतरण स्वीकृत करें',
      'Voice Input': 'आवाज़ इनपुट',
    },
    mr: {
      'Stock Alerts': 'साठा इशारे',
      'District Dashboard': 'जिल्हा डॅशबोर्ड',
      'Total PHCs': 'एकूण पीएचसी',
      'Critical Alerts': 'गंभीर इशारे',
      'Approve Transfer': 'हस्तांतरण मंजूर करा',
      'Voice Input': 'आवाज इनपुट',
    },
  };
  return translations[targetLang]?.[text] || text;
}
