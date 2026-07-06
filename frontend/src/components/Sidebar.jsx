import { useAppStore } from '../store/appStore';
import LanguageToggle from './LanguageToggle';

const NAV_ITEMS = {
  officer: [
    { id: 'dashboard',       label: 'District Dashboard', icon: '🏥', section: 'OVERVIEW' },
    { id: 'alerts',          label: 'Alert Feed',         icon: '🚨', section: 'OVERVIEW', badge: 'critical' },
    { id: 'map',             label: 'District Map',       icon: '🗺️', section: 'OVERVIEW' },
    { id: 'redistribution',  label: 'Redistribution',     icon: '📦', section: 'AI TOOLS' },
    { id: 'phc-scores',      label: 'PHC Health Scores',  icon: '📊', section: 'AI TOOLS' },
    { id: 'phcs',            label: 'All PHCs',           icon: '🏢', section: 'DATA' },
    { id: 'stock',           label: 'Stock Overview',     icon: '💊', section: 'DATA' },
    { id: 'beds',            label: 'Beds & Capacity',    icon: '🛏',  section: 'DATA' },
    { id: 'staff',           label: 'Staff Attendance',   icon: '👥',  section: 'DATA' },
  ],
  staff: [
    { id: 'staff-dashboard', label: 'My PHC Dashboard',  icon: '🏥',  section: 'OVERVIEW' },
    { id: 'stock-entry',     label: 'Stock Update',       icon: '💊',  section: 'DATA ENTRY' },
    { id: 'voice-entry',     label: 'Voice Entry',        icon: '🎙️',  section: 'DATA ENTRY' },
    { id: 'photo-verify',    label: 'Photo Verification', icon: '📷',  section: 'DATA ENTRY' },
    { id: 'bed-entry',       label: 'Bed Update',         icon: '🛏',   section: 'DATA ENTRY' },
    { id: 'attendance',      label: 'Attendance',         icon: '✅',   section: 'DATA ENTRY' },
  ],
  citizen: [
    { id: 'medicine-search', label: 'Find Medicines',     icon: '🔍',  section: 'CITIZEN' },
    { id: 'nearest-phc',     label: 'Nearest PHC',        icon: '📍',  section: 'CITIZEN' },
  ],
};

export default function Sidebar({ activePage, onNavigate }) {
  const { currentUser, currentRole, logout, alerts, sidebarCollapsed, toggleSidebar } = useAppStore();
  const criticalCount = alerts.filter((a) => !a.resolved && a.severity === 'critical').length;

  const navItems = NAV_ITEMS[currentRole] || [];

  // Group by section
  const sections = [];
  const seenSections = new Set();
  for (const item of navItems) {
    if (!seenSections.has(item.section)) {
      seenSections.add(item.section);
      sections.push(item.section);
    }
  }

  return (
    <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Logo */}
      <div style={{
        padding: '1.25rem 1rem',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        <div style={{
          width: 38, height: 38,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-indigo))',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.2rem', flexShrink: 0,
          boxShadow: '0 0 20px rgba(14,165,233,0.3)',
        }}>⚕</div>
        {!sidebarCollapsed && (
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
              Swasthya Setu
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', letterSpacing: '0.05em' }}>
              DISTRICT HEALTH AI
            </div>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--color-text-dim)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            padding: '0.2rem',
          }}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.5rem 0', overflowY: 'auto' }}>
        {sections.map((section) => (
          <div key={section}>
            {!sidebarCollapsed && (
              <div className="nav-section-label">{section}</div>
            )}
            {navItems.filter((i) => i.section === section).map((item) => {
              const badgeCount = item.badge === 'critical' ? criticalCount : 0;
              return (
                <button
                  key={item.id}
                  className={`nav-link ${activePage === item.id ? 'active' : ''}`}
                  onClick={() => onNavigate(item.id)}
                  title={sidebarCollapsed ? item.label : undefined}
                  style={{ justifyContent: sidebarCollapsed ? 'center' : undefined }}
                >
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
                  {!sidebarCollapsed && (
                    <>
                      <span>{item.label}</span>
                      {badgeCount > 0 && (
                        <span className="nav-badge badge-critical nav-badge" style={{
                          background: 'var(--color-critical-bg)',
                          color: 'var(--color-critical)',
                          border: '1px solid rgba(239,68,68,0.3)',
                        }}>
                          {badgeCount}
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Language + User */}
      <div style={{
        borderTop: '1px solid var(--color-border)',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
      }}>
        {!sidebarCollapsed && <LanguageToggle />}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-indigo))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.8rem', fontWeight: 700, flexShrink: 0,
          }}>
            {currentUser?.name?.[0]}
          </div>
          {!sidebarCollapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser?.name}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {currentRole}
              </div>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={logout}
              style={{ background: 'none', border: 'none', color: 'var(--color-text-dim)', cursor: 'pointer', fontSize: '0.8rem' }}
              title="Log out"
            >
              ⏏
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
