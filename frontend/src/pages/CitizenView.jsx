import { useState } from 'react';
import { useAppStore } from '../store/appStore';

export default function CitizenView() {
  const { phcs, stockData } = useAppStore();
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState([]);

  const MEDICINES = [
    'Paracetamol 500mg', 'Amoxicillin 250mg', 'ORS Sachets',
    'Metformin 500mg', 'Atenolol 50mg', 'Iron Folic Acid',
    'Albendazole 400mg', 'Zinc 20mg',
  ];

  const handleSearch = () => {
    if (!query.trim()) return;
    const q = query.toLowerCase();
    const matches = [];
    for (const phc of phcs) {
      const items = stockData[phc.id] || [];
      const item = items.find((i) => i.medicineName.toLowerCase().includes(q));
      if (item) {
        matches.push({
          phc,
          item,
          available: item.currentQty > item.reorderThreshold,
        });
      }
    }
    matches.sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0));
    setResults(matches);
    setSearched(true);
  };

  return (
    <div className="page-body" style={{ maxWidth: 700 }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-surface-2), var(--color-surface-3))',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '2.5rem',
        textAlign: 'center',
        marginBottom: '0.5rem',
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🏥</div>
        <h1 style={{ marginBottom: '0.5rem' }}>Find Medicines Near You</h1>
        <p style={{ marginBottom: '1.5rem' }}>
          Check medicine availability at PHCs in Pune district before you travel.
        </p>
        <div className="flex gap-2" style={{ maxWidth: 440, margin: '0 auto' }}>
          <input
            id="medicine-search-input"
            className="input"
            placeholder="Search medicine (e.g. Paracetamol)…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={handleSearch}>
            🔍 Search
          </button>
        </div>
        {/* Quick pills */}
        <div className="flex gap-2" style={{ flexWrap: 'wrap', justifyContent: 'center', marginTop: '1rem' }}>
          {MEDICINES.slice(0, 4).map((m) => (
            <button
              key={m}
              className="btn btn-secondary btn-sm"
              onClick={() => { setQuery(m.split(' ')[0]); }}
              style={{ fontSize: '0.72rem' }}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div>
          <h3 style={{ marginBottom: '0.75rem' }}>
            {results.length === 0
              ? `No results for "${query}"`
              : `${results.length} PHC${results.length > 1 ? 's' : ''} found for "${query}"`}
          </h3>
          <div className="flex-col gap-3" style={{ display: 'flex' }}>
            {results.map(({ phc, item, available }) => (
              <div
                key={phc.id}
                className="card"
                style={{
                  border: `1px solid ${available ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div style={{
                    width: 44, height: 44,
                    borderRadius: 'var(--radius-md)',
                    background: available ? 'var(--color-success-bg)' : 'var(--color-critical-bg)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem', flexShrink: 0,
                  }}>
                    {available ? '✅' : '❌'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{phc.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                      Block {phc.block} · {phc.lat.toFixed(2)}°N, {phc.lng.toFixed(2)}°E
                    </div>
                    <div style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      <span style={{ color: available ? 'var(--color-success)' : 'var(--color-critical)', fontWeight: 600 }}>
                        {available ? '✓ Available' : '✗ Low/Out of stock'}
                      </span>
                      <span style={{ color: 'var(--color-text-dim)' }}>
                        {' '}— {item.currentQty} {item.unit} in stock
                      </span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', marginBottom: '0.25rem' }}>📞 Contact</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                      1800-XXX-{phc.id.split('-')[1]}
                    </div>
                  </div>
                </div>
                {!available && (
                  <div style={{
                    marginTop: '0.75rem',
                    padding: '0.65rem',
                    background: 'var(--color-warning-bg)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    color: 'var(--color-warning)',
                    border: '1px solid rgba(245,158,11,0.2)',
                  }}>
                    ⚠️ Call before travelling — this PHC may have very limited stock of {item.medicineName}.
                  </div>
                )}
              </div>
            ))}
            {results.length === 0 && (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-dim)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                <p>No PHC in this district stocks "{query}". Please contact District Health Office.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Info cards */}
      {!searched && (
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '0.5rem' }}>
          {[
            { icon: '📍', label: `${phcs.length} PHCs`, sub: 'in Pune district' },
            { icon: '⏱',  label: 'Real-time', sub: 'stock availability' },
            { icon: '📞', label: 'Free helpline', sub: '1800-XXX-XXXX' },
          ].map((c) => (
            <div key={c.label} className="card card-sm" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{c.icon}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{c.sub}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
