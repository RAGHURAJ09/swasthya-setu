import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAppStore } from '../store/appStore';
import VoiceInput from '../components/VoiceInput';
import PhotoStockVerifier from '../components/PhotoStockVerifier';
import { getDaysColor } from '../utils/helpers';

export default function StaffDashboard() {
  const { currentUser, stockData, bedsData, staffData, footfallData, phcs } = useAppStore();
  const phcId = currentUser?.phcId || 'phc-001';
  const phc = phcs.find((p) => p.id === phcId);
  const stock = stockData[phcId] || [];
  const beds  = bedsData[phcId] || {};
  const staff = staffData[phcId] || {};
  const foot  = footfallData[phcId] || {};

  const [activeTab, setActiveTab] = useState('overview');

  const criticalStock = stock.filter((s) => s.daysUntilStockout < 3);
  const warningStock  = stock.filter((s) => s.daysUntilStockout >= 3 && s.daysUntilStockout < 7);

  return (
    <div className="page-body">
      <div>
        <h1>{phc?.name || 'My PHC'} Dashboard</h1>
        <p>Welcome, {currentUser?.name} · Real-time data entry and monitoring</p>
      </div>

      {/* Quick status */}
      <div className="grid-4" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {[
          { label: 'Patients Today', value: foot.today || 0, icon: '🏃', accent: 'var(--color-primary)' },
          { label: 'Beds Occupied',  value: `${beds.occupiedBeds || 0}/${beds.totalBeds || 0}`, icon: '🛏', accent: 'var(--color-indigo)' },
          { label: 'Staff Present',  value: `${staff.presentToday || 0}/${staff.totalStaff || 0}`, icon: '👥', accent: 'var(--color-success)' },
          { label: 'Stock Alerts',   value: criticalStock.length + warningStock.length, icon: '💊', accent: criticalStock.length > 0 ? 'var(--color-critical)' : 'var(--color-warning)' },
        ].map((s) => (
          <div key={s.label} className="stat-card" style={{ '--accent-color': s.accent }}>
            <div className="flex items-center gap-3">
              <div className="stat-icon" style={{ background: s.accent + '1a', fontSize: '1.1rem' }}>{s.icon}</div>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.accent, fontSize: '1.5rem' }}>{s.value}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'overview',    label: '📊 Overview' },
          { id: 'stock',       label: '💊 Stock' },
          { id: 'voice',       label: '🎙️ Voice Entry' },
          { id: 'photo',       label: '📷 Photo Verify' },
          { id: 'sms',         label: '📱 SMS Fallback' },
        ].map((t) => (
          <button
            key={t.id}
            className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid-2">
          {criticalStock.length + warningStock.length > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem' }}>⚠️ Stock Alerts</h3>
              <div className="flex-col gap-2" style={{ display: 'flex' }}>
                {[...criticalStock, ...warningStock].map((item) => (
                  <div
                    key={item.medicineId}
                    className={`alert-item ${item.daysUntilStockout < 3 ? 'critical' : 'warning'}`}
                    style={{ flexDirection: 'row', gap: '1rem' }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.medicineName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                        {item.currentQty} {item.unit} remaining
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, color: getDaysColor(item.daysUntilStockout), fontSize: '0.9rem' }}>
                      {item.daysUntilStockout < 1
                        ? `${Math.round(item.daysUntilStockout * 24)}h`
                        : `${item.daysUntilStockout.toFixed(1)}d`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Today's Summary</h3>
            <div className="flex-col gap-3" style={{ display: 'flex' }}>
              {[
                { label: 'OPD Patients',       value: foot.opd, icon: '🏃' },
                { label: 'Emergency',          value: foot.emergency, icon: '🚑' },
                { label: 'Maternity',          value: foot.maternity, icon: '👶' },
                { label: 'Doctors on Duty',    value: `${staff.doctors || 0}`, icon: '👨‍⚕️' },
                { label: 'Nurses on Duty',     value: `${staff.nurses || 0}`, icon: '👩‍⚕️' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex items-center gap-3">
                  <span style={{ fontSize: '1rem' }}>{icon}</span>
                  <span style={{ flex: 1, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>{label}</span>
                  <span style={{ fontWeight: 700 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stock tab */}
      {activeTab === 'stock' && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Medicine Inventory</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Current Stock</th>
                  <th>Reorder Level</th>
                  <th>Avg Daily Use</th>
                  <th>Days Remaining</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stock.map((item) => (
                  <tr key={item.medicineId}>
                    <td style={{ fontWeight: 500 }}>{item.medicineName}</td>
                    <td>{item.currentQty} {item.unit}</td>
                    <td style={{ color: 'var(--color-text-dim)' }}>{item.reorderThreshold}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{item.avgDailyConsumption}/day</td>
                    <td>
                      <span style={{ fontWeight: 800, color: getDaysColor(item.daysUntilStockout) }}>
                        {item.daysUntilStockout < 1
                          ? `${Math.round(item.daysUntilStockout * 24)}h`
                          : `${item.daysUntilStockout.toFixed(1)} days`}
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${
                        item.daysUntilStockout < 3 ? 'critical' :
                        item.daysUntilStockout < 7 ? 'warning' : 'success'
                      }`}>
                        {item.daysUntilStockout < 3 ? '🔴 Critical' : item.daysUntilStockout < 7 ? '🟡 Low' : '🟢 OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Voice entry tab */}
      {activeTab === 'voice' && (
        <div style={{ maxWidth: 480 }}>
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(14,165,233,0.05), rgba(99,102,241,0.05))',
            border: '1px solid rgba(14,165,233,0.2)',
            marginBottom: '1rem',
          }}>
            <div className="ai-chip" style={{ marginBottom: '0.5rem' }}>✦ AI Powered</div>
            <h3 style={{ margin: '0 0 0.25rem' }}>Voice Data Entry</h3>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>
              Speak stock updates in Hindi or Marathi. Gemini will extract the medicine name,
              quantity and action, then confirm back via Text-to-Speech before saving.
            </p>
          </div>
          <VoiceInput phcId={phcId} />
        </div>
      )}

      {/* Photo verify tab */}
      {activeTab === 'photo' && (
        <div style={{ maxWidth: 480 }}>
          <div className="card" style={{
            background: 'linear-gradient(135deg, rgba(167,139,250,0.05), rgba(99,102,241,0.05))',
            border: '1px solid rgba(167,139,250,0.2)',
            marginBottom: '1rem',
          }}>
            <div className="ai-chip" style={{ marginBottom: '0.5rem' }}>✦ Gemini Multimodal</div>
            <h3 style={{ margin: '0 0 0.25rem' }}>Photo Stock Verification</h3>
            <p style={{ margin: 0, fontSize: '0.8rem' }}>
              Photograph your medicine shelf. Gemini AI will count visible boxes/strips
              and compare against the system record, flagging discrepancies over 15%.
            </p>
          </div>
          <PhotoStockVerifier phcId={phcId} stockItems={stock} />
        </div>
      )}

      {/* SMS Fallback test tab */}
      {activeTab === 'sms' && (
        <SMSTestPanel phcId={phcId} stock={stock} updateStock={useAppStore.getState().updateStock} />
      )}
    </div>
  );
}

function SMSTestPanel({ phcId, stock, updateStock }) {
  const [msg, setMsg] = useState('STOCK PARA 200');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    await new Promise(r => setTimeout(r, 1000)); // simulate API
    
    // Simulate Gemini/Parser parsing logic
    let medMatch = null;
    let qtyMatch = msg.match(/\d+/);
    let parsedMedName = '';
    
    if (msg.toUpperCase().includes('PARA')) {
      medMatch = stock.find(s => s.medicineName.includes('Paracetamol'));
      parsedMedName = 'Paracetamol';
    } else if (msg.toUpperCase().includes('AMOX')) {
      medMatch = stock.find(s => s.medicineName.includes('Amoxicillin'));
      parsedMedName = 'Amoxicillin';
    } else if (msg.toUpperCase().includes('ORS')) {
      medMatch = stock.find(s => s.medicineName.includes('ORS'));
      parsedMedName = 'ORS';
    }

    if (medMatch && qtyMatch) {
      updateStock(phcId, medMatch.medicineId, parseInt(qtyMatch[0]));
      setResponse(`Twilio Reply: "Success: Logged ${qtyMatch[0]} units for ${medMatch.medicineName}."`);
      toast.success('Stock updated via SMS logic');
    } else {
      setResponse(`Twilio Reply: "Could not parse medicine/quantity. Try 'STOCK [MED] [QTY]'. Fallback to Gemini... Gemini says: Please specify medicine name and quantity clearly."`);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(34,197,94,0.05), rgba(16,185,129,0.05))',
        border: '1px solid rgba(34,197,94,0.2)',
        marginBottom: '1rem',
      }}>
        <h3 style={{ margin: '0 0 0.25rem' }}>📱 SMS / WhatsApp Fallback</h3>
        <p style={{ margin: 0, fontSize: '0.8rem' }}>
          For PHCs with no internet. Staff send an SMS to a shortcode. 
          Cloud Functions parses it (falling back to Gemini for free-text) and updates Firestore.
        </p>
      </div>

      <div className="card">
        <label className="label">Send an SMS (Simulation)</label>
        <div className="flex gap-2" style={{ marginBottom: '1rem' }}>
          <input 
            className="input" 
            style={{ flex: 1, fontFamily: 'monospace' }} 
            value={msg} 
            onChange={e => setMsg(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button className="btn btn-primary" onClick={handleSend} disabled={loading || !msg}>
            {loading ? 'Sending...' : 'Send SMS'}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-sm btn-secondary" onClick={() => setMsg('STOCK PARA 200')}>STOCK PARA 200</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setMsg('STOCK AMOX 50')}>STOCK AMOX 50</button>
          <button className="btn btn-sm btn-secondary" onClick={() => setMsg('We got 100 packets of ORS today')}>Free text (Gemini fallback)</button>
        </div>

        {response && (
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            color: response.includes('Success') ? 'var(--color-success)' : 'var(--color-warning)',
          }}>
            &gt; {response}
          </div>
        )}
      </div>
    </div>
  );
}
