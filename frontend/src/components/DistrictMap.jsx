import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { useAppStore } from '../store/appStore';
import { getHealthScoreColor } from '../utils/helpers';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet icon issues with Vite
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;

const SEVERITY_RADIUS = { critical: 14, warning: 10, good: 8 };

function FlyToSelectedPHC({ selectedPhcId, phcs }) {
  const map = useMap();
  useEffect(() => {
    if (selectedPhcId) {
      const phc = phcs.find((p) => p.id === selectedPhcId);
      if (phc) map.flyTo([phc.lat, phc.lng], 11, { duration: 1.2 });
    }
  }, [selectedPhcId, phcs, map]);
  return null;
}

export default function DistrictMap({ onSelectPHC }) {
  const { phcs, alerts, selectedPhcId } = useAppStore();

  // Get worst alert status per PHC
  const phcStatus = {};
  for (const p of phcs) phcStatus[p.id] = p.status;
  for (const a of alerts.filter((al) => !al.resolved)) {
    if (a.severity === 'critical') phcStatus[a.phcId] = 'critical';
    else if (phcStatus[a.phcId] !== 'critical') phcStatus[a.phcId] = 'warning';
  }

  const center = [18.52, 73.85]; // Pune district center

  return (
    <div className="map-container" style={{ height: '420px' }}>
      <MapContainer
        center={center}
        zoom={9}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FlyToSelectedPHC selectedPhcId={selectedPhcId} phcs={phcs} />
        {phcs.map((phc) => {
          const status = phcStatus[phc.id];
          const color =
            status === 'critical' ? '#ef4444' :
            status === 'warning'  ? '#f59e0b' :
            '#10b981';
          const radius = SEVERITY_RADIUS[status] || 8;

          return (
            <CircleMarker
              key={phc.id}
              center={[phc.lat, phc.lng]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.85,
                color: color,
                weight: selectedPhcId === phc.id ? 3 : 1.5,
                opacity: 1,
              }}
              eventHandlers={{ click: () => onSelectPHC?.(phc.id) }}
            >
              <Popup>
                <div style={{ fontFamily: 'Inter, sans-serif', minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 4 }}>{phc.name}</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 6 }}>Block: {phc.block}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ background: '#f1f5f9', borderRadius: 4, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600 }}>
                      🛏 {phc.bedCapacity} beds
                    </span>
                    <span style={{ background: '#f1f5f9', borderRadius: 4, padding: '2px 8px', fontSize: '0.7rem', fontWeight: 600 }}>
                      👥 {phc.staffCount} staff
                    </span>
                  </div>
                  <div style={{
                    marginTop: 8,
                    padding: '4px 8px',
                    background: color + '22',
                    borderRadius: 4,
                    color,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}>
                    Health Score: {phc.healthScore}/100
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: 12, right: 12,
        background: 'rgba(13,31,53,0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.6rem 0.875rem',
        zIndex: 1000,
        fontSize: '0.72rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
      }}>
        {[
          { color: '#ef4444', label: 'Critical' },
          { color: '#f59e0b', label: 'Warning' },
          { color: '#10b981', label: 'Good' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
