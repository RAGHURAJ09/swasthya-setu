import { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAppStore } from './store/appStore';

// Pages
import LoginPage         from './pages/LoginPage';
import DistrictDashboard from './pages/DistrictDashboard';
import AlertsPage        from './pages/AlertsPage';
import PHCsPage          from './pages/PHCsPage';
import StaffDashboard    from './pages/StaffDashboard';
import CitizenView       from './pages/CitizenView';
import RedistributionPage from './pages/RedistributionPage';

// Components
import Sidebar from './components/Sidebar';

// Default page by role
const DEFAULT_PAGE = {
  officer: 'dashboard',
  staff:   'staff-dashboard',
  citizen: 'medicine-search',
};

function OfficerRouter({ page, onNavigate }) {
  switch (page) {
    case 'dashboard':      return <DistrictDashboard onNavigate={onNavigate} />;
    case 'alerts':         return <AlertsPage />;
    case 'phcs':           return <PHCsPage onNavigate={onNavigate} />;
    case 'redistribution': return <RedistributionPage />;
    case 'map':            return <DistrictDashboard onNavigate={onNavigate} />;
    case 'phc-scores':     return <PHCsPage onNavigate={onNavigate} />;
    case 'stock':          return <PHCsPage onNavigate={onNavigate} />;
    case 'beds':           return <DistrictDashboard onNavigate={onNavigate} />;
    case 'staff':          return <DistrictDashboard onNavigate={onNavigate} />;
    default:               return <DistrictDashboard onNavigate={onNavigate} />;
  }
}

function StaffRouter({ page }) {
  return <StaffDashboard />;
}

function CitizenRouter({ page }) {
  return <CitizenView />;
}

export default function App() {
  const { currentUser, currentRole, sidebarCollapsed } = useAppStore();
  const [activePage, setActivePage] = useState(null);

  // Not logged in → show login
  if (!currentUser) return (
    <>
      <LoginPage />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface-2)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
          },
        }}
      />
    </>
  );

  const page = activePage || DEFAULT_PAGE[currentRole] || 'dashboard';

  const handleNavigate = (pageId, data) => {
    setActivePage(pageId);
  };

  return (
    <div className="app-layout">
      <Sidebar activePage={page} onNavigate={setActivePage} />

      <main className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Top bar */}
        <div className="page-header">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Swasthya Setu
            </div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text)' }}>
              {currentRole === 'officer' ? '🏛️ District Health Officer' :
               currentRole === 'staff'   ? '🏥 PHC Staff Portal' :
               '👤 Citizen Services'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: 'auto' }}>
            {/* Connectivity indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.65rem',
              background: 'var(--color-success-bg)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem',
              color: 'var(--color-success)',
              fontWeight: 600,
            }}>
              <span className="pulse-dot success" style={{ width: 6, height: 6 }} />
              Connected
            </div>

            {/* District tag */}
            <div style={{
              padding: '0.3rem 0.65rem',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem',
              color: 'var(--color-text-dim)',
            }}>
              📍 Pune District
            </div>

            {/* Date */}
            <div style={{
              padding: '0.3rem 0.65rem',
              background: 'var(--color-surface-2)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.7rem',
              color: 'var(--color-text-dim)',
            }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Page content */}
        {currentRole === 'officer' && <OfficerRouter page={page} onNavigate={handleNavigate} />}
        {currentRole === 'staff'   && <StaffRouter   page={page} />}
        {currentRole === 'citizen' && <CitizenRouter  page={page} />}
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--color-surface-2)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem',
          },
        }}
      />
    </div>
  );
}
