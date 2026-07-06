import { useAppStore } from '../store/appStore';
import RedistributionCard from '../components/RedistributionCard';

export default function RedistributionPage() {
  const { redistributionSuggestions, phcs, alerts } = useAppStore();
  const pending  = redistributionSuggestions.filter((r) => !r.approved);
  const approved = redistributionSuggestions.filter((r) => r.approved);

  return (
    <div className="page-body">
      <div>
        <h1>Smart Redistribution</h1>
        <div className="flex items-center gap-2" style={{ marginTop: '0.25rem' }}>
          <p style={{ margin: 0 }}>AI-ranked redistribution suggestions using Gemini + Distance Matrix API</p>
          <div className="ai-chip">✦ Gemini + Maps</div>
        </div>
      </div>

      {/* How it works */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.05), rgba(99,102,241,0.05))', border: '1px solid rgba(14,165,233,0.2)' }}>
        <h4 style={{ marginBottom: '0.75rem' }}>How AI Redistribution Works</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {[
            { step: '1', label: 'Detect shortage', icon: '🚨', desc: 'Stock-out prediction flags a PHC below threshold' },
            { step: '2', label: 'Find donors', icon: '🔍', desc: 'Query all district PHCs for same medicine surplus' },
            { step: '3', label: 'Rank by distance', icon: '📍', desc: 'Distance Matrix API gives real travel time (not straight-line)' },
            { step: '4', label: 'Gemini suggestion', icon: '✦', desc: 'Combined urgency + distance score → actionable card' },
          ].map((s) => (
            <div key={s.step} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>{s.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.2rem', color: 'var(--color-primary)' }}>
                Step {s.step}: {s.label}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {pending.length > 0 && (
        <div>
          <h2 style={{ marginBottom: '1rem' }}>⏳ Pending Approval ({pending.length})</h2>
          <div className="grid-2">
            {pending.map((r) => <RedistributionCard key={r.id} suggestion={r} />)}
          </div>
        </div>
      )}

      {approved.length > 0 && (
        <div>
          <h2 style={{ marginBottom: '1rem' }}>✅ Approved Transfers ({approved.length})</h2>
          <div className="grid-2">
            {approved.map((r) => <RedistributionCard key={r.id} suggestion={r} />)}
          </div>
        </div>
      )}

      {pending.length === 0 && approved.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-dim)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📦</div>
          <h3>No redistribution suggestions</h3>
          <p>AI will generate suggestions when stock falls below critical threshold</p>
        </div>
      )}
    </div>
  );
}
