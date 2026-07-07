import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import PHCHealthScoreRing from '../components/PHCHealthScoreRing';
import ForecastPanel from '../components/ForecastPanel';
import StaffAttendanceCalendar from '../components/StaffAttendanceCalendar';
import { getDaysColor, getBedUtilColor, getHealthScoreColor } from '../utils/helpers';
import { getPHCHealthScoreExplanation } from '../services/geminiService';

export default function PHCsPage({ onNavigate }) {
  const { phcs, stockData, bedsData, staffData, footfallData, alerts } = useAppStore();
  const [selectedPHC, setSelectedPHC] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const handleViewPHC = async (phc) => {
    setSelectedPHC(phc);
    setAiExplanation(null);
    if (phc.healthScore < 70) {
      setLoadingAI(true);
      const beds = bedsData[phc.id];
      const staff = staffData[phc.id];
      const phcAlerts = alerts.filter((a) => a.phcId === phc.id && !a.resolved);
      const exp = await getPHCHealthScoreExplanation(
        phc.name, phc.healthScore,
        phcAlerts.filter((a) => a.type === 'stockout').length,
        staff?.attendanceRate || 80,
        beds?.utilization || 60,
      );
      setAiExplanation(exp);
      setLoadingAI(false);
    }
  };

  return (
    <div className="page-body">
      <div>
        <h1>All PHCs</h1>
        <p>Manage and monitor all Primary Health Centres in the district</p>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        {/* PHC list */}
        <div className="flex-col gap-3" style={{ display: 'flex' }}>
          {phcs.map((phc) => {
            const beds  = bedsData[phc.id];
            const staff = staffData[phc.id];
            const foot  = footfallData[phc.id];
            const phcAlerts = alerts.filter((a) => a.phcId === phc.id && !a.resolved);
            const isSelected = selectedPHC?.id === phc.id;

            return (
              <div
                key={phc.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  border: isSelected ? '1px solid var(--color-primary)' : undefined,
                  boxShadow: isSelected ? 'var(--shadow-glow)' : undefined,
                }}
                onClick={() => handleViewPHC(phc)}
              >
                <div className="flex items-center gap-3" style={{ marginBottom: '0.75rem' }}>
                  <PHCHealthScoreRing score={phc.healthScore} size={56} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{phc.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>
                      Block {phc.block} · {phc.lat.toFixed(3)}°N, {phc.lng.toFixed(3)}°E
                    </div>
                  </div>
                  {phcAlerts.length > 0 && (
                    <div className={`badge badge-${phcAlerts.some((a) => a.severity === 'critical') ? 'critical' : 'warning'}`}>
                      {phcAlerts.length} alert{phcAlerts.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                  {[
                    { label: 'Beds', value: `${beds?.utilization || 0}%`, color: getBedUtilColor(beds?.utilization || 0), icon: '🛏' },
                    { label: 'Staff', value: `${staff?.attendanceRate?.toFixed(0) || 0}%`, color: staff?.attendanceRate >= 80 ? 'var(--color-success)' : 'var(--color-warning)', icon: '👥' },
                    { label: 'Patients', value: foot?.today || 0, color: 'var(--color-primary)', icon: '🏃' },
                    { label: 'Capacity', value: phc.bedCapacity, color: 'var(--color-text-muted)', icon: '🏥' },
                  ].map((stat) => (
                    <div key={stat.label} style={{
                      background: 'var(--color-surface-2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.5rem',
                      textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '0.75rem' }}>{stat.icon}</div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: stat.color }}>{stat.value}</div>
                      <div style={{ fontSize: '0.6rem', color: 'var(--color-text-dim)', textTransform: 'uppercase' }}>{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        {selectedPHC ? (
          <div className="flex-col gap-4" style={{ display: 'flex' }}>
            <div className="card">
              <div className="flex items-center gap-3" style={{ marginBottom: '1.25rem' }}>
                <PHCHealthScoreRing score={selectedPHC.healthScore} size={70} />
                <div>
                  <h2 style={{ margin: 0 }}>{selectedPHC.name}</h2>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>Block {selectedPHC.block}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                    <span className={`badge badge-${selectedPHC.status === 'good' ? 'success' : selectedPHC.status}`}>
                      {selectedPHC.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              {/* AI explanation for poor-scoring PHC */}
              {selectedPHC.healthScore < 70 && (
                <div className="ai-response-box" style={{ marginBottom: '1rem' }}>
                  {loadingAI ? (
                    <div className="flex items-center gap-2">
                      <div className="spinner" />
                      <span style={{ fontSize: '0.85rem', color: 'var(--color-text-dim)' }}>Gemini analyzing…</span>
                    </div>
                  ) : (
                    aiExplanation
                  )}
                </div>
              )}

              {/* Stock table */}
              <h4 style={{ marginBottom: '0.75rem' }}>Medicine Stock</h4>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th>Current Qty</th>
                      <th>Reorder At</th>
                      <th>Days Left</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stockData[selectedPHC.id] || []).map((item) => (
                      <tr key={item.medicineId}>
                        <td style={{ fontWeight: 500 }}>{item.medicineName}</td>
                        <td>{item.currentQty} {item.unit}</td>
                        <td style={{ color: 'var(--color-text-dim)' }}>{item.reorderThreshold}</td>
                        <td style={{ fontWeight: 700, color: getDaysColor(item.daysUntilStockout) }}>
                          {item.daysUntilStockout < 1
                            ? `${Math.round(item.daysUntilStockout * 24)}h`
                            : `${item.daysUntilStockout.toFixed(1)}d`}
                        </td>
                        <td>
                          <span className={`badge badge-${item.daysUntilStockout < 3 ? 'critical' : item.daysUntilStockout < 7 ? 'warning' : 'success'}`}>
                            {item.daysUntilStockout < 3 ? '🔴 Critical' : item.daysUntilStockout < 7 ? '🟡 Low' : '🟢 OK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2" style={{ marginTop: '1rem' }}>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => onNavigate?.('phc-detail', selectedPHC.id)}
                >
                  View Full Detail →
                </button>
              </div>
            </div>

            {/* Module B: Forecast Panel */}
            <ForecastPanel
              facilityId={selectedPHC.id}
              stockItems={stockData[selectedPHC.id]}
              facilityName={selectedPHC.name}
            />

            {/* Module F: Staff Attendance Calendar */}
            <StaffAttendanceCalendar
              facilityId={selectedPHC.id}
              staffData={staffData[selectedPHC.id]}
            />
          </div>
        ) : (
          <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-dim)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏥</div>
            <h3>Select a PHC</h3>
            <p>Click on any PHC card to view details, stock data, and AI analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}
