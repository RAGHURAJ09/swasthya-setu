/**
 * FlaggedFacilitiesList — Module F component
 * Ranked list of facilities with open alerts, showing Gemini-generated paragraph summary.
 * Uses Module D's /alerts/district-summary endpoint.
 */
import { useState, useEffect } from 'react';
import { getDistrictAlertSummary } from '../services/api';
import { useAppStore } from '../store/appStore';

const SEVERITY_COLORS = {
  critical: 'var(--color-critical)',
  warning:  'var(--color-warning)',
  ok:       'var(--color-success)',
};

// Mock fallback: build summaries from store data
function buildMockSummaries(phcs, alerts) {
  return phcs.map(p => {
    const openAlerts = alerts.filter(a => a.phcId === p.id && !a.resolved);
    const hasCritical = openAlerts.some(a => a.severity === 'critical');
    return {
      facilityId:   p.id,
      facilityName: p.name,
      alertCount:   openAlerts.length,
      severity:     hasCritical ? 'critical' : openAlerts.length > 0 ? 'warning' : 'ok',
      summary:      openAlerts.length > 0
        ? `${p.name} has ${openAlerts.length} open alert${openAlerts.length > 1 ? 's' : ''} — AI analysis pending. Check stock and staff levels urgently.`
        : 'No open alerts.',
      alerts: openAlerts.map(a => ({ type: a.type, severity: a.severity, medicine: a.medicine })),
    };
  }).sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (b.severity === 'critical' && a.severity !== 'critical') return 1;
    return b.alertCount - a.alertCount;
  });
}

export default function FlaggedFacilitiesList({ onNavigate }) {
  const { phcs, alerts } = useAppStore();
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expanded, setExpanded]   = useState(null);

  useEffect(() => {
    getDistrictAlertSummary()
      .then(res => setSummaries(res.data || []))
      .catch(() => setSummaries(buildMockSummaries(phcs, alerts)))
      .finally(() => setLoading(false));
  }, []);

  const flagged = summaries.filter(s => s.alertCount > 0);

  if (loading) return (
    <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>
      Loading facility summaries…
    </div>
  );

  if (flagged.length === 0) return (
    <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: '2rem' }}>✅</div>
      <div style={{ color: 'var(--color-success)', fontWeight: 600, marginTop: '0.5rem' }}>All facilities operating normally</div>
    </div>
  );

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, flex: 1 }}>🚩 Flagged Facilities</h3>
        <div className="ai-chip">✦ Gemini D Summary</div>
        <div style={{
          fontSize: '0.72rem', padding: '0.25rem 0.65rem',
          borderRadius: 99,
          background: 'var(--color-critical-bg)',
          color: 'var(--color-critical)',
          fontWeight: 700,
        }}>
          {flagged.filter(f => f.severity === 'critical').length} Critical
        </div>
      </div>

      <div className="flex-col" style={{ display: 'flex', gap: '0.75rem' }}>
        {flagged.map((s, i) => {
          const color     = SEVERITY_COLORS[s.severity] || 'var(--color-text-muted)';
          const isOpen    = expanded === s.facilityId;
          const typeIcons = { stockout: '💊', understaffed: '👨‍⚕️', overcrowded: '🛏', low_test_capacity: '🔬' };

          return (
            <div key={s.facilityId} style={{
              border: `1px solid ${color}40`,
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: `${color}08`,
            }}>
              {/* Row header */}
              <div
                id={`flagged-facility-${s.facilityId}`}
                className="flex items-center gap-3"
                onClick={() => setExpanded(isOpen ? null : s.facilityId)}
                style={{ padding: '0.75rem 1rem', cursor: 'pointer' }}
              >
                {/* Rank badge */}
                <div style={{
                  width: 26, height: 26,
                  borderRadius: 99,
                  background: color + '22',
                  color,
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{s.facilityName}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', marginTop: '0.1rem' }}>
                    {s.alerts.slice(0, 3).map(a => typeIcons[a.type] || '⚠').join(' ')}
                    {' '}{s.alertCount} open alert{s.alertCount > 1 ? 's' : ''}
                  </div>
                </div>

                <div style={{
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                  color, padding: '0.2rem 0.55rem',
                  borderRadius: 99,
                  background: color + '18',
                  flexShrink: 0,
                }}>
                  {s.severity}
                </div>

                <span style={{ color: 'var(--color-text-dim)', fontSize: '0.8rem' }}>{isOpen ? '▲' : '▼'}</span>
              </div>

              {/* Expanded: Gemini summary + alert list */}
              {isOpen && (
                <div style={{
                  borderTop: `1px solid ${color}25`,
                  padding: '0.875rem 1rem',
                  background: 'var(--color-surface-2)',
                }}>
                  {/* AI summary paragraph */}
                  {s.summary && s.summary !== 'No open alerts.' && (
                    <div style={{
                      fontSize: '0.8rem',
                      lineHeight: 1.6,
                      color: 'var(--color-text-body)',
                      marginBottom: '0.75rem',
                      paddingLeft: '0.75rem',
                      borderLeft: `3px solid ${color}`,
                    }}>
                      <span style={{ fontWeight: 700, color, marginRight: '0.35rem' }}>✦ AI:</span>
                      {s.summary}
                    </div>
                  )}

                  {/* Alert type chips */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    {s.alerts.map((a, j) => (
                      <span key={j} style={{
                        fontSize: '0.68rem',
                        padding: '0.2rem 0.55rem',
                        borderRadius: 99,
                        background: (a.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)') + '20',
                        color: a.severity === 'critical' ? 'var(--color-critical)' : 'var(--color-warning)',
                        fontWeight: 600,
                      }}>
                        {typeIcons[a.type]} {a.type.replace(/_/g, ' ')}{a.medicine ? ` · ${a.medicine.split(' ')[0]}` : ''}
                      </span>
                    ))}
                  </div>

                  <button
                    id={`view-facility-${s.facilityId}`}
                    onClick={() => onNavigate?.('phc-detail', s.facilityId)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.4rem 0.875rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1px solid ${color}`,
                      background: color + '15',
                      color,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    View Facility →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
