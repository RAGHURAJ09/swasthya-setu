import { useState, useRef } from 'react';
import { verifyStockFromPhoto } from '../services/geminiService';

export default function PhotoStockVerifier({ phcId, stockItems }) {
  const [step, setStep] = useState('idle'); // idle | uploading | analyzing | result
  const [result, setResult] = useState(null);
  const [selectedMedicine, setSelectedMedicine] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setStep('uploading');
  };

  const handleAnalyze = async () => {
    if (!selectedMedicine) return;
    const item = stockItems.find((s) => s.medicineName === selectedMedicine);
    if (!item) return;
    setStep('analyzing');
    const res = await verifyStockFromPhoto(item.medicineName, item.currentQty, 'uploaded_image');
    setResult(res);
    setStep('result');
  };

  const reset = () => {
    setStep('idle');
    setResult(null);
    setPreviewUrl(null);
    setSelectedMedicine('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="card">
      <div className="flex items-center gap-3" style={{ marginBottom: '1.25rem' }}>
        <div style={{
          width: 36, height: 36,
          background: 'linear-gradient(135deg, rgba(167,139,250,0.2), rgba(99,102,241,0.2))',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
        }}>📷</div>
        <div>
          <h4 style={{ margin: 0 }}>Photo Stock Verification</h4>
          <div className="ai-chip" style={{ marginTop: '0.2rem' }}>✦ Gemini Multimodal</div>
        </div>
      </div>

      {step === 'idle' && (
        <div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="label">Select Medicine to Verify</label>
            <select
              className="input select"
              value={selectedMedicine}
              onChange={(e) => setSelectedMedicine(e.target.value)}
            >
              <option value="">Choose medicine…</option>
              {stockItems.map((s) => (
                <option key={s.medicineId} value={s.medicineName}>
                  {s.medicineName} (system: {s.currentQty} {s.unit})
                </option>
              ))}
            </select>
          </div>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '1.5rem',
              border: '2px dashed var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              cursor: 'pointer',
              transition: 'var(--transition)',
              background: 'var(--color-surface-2)',
              color: 'var(--color-text-muted)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-border)'}
          >
            <span style={{ fontSize: '2rem' }}>📸</span>
            <span style={{ fontWeight: 600 }}>Click to photograph shelf</span>
            <span style={{ fontSize: '0.75rem' }}>JPG, PNG, WebP supported</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </label>
        </div>
      )}

      {step === 'uploading' && previewUrl && (
        <div>
          <img
            src={previewUrl}
            alt="Stock shelf"
            style={{
              width: '100%', height: 180, objectFit: 'cover',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1rem',
              border: '1px solid var(--color-border)',
            }}
          />
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label className="label">Medicine in Photo</label>
            <select
              className="input select"
              value={selectedMedicine}
              onChange={(e) => setSelectedMedicine(e.target.value)}
            >
              <option value="">Choose medicine…</option>
              {stockItems.map((s) => (
                <option key={s.medicineId} value={s.medicineName}>
                  {s.medicineName} (system: {s.currentQty})
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-primary"
              style={{ flex: 1 }}
              onClick={handleAnalyze}
              disabled={!selectedMedicine}
            >
              🔍 Analyze with Gemini
            </button>
            <button className="btn btn-secondary" onClick={reset}>Reset</button>
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
          <div className="flex items-center gap-2" style={{ justifyContent: 'center', marginBottom: '0.5rem' }}>
            <div className="spinner" />
            <span style={{ fontWeight: 600 }}>Gemini analyzing image…</span>
          </div>
          <p style={{ fontSize: '0.8rem' }}>Counting visible medicine boxes/strips by type</p>
        </div>
      )}

      {step === 'result' && result && (
        <div>
          {previewUrl && (
            <img
              src={previewUrl}
              alt="Analyzed shelf"
              style={{
                width: '100%', height: 140, objectFit: 'cover',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                border: '1px solid var(--color-border)',
              }}
            />
          )}

          {/* Side-by-side comparison */}
          <div className="grid-2" style={{ gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem',
              textAlign: 'center',
              border: '1px solid var(--color-border)',
            }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>System Record</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-primary)' }}>{result.systemQty}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>units</div>
            </div>
            <div style={{
              background: 'var(--color-surface-2)',
              borderRadius: 'var(--radius-md)',
              padding: '0.875rem',
              textAlign: 'center',
              border: `1px solid ${result.flagged ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}`,
            }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Photo Detected</div>
              <div style={{
                fontSize: '1.75rem', fontWeight: 800,
                color: result.flagged ? 'var(--color-critical)' : 'var(--color-success)',
              }}>
                {result.detected}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>units estimated</div>
            </div>
          </div>

          <div className={`alert-item ${result.flagged ? 'critical' : 'success'}`} style={{ marginBottom: '1rem' }}>
            <span style={{ flexShrink: 0 }}>{result.flagged ? '⚠️' : '✅'}</span>
            <div style={{ fontSize: '0.85rem' }}>{result.summary}</div>
          </div>

          {result.flagged && (
            <div style={{
              background: 'var(--color-critical-bg)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              color: 'var(--color-critical)',
            }}>
              🚨 Discrepancy of {result.discrepancyPct}% exceeds 15% threshold — flagged for manual audit
            </div>
          )}

          <button className="btn btn-secondary" style={{ width: '100%' }} onClick={reset}>
            ↩ Verify Another Medicine
          </button>
        </div>
      )}
    </div>
  );
}
