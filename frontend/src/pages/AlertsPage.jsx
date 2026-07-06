import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import AlertFeed from '../components/AlertFeed';
import RedistributionCard from '../components/RedistributionCard';

export default function AlertsPage() {
  const { alerts, redistributionSuggestions, resolveAlert } = useAppStore();
  const [filter, setFilter] = useState('all'); // all | critical | warning | resolved

  const filtered = alerts.filter((a) => {
    if (filter === 'critical') return !a.resolved && a.severity === 'critical';
    if (filter === 'warning')  return !a.resolved && a.severity === 'warning';
    if (filter === 'resolved') return a.resolved;
    return !a.resolved;
  });

  const criticalCount = alerts.filter((a) => !a.resolved && a.severity === 'critical').length;
  const warningCount  = alerts.filter((a) => !a.resolved && a.severity === 'warning').length;
  const resolvedCount = alerts.filter((a) => a.resolved).length;

  return (
    <div className="page-body">
      <div>
        <h1>Alert Feed</h1>
        <p>All active AI-generated alerts across {useAppStore.getState().phcs.length} PHCs</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
        {[
          { id: 'all',      label: 'All Active',    count: criticalCount + warningCount },
          { id: 'critical', label: '🚨 Critical',   count: criticalCount },
          { id: 'warning',  label: '⚠️ Warning',    count: warningCount },
          { id: 'resolved', label: '✅ Resolved',   count: resolvedCount },
        ].map((f) => (
          <button
            key={f.id}
            className={`btn btn-sm ${filter === f.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {f.count > 0 && (
              <span style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 'var(--radius-full)',
                padding: '0 6px',
                fontSize: '0.7rem',
                fontWeight: 700,
              }}>{f.count}</span>
            )}
          </button>
        ))}
      </div>

      <div className="grid-2-1" style={{ alignItems: 'start' }}>
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>{filter === 'resolved' ? 'Resolved Alerts' : 'Active Alerts'}</h3>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
              <p>No alerts in this category</p>
            </div>
          ) : (
            <div className="flex-col gap-3" style={{ display: 'flex' }}>
              {filtered.map((alert) => (
                <div
                  key={alert.id}
                  className={`alert-item ${alert.resolved ? 'success' : alert.severity}`}
                  style={{ flexDirection: 'column', gap: '0.5rem' }}
                >
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: '1.3rem' }}>
                      {alert.type === 'stockout' ? '💊' : alert.type === 'understaffed' ? '👨‍⚕️' : '🏥'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{alert.phcName}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {alert.type === 'stockout' ? `${alert.medicine} — ${alert.daysUntilStockout?.toFixed(1)}d remaining` : alert.type}
                      </div>
                    </div>
                    <span className={`badge badge-${alert.resolved ? 'success' : alert.severity}`}>
                      {alert.resolved ? 'RESOLVED' : alert.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="ai-response-box" style={{ fontSize: '0.8rem' }}>
                    {alert.aiRecommendation}
                  </div>
                  {!alert.resolved && (
                    <button className="btn btn-sm btn-secondary" onClick={() => resolveAlert(alert.id)}>
                      ✓ Mark Resolved
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-col gap-4" style={{ display: 'flex' }}>
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Summary</h3>
            {[
              { label: 'Critical', count: criticalCount, color: 'var(--color-critical)' },
              { label: 'Warning',  count: warningCount,  color: 'var(--color-warning)' },
              { label: 'Resolved', count: resolvedCount, color: 'var(--color-success)' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3" style={{ marginBottom: '0.75rem' }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: color, flexShrink: 0,
                }} />
                <span style={{ flex: 1, fontSize: '0.875rem' }}>{label}</span>
                <span style={{ fontWeight: 700, color }}>{count}</span>
              </div>
            ))}
          </div>

          {redistributionSuggestions.length > 0 && (
            <div>
              <h3 style={{ marginBottom: '0.75rem' }}>Pending Redistributions</h3>
              {redistributionSuggestions.map((r) => (
                <RedistributionCard key={r.id} suggestion={r} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
