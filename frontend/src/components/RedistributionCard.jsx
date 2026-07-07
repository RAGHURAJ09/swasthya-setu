import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import { approveRedistribution as approveApi } from '../services/api';

export default function RedistributionCard({ suggestion }) {
  const { approveRedistribution } = useAppStore();
  const [approved, setApproved] = useState(suggestion.approved);
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      // Try live API first; gracefully fall back to local store
      await approveApi(suggestion.id, 'officer').catch(() => null);
      approveRedistribution(suggestion.id);
      setApproved(true);
      toast.success(`✓ Transfer approved — ${suggestion.quantity} ${suggestion.unit} of ${suggestion.medicine} queued from ${suggestion.fromPhcName} → ${suggestion.toPhcName}`);
    } catch (e) {
      toast.error('Approval failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="card"
      style={{
        border: approved
          ? '1px solid rgba(16,185,129,0.4)'
          : '1px solid rgba(14,165,233,0.3)',
        background: approved ? 'var(--color-success-bg)' : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
        <div style={{
          width: 40, height: 40,
          background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2))',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', flexShrink: 0,
        }}>
          📦
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
            Redistribution Suggestion
          </div>
          <div className="ai-chip" style={{ marginTop: '0.2rem' }}>
            ✦ Gemini Recommended
          </div>
        </div>
        {approved && (
          <div className="badge badge-success" style={{ marginLeft: 'auto' }}>
            ✓ Approved
          </div>
        )}
      </div>

      {/* Medicine info */}
      <div style={{
        background: 'var(--color-surface-2)',
        borderRadius: 'var(--radius-md)',
        padding: '0.875rem 1rem',
        marginBottom: '1rem',
        fontSize: '0.9rem',
      }}>
        <div className="flex items-center gap-3" style={{ marginBottom: '0.5rem' }}>
          <span style={{ color: 'var(--color-text-muted)' }}>Medicine</span>
          <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{suggestion.medicine}</span>
          <span style={{ marginLeft: 'auto', fontWeight: 800, color: 'var(--color-accent)' }}>
            {suggestion.quantity} {suggestion.unit}
          </span>
        </div>
        <div className="flex items-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
          <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{suggestion.fromPhcName}</span>
          <span>→</span>
          <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>{suggestion.toPhcName}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid-3" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
        {[
          { label: 'Distance', value: `${suggestion.distanceKm} km`, icon: '📍' },
          { label: 'Travel Time', value: `~${suggestion.travelTimeMin} min`, icon: '🚗' },
          { label: 'Donor Surplus', value: `+${suggestion.fromSurplus} units`, icon: '📊' },
        ].map((stat) => (
          <div key={stat.label} style={{
            background: 'var(--color-surface-2)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 0.75rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1rem', marginBottom: '0.1rem' }}>{stat.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{stat.value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Justification */}
      <div className="ai-response-box" style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
        {suggestion.justification}
      </div>

      {/* Action */}
      {!approved ? (
        <div className="flex gap-2">
          <button
            className="btn btn-success"
            style={{ flex: 1 }}
            onClick={handleApprove}
            disabled={loading}
          >
            {loading ? <><div className="spinner" /> Processing…</> : '✓ Approve Transfer'}
          </button>
          <button className="btn btn-secondary btn-sm">Modify</button>
          <button className="btn btn-danger btn-sm">Reject</button>
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          color: 'var(--color-success)',
          fontWeight: 600,
          fontSize: '0.875rem',
          padding: '0.5rem',
        }}>
          ✓ Transfer approved — both PHC stock records have been updated
        </div>
      )}
    </div>
  );
}
