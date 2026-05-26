import type { Entry } from '../db/database';
import { needsRevisitCheck } from '../lib/weeklyReview';

export type BrowseFilter = 'all' | 'today' | 'thisWeek' | 'lowConf' | 'revisit';

interface Props {
  entries: Entry[];
  browseFilter: BrowseFilter;
  activeProject: string | null;
  activeType: string | null;
  revisitThreshold: number;
  onBrowse: (f: BrowseFilter) => void;
  onProject: (p: string | null) => void;
  onType: (t: string | null) => void;
  onOpenSettings: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  visual: 'Visual', interaction: 'Interaction', ia: 'IA / Structure',
  copy: 'Copy', technical: 'Technical', strategic: 'Strategic',
};

const PROJECT_COLORS = [
  '#B4623F', '#6B7FD7', '#5EA37E', '#D4A853', '#9B6BB5',
  '#D05E8A', '#4FA8C5', '#7A8B3E',
];

function projectColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return PROJECT_COLORS[Math.abs(h) % PROJECT_COLORS.length];
}


function getThisMonday6am() {
  const now = new Date();
  const day = now.getDay();
  const daysBack = day === 0 ? 6 : day - 1;
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack, 6, 0, 0, 0).getTime();
}

const TODAY_START = new Date(new Date().setHours(0, 0, 0, 0)).getTime();

export function Sidebar({
  entries, browseFilter, activeProject, activeType,
  revisitThreshold, onBrowse, onProject, onType, onOpenSettings,
}: Props) {
  const thisMonday = getThisMonday6am();

  const counts = {
    all: entries.length,
    today: entries.filter(e => e.createdAt >= TODAY_START).length,
    thisWeek: entries.filter(e => e.createdAt >= thisMonday).length,
    lowConf: entries.filter(e => e.confidence != null && e.confidence <= 2).length,
    revisit: entries.filter(e => needsRevisitCheck(e, revisitThreshold)).length,
  };

  const projects = [...new Set(entries.map(e => e.project).filter(Boolean) as string[])].sort();
  const projectCounts = Object.fromEntries(
    projects.map(p => [p, entries.filter(e => e.project === p).length])
  );

  const types = [...new Set(entries.map(e => e.type).filter(Boolean) as string[])];
  const typeCounts = Object.fromEntries(
    types.map(t => [t, entries.filter(e => e.type === t).length])
  );

  const navItem = (label: string, count: number, active: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        width: '100%', padding: '6px 12px', borderRadius: 6,
        background: active ? 'var(--text)' : 'transparent',
        border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-sans)', fontSize: 13,
        color: active ? 'var(--bg)' : 'var(--secondary)',
        transition: 'background 0.12s, color 0.12s',
        textAlign: 'left',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--border)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 11, opacity: active ? 0.7 : 0.5, fontVariantNumeric: 'tabular-nums' }}>
        {count}
      </span>
    </button>
  );

  const sectionLabel = (text: string) => (
    <div style={{
      fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
      letterSpacing: '0.1em', color: 'var(--muted)', padding: '20px 12px 6px',
      textTransform: 'uppercase',
    }}>
      {text}
    </div>
  );

  return (
    <aside style={{
      width: 248, flexShrink: 0,
      height: '100vh', position: 'sticky', top: 0,
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--border)',
      background: 'var(--bg)',
      overflowY: 'auto',
    }}>
      {/* Wordmark — height matches top bar */}
      <div style={{
        padding: '0 20px', height: 56,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600,
          color: 'var(--text)', letterSpacing: '-0.02em', lineHeight: 1,
        }}>
          Logit<span style={{ color: 'var(--accent)' }}>•</span>
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 600,
          letterSpacing: '0.14em', color: 'var(--muted)', marginTop: 5,
          textTransform: 'uppercase',
        }}>
          A decision logbook
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 10px 24px' }}>
        {sectionLabel('Browse')}
        {navItem('All entries',    counts.all,     browseFilter === 'all'     && !activeProject && !activeType, () => { onBrowse('all'); onProject(null); onType(null); })}
        {navItem('Today',         counts.today,   browseFilter === 'today'   && !activeProject && !activeType, () => { onBrowse('today'); onProject(null); onType(null); })}
        {navItem('This week',     counts.thisWeek, browseFilter === 'thisWeek' && !activeProject && !activeType, () => { onBrowse('thisWeek'); onProject(null); onType(null); })}
        {navItem('Low confidence', counts.lowConf,  browseFilter === 'lowConf'  && !activeProject && !activeType, () => { onBrowse('lowConf'); onProject(null); onType(null); })}
        {navItem('To revisit',    counts.revisit, browseFilter === 'revisit' && !activeProject && !activeType, () => { onBrowse('revisit'); onProject(null); onType(null); })}

        {projects.length > 0 && (
          <>
            {sectionLabel('Projects')}
            {projects.map(p => (
              <button
                key={p}
                onClick={() => { onProject(activeProject === p ? null : p); onType(null); }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  width: '100%', padding: '6px 12px', borderRadius: 6,
                  background: activeProject === p ? 'var(--text)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: 13,
                  color: activeProject === p ? 'var(--bg)' : 'var(--secondary)',
                  transition: 'background 0.12s',
                  textAlign: 'left',
                }}
                onMouseEnter={e => { if (activeProject !== p) e.currentTarget.style.background = 'var(--border)'; }}
                onMouseLeave={e => { if (activeProject !== p) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: activeProject === p ? 'var(--bg)' : projectColor(p),
                  }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</span>
                </span>
                <span style={{ fontSize: 11, opacity: activeProject === p ? 0.7 : 0.5, marginLeft: 8, flexShrink: 0 }}>
                  {projectCounts[p]}
                </span>
              </button>
            ))}
          </>
        )}

        {types.length > 0 && (
          <>
            {sectionLabel('Types')}
            {types.map(t => navItem(
              TYPE_LABELS[t] ?? t,
              typeCounts[t],
              activeType === t,
              () => { onType(activeType === t ? null : t); onProject(null); },
            ))}
          </>
        )}
      </nav>

    </aside>
  );
}
