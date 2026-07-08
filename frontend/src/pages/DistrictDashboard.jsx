import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import AlertFeed from '../components/AlertFeed';
import DistrictMap from '../components/DistrictMap';
import RedistributionCard from '../components/RedistributionCard';
import PHCHealthScoreRing from '../components/PHCHealthScoreRing';
import FlaggedFacilitiesList from '../components/FlaggedFacilitiesList';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { FOOTFALL_TREND, PHC_HEALTH_SCORES_TREND } from '../data/seedData';
import { getHealthScoreColor, getBedUtilColor } from '../utils/helpers';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-surface-2)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      padding: '0.65rem 0.875rem',
      fontSize: '0.8rem',
    }}>
      <div style={{ color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, fontWeight: 600 }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

export default function DistrictDashboard({ onNavigate }) {
  const {
    district, phcs, alerts, bedsData, staffData, footfallData,
    redistributionSuggestions, setSelectedPhc,
  } = useAppStore();

  const [selectedTab, setSelectedTab] = useState('overview');

  // Aggregate stats
  const criticalAlerts = alerts.filter((a) => !a.resolved && a.severity === 'critical').length;
  const warningAlerts  = alerts.filter((a) => !a.resolved && a.severity === 'warning').length;
  const totalPatients  = Object.values(footfallData).reduce((s, f) => s + f.today, 0);
  const totalBeds      = Object.values(bedsData).reduce((s, b) => s + b.totalBeds, 0);
  const occupiedBeds   = Object.values(bedsData).reduce((s, b) => s + b.occupiedBeds, 0);
  const avgBedUtil     = Math.round((occupiedBeds / totalBeds) * 100);
  const avgScore       = Math.round(phcs.reduce((s, p) => s + p.healthScore, 0) / phcs.length);
  const presentStaff   = Object.values(staffData).reduce((s, d) => s + d.presentToday, 0);
  const totalStaff     = Object.values(staffData).reduce((s, d) => s + d.totalStaff, 0);
  const avgAttendance  = Math.round((presentStaff / totalStaff) * 100);

  const handleMapSelectPHC = (phcId) => {
    setSelectedPhc(phcId);
    onNavigate?.('phc-detail', phcId);
  };

  const STAT_CARDS = [
    {
      label: 'Active PHCs',
      value: phcs.length,
      icon: '🏥',
      accent: 'var(--color-primary)',
      sub: `${district.name}`,
    },
    {
      label: 'Critical Alerts',
      value: criticalAlerts,
      icon: '🚨',
      accent: 'var(--color-critical)',
      sub: `${warningAlerts} warnings`,
    },
    {
      label: 'Patients Today',
      value: totalPatients,
      icon: '👥',
      accent: 'var(--color-indigo)',
      sub: `Across all PHCs`,
    },
    {
      label: 'Bed Utilisation',
      value: `${avgBedUtil}%`,
      icon: '🛏',
      accent: getBedUtilColor(avgBedUtil),
      sub: `${occupiedBeds}/${totalBeds} beds`,
    },
    {
      label: 'Avg Health Score',
      value: avgScore,
      icon: '📊',
      accent: getHealthScoreColor(avgScore),
      sub: `/100 district avg`,
    },
    {
      label: 'Staff Present',
      value: `${avgAttendance}%`,
      icon: '👨‍⚕️',
      accent: avgAttendance >= 80 ? 'var(--color-success)' : 'var(--color-warning)',
      sub: `${presentStaff}/${totalStaff} staff`,
    },
  ];

  return (
    <div className="page-body">
      {/* Page title */}
      <div className="flex items-center gap-4">
        <div>
          <h1 style={{ marginBottom: '0.1rem' }}>District Health Command Center</h1>
          <p style={{ fontSize: '0.875rem', margin: 0 }}>
            {district.name} · Real-time AI monitoring across {phcs.length} PHCs
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {criticalAlerts > 0 && (
            <div className="badge badge-critical" style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}>
              <span className="pulse-dot critical" />
              {criticalAlerts} CRITICAL
            </div>
          )}
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-dim)',
            background: 'var(--color-surface-2)',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
          }}>
            🕐 Live · {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-3">
        {STAT_CARDS.map((s) => (
          <div
            key={s.label}
            className="stat-card"
            style={{ '--accent-color': s.accent }}
          >
            <div className="flex items-center gap-3">
              <div className="stat-icon" style={{ background: s.accent + '1a', fontSize: '1.1rem' }}>
                {s.icon}
              </div>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color: s.accent }}>{s.value}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: '0.25rem' }}>
              {s.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Map + Alert Feed */}
      <div className="grid-2-1" style={{ alignItems: 'start' }}>
        <div className="flex-col gap-4" style={{ display: 'flex' }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>
              <h3 style={{ margin: 0 }}>District Map</h3>
              <p style={{ fontSize: '0.75rem', margin: 0 }}>Click a PHC marker to drill down</p>
            </div>
            <DistrictMap onSelectPHC={handleMapSelectPHC} />
          </div>

          {/* Footfall trend */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>District-wide Patient Footfall — Last 7 Days</h3>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={FOOTFALL_TREND}>
                <defs>
                  <linearGradient id="footfallGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(56,139,200,0.1)" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="patients" name="Patients"
                  stroke="#0ea5e9" strokeWidth={2}
                  fill="url(#footfallGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right column: alerts */}
        <div className="flex-col gap-4" style={{ display: 'flex' }}>
          <div className="card">
            <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, flex: 1 }}>Live Alerts</h3>
              <div className="badge badge-critical">
                <span className="pulse-dot critical" />
                {criticalAlerts} Critical
              </div>
              <div className="badge badge-warning">{warningAlerts} Warning</div>
            </div>
            <AlertFeed limit={5} />
          </div>

          {/* PHC scores mini list */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>PHC Health Scores</h3>
            <div className="flex-col gap-3" style={{ display: 'flex' }}>
              {phcs
                .sort((a, b) => a.healthScore - b.healthScore)
                .map((phc) => (
                  <div
                    key={phc.id}
                    className="flex items-center gap-3"
                    style={{ cursor: 'pointer' }}
                    onClick={() => onNavigate?.('phc-detail', phc.id)}
                  >
                    <PHCHealthScoreRing score={phc.healthScore} size={50} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{phc.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)' }}>{phc.block} Block</div>
                    </div>
                    <div style={{
                      fontSize: '0.7rem',
                      color: getHealthScoreColor(phc.healthScore),
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}>
                      {phc.status}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Redistribution suggestions */}
      {redistributionSuggestions.filter((r) => !r.approved).length > 0 && (
        <div>
          <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
            <h2 style={{ margin: 0 }}>AI Redistribution Suggestions</h2>
            <div className="ai-chip">✦ Gemini + Distance Matrix</div>
          </div>
          <div className="grid-2">
            {redistributionSuggestions
              .filter((r) => !r.approved)
              .map((r) => (
                <RedistributionCard key={r.id} suggestion={r} />
              ))}
          </div>
        </div>
      )}

      {/* PHC Scores trend chart */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>PHC Health Score Trends — Last 4 Weeks</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={PHC_HEALTH_SCORES_TREND} barSize={12}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(56,139,200,0.08)" />
            <XAxis dataKey="week" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }} />
            <Bar dataKey="shirur"   name="Shirur"   fill="#10b981" radius={[3,3,0,0]} />
            <Bar dataKey="baramati" name="Baramati" fill="#f59e0b" radius={[3,3,0,0]} />
            <Bar dataKey="junnar"   name="Junnar"   fill="#ef4444" radius={[3,3,0,0]} />
            <Bar dataKey="bhor"     name="Bhor"     fill="#0ea5e9" radius={[3,3,0,0]} />
            <Bar dataKey="ambegaon" name="Ambegaon" fill="#a78bfa" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Module D/F: Flagged Facilities with Gemini Summaries */}
      <div>
        <div className="flex items-center gap-3" style={{ marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>AI-Flagged Facility Analysis</h2>
          <div className="ai-chip">✦ Module D · Gemini</div>
        </div>
        <FlaggedFacilitiesList onNavigate={onNavigate} />
      </div>
    </div>
  );
}
