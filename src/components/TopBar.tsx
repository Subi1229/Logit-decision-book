import { type Theme } from '../hooks/useTheme';
import { SunIcon, MoonIcon, MonitorIcon, SettingsIcon as SettingsIconShared } from './Icons';

interface TopBarProps {
  theme: Theme;
  onCycleTheme: () => void;
  onNewEntry: () => void;
  onOpenSettings: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  isMobile: boolean;
}

function ThemeIcon({ theme }: { theme: Theme }) {
  if (theme === 'light') return <SunIcon size={16} />;
  if (theme === 'dark')  return <MoonIcon size={16} />;
  return <MonitorIcon size={16} />;
}

const iconBtn: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 32, borderRadius: 6,
  background: 'transparent', border: '1px solid var(--border)',
  color: 'var(--secondary)', cursor: 'pointer', flexShrink: 0,
};

export function TopBar({
  theme, onCycleTheme, onNewEntry, onOpenSettings,
  searchQuery, onSearchChange, searchRef, isMobile,
}: TopBarProps) {
  const active = searchQuery.length > 0;

  return (
    <header style={{
      borderBottom: '1px solid var(--border)',
      backgroundColor: 'var(--surface)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{
        maxWidth: 960, margin: '0 auto',
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 16px', height: 48,
      }}>
        {/* Wordmark */}
        <span style={{
          fontFamily: 'var(--font-serif)', fontSize: 18, color: 'var(--text)',
          letterSpacing: '-0.02em', userSelect: 'none', flexShrink: 0,
        }}>
          Logit<span style={{ color: 'var(--accent)' }}>.</span>
        </span>

        {/* Search input */}
        <div style={{ flex: 1, maxWidth: isMobile ? undefined : 320 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px',
            height: 32, borderRadius: 6,
            background: active ? 'var(--surface)' : 'var(--bg)',
            border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
            transition: 'border-color 0.15s',
          }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0, color: active ? 'var(--accent)' : 'var(--muted)' }}>
              <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
              <path d="M8.5 8.5L11.5 11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Search entries…"
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text)',
                minWidth: 0,
              }}
            />
            {active ? (
              <button
                onClick={() => onSearchChange('')}
                style={{
                  background: 'var(--border)', border: 'none', borderRadius: '50%',
                  width: 16, height: 16, cursor: 'pointer', flexShrink: 0,
                  color: 'var(--secondary)', fontSize: 11, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >×</button>
            ) : (
              !isMobile && (
                <span style={{
                  background: 'var(--border)', color: 'var(--secondary)', borderRadius: 4,
                  padding: '0 4px', fontSize: 11, lineHeight: '18px', flexShrink: 0,
                }}>⌘K</span>
              )
            )}
          </div>
        </div>

        {!isMobile && <div style={{ flex: 1 }} />}

        {/* New entry — hide on mobile (FAB used instead) */}
        {!isMobile && (
          <button onClick={onNewEntry} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 12px', height: 32, borderRadius: 6,
            background: 'var(--accent)', color: '#fff', border: 'none',
            fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
            letterSpacing: '-0.01em', cursor: 'pointer', flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            New entry
          </button>
        )}

        <button onClick={onCycleTheme} title={`Theme: ${theme}`} style={iconBtn}>
          <ThemeIcon theme={theme} />
        </button>
        <button onClick={onOpenSettings} title="Settings" style={iconBtn}>
          <SettingsIconShared size={16} />
        </button>
      </div>
    </header>
  );
}
