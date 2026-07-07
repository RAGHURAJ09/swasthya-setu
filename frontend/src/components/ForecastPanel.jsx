/**
 * ForecastPanel — Module F component
 * Shows per-facility inventory forecast: ranked by urgency, with trend badge and days-left bar.
 * Uses Module B's /forecast/:facilityId endpoint (falls back to seedData when no API).
 */
import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { getFacilityForecast } from '../services/api';

const STATUS_COLORS = {
  critical: 'var(--color-critical)',
  warning:  'var(--color-warning)',
  watch:    'var(--color-indigo)',
  ok:       'var(--color-success)',
};

const TREND_BADGE = {
  increasing: { label: '↑ Rising',   color: '#ef4444' },
  decreasing: { label: '↓ Falling',  color: '#10b981' },
  stable:     { label: '→ Stable',   color: '#64748b' },
};

// Mock fallback for dev without emulator
function buildMockForecast(stockItems) {
  return (stockItems || []).map(s => {
    const daily    = s.avgDailyConsumption || 1;
    const daysLeft = parseFloat((s.currentQty / daily).toFixed(1));
    return {
      medicineName:    s.medicineName,
      currentQty:      s.currentQty,
      unit:            s.unit,
      reorderThreshold:s.reorderThreshold,
      wmaConsumption:  daily,
      daysLeft,
      trend:           'stable',
      status: daysLeft < 3 ? 'critical' : daysLeft < 7 ? 'warning' : daysLeft < 14 ? 'watch' : 'ok',
      urgency: daysLeft < 3 ? 90 : daysLeft < 7 ? 70 : daysLeft < 14 ? 40 : 0,
    };
  }).sort((a, b) => b.urgency - a.urgency);
}

export default function ForecastPanel({ facilityId, stockItems, facilityName }) {
  const [forecasts, setForecasts] = useState([]);
  const [aiSummary, setAiSummary] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState('list'); // 'list' | 'chart'

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getFacilityForecast(facilityId)
      .then(res => {
        if (cancelled) return;
        setForecasts(res.data?.forecasts || []);
        setAiSummary(res.data?.aiSummary || null);
      })
      .catch(() => {
        if (!cancelled) setForecasts(buildMockForecast(stockItems));
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [facilityId]);

  const urgent = forecasts.filter(f => f.status === 'critical' || f.status === 'warning');
  const chartData = forecasts.slice(0, 8).map(f => ({
    name: f.medicineName.split(' ')[0],
    daysLeft: f.daysLeft,
    fill: STATUS_COLORS[f.status] || '#64748b',
  }));

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      {/* Header */}
      <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0 }}>📈 Stock-out Forecast</h3>
          <p style={{ fontSize: '0.75rem', margin: 0, color: 'var(--color-text-dim)' }}>
            Weighted moving average · AI-powered
          </p>
        </div>
        <div className="ai-chip">✦ Module B</div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['list', 'chart'].map(v => (
            <button
              key={v}
              id={`forecast-view-${v}`}
              onClick={() => setView(v)}
              style={{
                padding: '0.3rem 0.65rem',
                fontSize: '0.72rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: view === v ? 'var(--color-primary)' : 'var(--color-surface-2)',
                color: view === v ? '#fff' : 'var(--color-text-muted)',
                cursor: 'pointer',
              }}
            >
              {v === 'list' ? '≡ List' : '▦ Chart'}
            </button>
          ))}
        </div>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div style={{
          background: 'rgba(239,68,68,0.07)',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 0.875rem',
          fontSize: '0.8rem',
          color: 'var(--color-text-body)',
          marginBottom: '1rem',
          lineHeight: 1.5,
        }}>
          <span style={{ fontWeight: 700, color: 'var(--color-critical)', marginRight: '0.35rem' }}>✦ AI:</span>
          {aiSummary}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)', fontSize: '0.85rem' }}>
          Loading forecast…
        </div>
      ) : view === 'chart' ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} layout="vertical" barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(56,139,200,0.08)" horizontal={false} />
            <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
            <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={70} />
            <Tooltip
              formatter={(v) => [`${v} days`, 'Days Left']}
              contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
            />
            <Bar dataKey="daysLeft" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex-col" style={{ display: 'flex', gap: '0.6rem' }}>
          {forecasts.slice(0, 10).map((f, i) => {
            const color = STATUS_COLORS[f.status];
            const trend = TREND_BADGE[f.trend] || TREND_BADGE.stable;
            const barPct = Math.min(100, (f.daysLeft / 30) * 100);
            return (
              <div key={i} style={{
                padding: '0.6rem 0.75rem',
                background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-md)',
                border: `1px solid ${f.status !== 'ok' ? color + '40' : 'var(--color-border)'}`,
              }}>
                <div className="flex items-center gap-2" style={{ marginBottom: '0.35rem' }}>
                  <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 600 }}>{f.medicineName}</span>
                  <span style={{
                    fontSize: '0.67rem', padding: '0.15rem 0.45rem',
                    borderRadius: 99, background: trend.color + '22',
                    color: trend.color, fontWeight: 600,
                  }}>{trend.label}</span>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    color: f.daysLeft < 7 ? color : 'var(--color-text-muted)',
                  }}>
                    {f.daysLeft < 1 ? '<1 day' : `${f.daysLeft}d`}
                  </span>
                </div>
                {/* Progress bar */}
                <div style={{ height: 4, background: 'rgba(148,163,184,0.15)', borderRadius: 2 }}>
                  <div style={{
                    height: 4, borderRadius: 2,
                    width: `${barPct}%`,
                    background: color,
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-dim)', marginTop: '0.25rem' }}>
                  {f.currentQty} {f.unit} · {f.wmaConsumption}/day avg
                </div>
              </div>
            );
          })}
        </div>
      )}

      {urgent.length > 0 && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--color-text-dim)', textAlign: 'right' }}>
          ⚠ {urgent.length} drug{urgent.length > 1 ? 's' : ''} need immediate attention
        </div>
      )}
    </div>
  );
}
