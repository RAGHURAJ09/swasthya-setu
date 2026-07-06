import { useAppStore } from '../store/appStore';

const LANG_LABELS = { en: 'EN', hi: 'हि', mr: 'मर' };

export default function LanguageToggle() {
  const { language, setLanguage } = useAppStore();
  return (
    <div className="flex gap-1" style={{ background: 'var(--color-surface-2)', borderRadius: 'var(--radius-md)', padding: '3px' }}>
      {Object.entries(LANG_LABELS).map(([code, label]) => (
        <button
          key={code}
          onClick={() => setLanguage(code)}
          className={`tab-btn ${language === code ? 'active' : ''}`}
          style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', minWidth: 36 }}
          title={{ en: 'English', hi: 'Hindi', mr: 'Marathi' }[code]}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
