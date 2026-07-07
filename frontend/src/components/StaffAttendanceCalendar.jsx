/**
 * StaffAttendanceCalendar — Module F component
 * Shows a heatmap-style 30-day attendance calendar for a facility.
 * Green = ≥80%, Yellow = 60-79%, Red = <60%
 */

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function getColor(rate) {
  if (rate === null) return 'var(--color-surface-3, #1e293b)';
  if (rate >= 80) return '#10b98140';
  if (rate >= 60) return '#f59e0b40';
  return '#ef444440';
}
function getBorderColor(rate) {
  if (rate === null) return 'var(--color-border)';
  if (rate >= 80) return '#10b981';
  if (rate >= 60) return '#f59e0b';
  return '#ef4444';
}

export default function StaffAttendanceCalendar({ facilityId, staffData }) {
  // Build 30-day array from staffData or mock
  const today = new Date();
  const days  = Array.from({ length: 30 }, (_, i) => {
    const d   = new Date(today);
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split('T')[0];

    // Try to get from staffData (could be array of {date, attendanceRate})
    let rate = null;
    if (Array.isArray(staffData)) {
      const entry = staffData.find(s => s.date === dateStr || s.id === dateStr);
      rate = entry?.attendanceRate ?? null;
    } else if (staffData?.attendanceRate !== undefined) {
      // Single object: mock the last day only
      rate = i === 29 ? staffData.attendanceRate : Math.round(staffData.attendanceRate * (0.85 + Math.random() * 0.3));
    }

    return { date: dateStr, day: d.getDate(), dow: d.getDay(), rate };
  });

  // Pad start to align with weekday
  const firstDow = days[0].dow;
  const padded   = [...Array(firstDow).fill(null), ...days];

  const avgRate = Math.round(
    days.filter(d => d.rate !== null).reduce((s, d) => s + d.rate, 0) /
    Math.max(1, days.filter(d => d.rate !== null).length)
  );

  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, flex: 1 }}>📅 Staff Attendance — 30 Days</h3>
        <div style={{
          fontSize: '0.75rem', fontWeight: 700,
          color: avgRate >= 80 ? 'var(--color-success)' : avgRate >= 60 ? 'var(--color-warning)' : 'var(--color-critical)',
          background: (avgRate >= 80 ? '#10b981' : avgRate >= 60 ? '#f59e0b' : '#ef4444') + '18',
          padding: '0.2rem 0.6rem', borderRadius: 99,
        }}>
          Avg {avgRate}%
        </div>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAYS.map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--color-text-dim)', fontWeight: 600 }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {padded.map((d, i) => (
          <div
            key={i}
            title={d ? `${d.date}: ${d.rate !== null ? d.rate + '%' : 'No data'}` : ''}
            style={{
              aspectRatio: '1',
              borderRadius: 4,
              background: d ? getColor(d.rate) : 'transparent',
              border: d ? `1px solid ${getBorderColor(d.rate)}60` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6rem',
              color: 'var(--color-text-dim)',
              cursor: d ? 'default' : 'default',
              position: 'relative',
            }}
          >
            {d?.day}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4" style={{ marginTop: '0.875rem', fontSize: '0.68rem', color: 'var(--color-text-dim)' }}>
        {[
          { color: '#10b981', label: '≥80% Good' },
          { color: '#f59e0b', label: '60-79% Watch' },
          { color: '#ef4444', label: '<60% Critical' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1">
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.color + '50', border: `1px solid ${l.color}` }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
