import { useAppStore } from '../store/appStore';

const ROLES = [
  {
    id: 'officer',
    label: 'District Health Officer',
    icon: '🏛️',
    description: 'Full district dashboard, AI alerts, redistribution management',
    color: 'var(--color-primary)',
    user: 'Dr. Priya Sharma',
  },
  {
    id: 'staff',
    label: 'PHC Staff (ANM/Pharmacist)',
    icon: '🏥',
    description: 'Voice/photo stock entry, daily data logging, bed updates',
    color: 'var(--color-success)',
    user: 'ANM Kavita Devi',
  },
  {
    id: 'citizen',
    label: 'Citizen',
    icon: '👤',
    description: 'Find medicine availability at nearest PHC before travelling',
    color: 'var(--color-purple)',
    user: 'Ramesh Patil',
  },
];

export default function LoginPage() {
  const { login } = useAppStore();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'var(--color-bg)',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed',
        top: '30%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600,
        height: 400,
        background: 'radial-gradient(ellipse, rgba(14,165,233,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: 520, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: 70, height: 70,
            background: 'linear-gradient(135deg, var(--color-primary), var(--color-indigo))',
            borderRadius: 'var(--radius-xl)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2rem',
            margin: '0 auto 1rem',
            boxShadow: '0 0 40px rgba(14,165,233,0.3), 0 0 80px rgba(14,165,233,0.1)',
          }}>
            ⚕
          </div>
          <h1 style={{ marginBottom: '0.25rem', background: 'linear-gradient(135deg, var(--color-accent), var(--color-purple))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Swasthya Setu
          </h1>
          <p style={{ margin: 0 }}>AI-Powered District Health Command Center</p>
          <div style={{
            display: 'inline-flex',
            gap: '0.5rem',
            marginTop: '0.75rem',
            padding: '0.35rem 0.875rem',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.72rem',
            color: 'var(--color-text-dim)',
          }}>
            <span>🏥 Pune District</span>
            <span>·</span>
            <span>5 PHCs</span>
            <span>·</span>
            <span>94,000 citizens</span>
          </div>
        </div>

        {/* Role cards */}
        <div className="flex-col gap-3" style={{ display: 'flex', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>
            Select your role to continue
          </div>
          {ROLES.map((role) => (
            <button
              key={role.id}
              id={`login-${role.id}`}
              onClick={() => login(role.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '1.25rem 1.5rem',
                background: 'var(--color-surface)',
                border: `1px solid ${role.color}30`,
                borderRadius: 'var(--radius-lg)',
                cursor: 'pointer',
                transition: 'var(--transition)',
                textAlign: 'left',
                width: '100%',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = role.color;
                e.currentTarget.style.boxShadow = `0 0 20px ${role.color}20`;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = role.color + '30';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{
                width: 50, height: 50,
                borderRadius: 'var(--radius-md)',
                background: role.color + '15',
                border: `1px solid ${role.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', flexShrink: 0,
              }}>
                {role.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: role.color, marginBottom: '0.15rem' }}>
                  {role.label}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-dim)' }}>
                  {role.description}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-dim)', marginTop: '0.2rem' }}>
                  Demo: {role.user}
                </div>
              </div>
              <span style={{ color: 'var(--color-text-dim)', fontSize: '1.2rem' }}>›</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--color-text-dim)' }}>
          Built for{' '}
          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Build with AI: Code for Communities</span>
          {' '}· AI-Driven Health Center & Supply Chain Track
        </div>
      </div>
    </div>
  );
}
