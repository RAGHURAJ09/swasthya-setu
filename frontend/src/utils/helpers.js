// Severity color helpers
export function getSeverityColor(severity) {
  const map = {
    critical: 'var(--color-critical)',
    warning:  'var(--color-warning)',
    success:  'var(--color-success)',
    good:     'var(--color-success)',
    info:     'var(--color-info)',
  };
  return map[severity] || 'var(--color-text-muted)';
}

export function getSeverityBg(severity) {
  const map = {
    critical: 'var(--color-critical-bg)',
    warning:  'var(--color-warning-bg)',
    success:  'var(--color-success-bg)',
    good:     'var(--color-success-bg)',
    info:     'var(--color-info-bg)',
  };
  return map[severity] || 'var(--color-surface-3)';
}

export function getStatusLabel(status, lang = 'en') {
  const labels = {
    en: { good: 'Good', warning: 'Warning', critical: 'Critical' },
    hi: { good: 'अच्छा', warning: 'चेतावनी', critical: 'गंभीर' },
    mr: { good: 'चांगला', warning: 'इशारा', critical: 'गंभीर' },
  };
  return labels[lang]?.[status] || status;
}

export function getAlertTypeIcon(type) {
  const icons = {
    stockout:       '💊',
    understaffed:   '👨‍⚕️',
    overcrowded:    '🏥',
    low_test_capacity: '🧪',
  };
  return icons[type] || '⚠️';
}

export function getAlertTypeLabel(type) {
  const labels = {
    stockout:       'Medicine Stockout',
    understaffed:   'Understaffed',
    overcrowded:    'Overcrowded',
    low_test_capacity: 'Low Test Capacity',
  };
  return labels[type] || type;
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function getDaysColor(days) {
  if (days < 3) return 'var(--color-critical)';
  if (days < 7) return 'var(--color-warning)';
  return 'var(--color-success)';
}

export function getHealthScoreColor(score) {
  if (score >= 75) return 'var(--color-success)';
  if (score >= 50) return 'var(--color-warning)';
  return 'var(--color-critical)';
}

export function getBedUtilColor(pct) {
  if (pct >= 90) return 'var(--color-critical)';
  if (pct >= 70) return 'var(--color-warning)';
  return 'var(--color-success)';
}
