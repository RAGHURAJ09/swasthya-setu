import { useState } from 'react';
import { parseVoiceStockUpdate } from '../services/geminiService';
import { useAppStore } from '../store/appStore';

export default function VoiceInput({ phcId, onSuccess }) {
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState(null);
  const [step, setStep] = useState('idle'); // idle | recording | parsing | confirm | done
  const { updateStock, stockData } = useAppStore();

  const DEMO_PHRASES = [
    'Paracetamol khatam ho raha hai, sirf 50 bachi hai',
    'ORS sachets received, 200 packets mila',
    'Zinc 10 tablets remaining, bahut kam hai',
    'Amoxicillin 150 capsules bachi hain',
  ];

  const startRecording = () => {
    setRecording(true);
    setStep('recording');
    setTranscript('');
    setParsed(null);
    // Simulate recording then auto-fill with demo phrase after 2s
    setTimeout(() => {
      const phrase = DEMO_PHRASES[Math.floor(Math.random() * DEMO_PHRASES.length)];
      setTranscript(phrase);
    }, 2000);
  };

  const stopRecording = async () => {
    setRecording(false);
    if (!transcript) return;
    setStep('parsing');
    const result = await parseVoiceStockUpdate(transcript);
    setParsed(result);
    setStep('confirm');
    // Speak confirmation via TTS (browser API)
    if ('speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(result.confirmation);
      utter.lang = 'hi-IN';
      utter.rate = 0.9;
      window.speechSynthesis.speak(utter);
    }
  };

  const handleConfirm = () => {
    if (parsed?.medicineName && parsed?.quantity && phcId) {
      const stock = stockData[phcId];
      if (stock) {
        const item = stock.find((s) => s.medicineName === parsed.medicineName);
        if (item) updateStock(phcId, item.medicineId, parsed.quantity);
      }
    }
    setStep('done');
    setTimeout(() => {
      setStep('idle');
      setTranscript('');
      setParsed(null);
      onSuccess?.();
    }, 2000);
  };

  const handleReset = () => {
    setStep('idle');
    setTranscript('');
    setParsed(null);
    setRecording(false);
  };

  return (
    <div className="card" style={{ background: 'var(--color-surface-2)' }}>
      <div className="flex items-center gap-3" style={{ marginBottom: '1.25rem' }}>
        <div style={{
          width: 36, height: 36,
          background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(99,102,241,0.2))',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1rem',
        }}>🎙️</div>
        <div>
          <h4 style={{ margin: 0 }}>Voice Stock Update</h4>
          <p style={{ fontSize: '0.75rem', margin: 0 }}>Speak in Hindi or regional language</p>
        </div>
      </div>

      {/* Step: idle or recording */}
      {(step === 'idle' || step === 'recording') && (
        <div style={{ textAlign: 'center' }}>
          <button
            className={`voice-btn ${recording ? 'recording' : ''}`}
            style={{ margin: '0 auto 1rem', display: 'flex' }}
            onClick={recording ? stopRecording : startRecording}
            title={recording ? 'Stop Recording' : 'Start Recording'}
          >
            {recording ? '⏹' : '🎙️'}
          </button>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
            {recording ? '🔴 Recording… tap to stop' : 'Tap to speak stock update'}
          </p>
          {transcript && step === 'recording' && (
            <div style={{
              marginTop: '0.75rem',
              padding: '0.65rem 1rem',
              background: 'var(--color-surface)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              fontSize: '0.875rem',
              fontStyle: 'italic',
              color: 'var(--color-text-muted)',
              textAlign: 'left',
            }}>
              "{transcript}"
            </div>
          )}
        </div>
      )}

      {/* Step: parsing */}
      {step === 'parsing' && (
        <div className="flex items-center gap-2" style={{ justifyContent: 'center', padding: '1rem' }}>
          <div className="spinner" />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Gemini is extracting structured data…</span>
        </div>
      )}

      {/* Step: confirm */}
      {step === 'confirm' && parsed && (
        <div>
          <div style={{
            padding: '0.75rem',
            background: 'var(--color-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--color-border)',
            fontSize: '0.85rem',
            marginBottom: '0.75rem',
            fontStyle: 'italic',
            color: 'var(--color-text-muted)',
          }}>
            🗣️ "{transcript}"
          </div>
          <div className="ai-response-box" style={{ marginBottom: '1rem' }}>
            {parsed.confirmation}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.5rem',
            marginBottom: '1rem',
          }}>
            {[
              { label: 'Medicine', value: parsed.medicineName },
              { label: 'Quantity', value: parsed.quantity ? `${parsed.quantity} units` : 'Unknown' },
              { label: 'Action', value: parsed.action?.replace('_', ' ') },
              { label: 'Confidence', value: `${(parsed.confidence * 100).toFixed(0)}%` },
            ].map(({ label, value }) => (
              <div key={label} style={{
                background: 'var(--color-surface-2)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.5rem 0.75rem',
              }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>{value}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleConfirm}>
              ✓ Confirm & Save
            </button>
            <button className="btn btn-secondary" onClick={handleReset}>
              ✗ Retry
            </button>
          </div>
        </div>
      )}

      {/* Step: done */}
      {step === 'done' && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--color-success)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
          <div style={{ fontWeight: 700 }}>Stock record updated successfully!</div>
        </div>
      )}

      {/* Demo hint */}
      {step === 'idle' && (
        <div style={{ marginTop: '1rem', fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Demo phrases:</div>
          {DEMO_PHRASES.slice(0, 2).map((p) => (
            <div key={p} style={{ fontStyle: 'italic', marginBottom: '0.1rem' }}>"{p}"</div>
          ))}
        </div>
      )}
    </div>
  );
}
