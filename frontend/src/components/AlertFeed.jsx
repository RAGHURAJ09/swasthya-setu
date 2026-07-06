import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { getAlertTypeIcon, getAlertTypeLabel, formatDateTime, getDaysColor } from '../utils/helpers';
import { getStockoutRecommendation } from '../services/geminiService';

export default function AlertFeed({ limit }) {
  const { alerts, resolveAlert, getActiveCriticalAlerts, getActiveWarningAlerts } = useAppStore();
  const [expandedId, setExpandedId] = useState(null);
  const [loadingId, setLoadingId] = useState(null);
  const [aiTexts, setAiTexts] = useState({});

  const activeAlerts = alerts
    .filter((a) => !a.resolved)
    .sort((a, b) => {
      const sev = { critical: 0, warning: 1 };
      return (sev[a.severity] ?? 2) - (sev[b.severity] ?? 2);
    });

  const displayed = limit ? activeAlerts.slice(0, limit) : activeAlerts;

  const handleExpand = async (alert) => {
    if (expandedId === alert.id) { setExpandedId(null); return; }
    setExpandedId(alert.id);
    if (!aiTexts[alert.id]) {
      setLoadingId(alert.id);
      const text = await getStockoutRecommendation(alert);
      setAiTexts((prev) => ({ ...prev, [alert.id]: text }));
      setLoadingId(null);
    }
  };

  if (displayed.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
        <p>No active alerts — all PHCs operating normally</p>
      </div>
    );
  }

  return (
    <div className="flex-col gap-3" style={{ display: 'flex' }}>
      {displayed.map((alert) => (
        <div
          key={alert.id}
          className={`alert-item ${alert.severity}`}
          style={{ flexDirection: 'column', gap: '0.75rem', cursor: 'pointer' }}
          onClick={() => handleExpand(alert)}
        >
          {/* Header row */}
          <div className="flex items-center gap-3">
            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{getAlertTypeIcon(alert.type)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="flex items-center gap-2">
                <span
                  className="badge"
                  style={{
                    background: alert.severity === 'critical' ? 'var(--color-critical-bg)' : 'var(--color-warning-bg)',
                    color: alert.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)',
                    borderColor: alert.severity === 'critical' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)',
                  }}
                >
                  <span className={`pulse-dot ${alert.severity}`} />
                  {alert.severity.toUpperCase()}
                </span>
                <span className="badge badge-neutral">{getAlertTypeLabel(alert.type)}</span>
              </div>
              <div className="flex items-center gap-2" style={{ marginTop: '0.25rem' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{alert.phcName}</span>
                {alert.medicine && (
                  <>
                    <span style={{ color: 'var(--color-text-dim)' }}>·</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>{alert.medicine}</span>
                  </>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              {alert.daysUntilStockout != null && (
                <div style={{
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  color: getDaysColor(alert.daysUntilStockout),
                  lineHeight: 1,
                }}>
                  {alert.daysUntilStockout < 1
                    ? `${Math.round(alert.daysUntilStockout * 24)}h`
                    : `${alert.daysUntilStockout.toFixed(1)}d`}
                </div>
              )}
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', marginTop: '0.1rem' }}>
                {alert.daysUntilStockout != null ? 'until stockout' : formatDateTime(alert.createdAt)}
              </div>
            </div>
          </div>

          {/* Expanded AI recommendation */}
          {expandedId === alert.id && (
            <div onClick={(e) => e.stopPropagation()}>
              <div className="ai-response-box" style={{ marginTop: '0.25rem' }}>
                {loadingId === alert.id ? (
                  <div className="flex items-center gap-2">
                    <div className="spinner" />
                    <span style={{ color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>Generating Gemini recommendation…</span>
                  </div>
                ) : (
                  aiTexts[alert.id] || alert.aiRecommendation
                )}
              </div>
              <div className="flex gap-2" style={{ marginTop: '0.75rem' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => resolveAlert(alert.id)}
                >
                  ✓ Mark Resolved
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {/* open redistribution modal */}}
                >
                  📦 View Redistribution
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
