import { type Entry } from '../db/database';

const TYPE_LABELS: Record<NonNullable<Entry['type']>, string> = {
  visual: 'Visual', interaction: 'Interaction', ia: 'IA',
  copy: 'Copy', technical: 'Technical', strategic: 'Strategic',
};

interface Props {
  entries: Entry[];
  activeProject: string | null;
  activeType: Entry['type'] | null;
  onProjectClick: (p: string | null) => void;
  onTypeClick: (t: Entry['type'] | null) => void;
  isMobile: boolean;
}

const sectionLabel: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
  letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)',
  padding: '0 10px', marginBottom: 2, marginTop: 20,
};

function railItem(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '4px 10px', borderRadius: 5,
    fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer',
    color: active ? 'var(--text)' : 'var(--secondary)',
    background: active ? 'var(--border)' : 'transparent',
    border: 'none', width: '100%', textAlign: 'left',
    transition: 'background 0.1s, color 0.1s',
  };
}

const nativeSelect: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--bg)', color: 'var(--text)',
  fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none',
  paddingRight: 28,
};

export function LeftRail({ entries, activeProject, activeType, onProjectClick, onTypeClick, isMobile }: Props) {
  const projectCounts = new Map<string, number>();
  for (const e of entries) {
    if (e.project) projectCounts.set(e.project, (projectCounts.get(e.project) ?? 0) + 1);
  }
  const projects = [...projectCounts.entries()].sort((a, b) => b[1] - a[1]);

  const typeCounts = new Map<string, number>();
  for (const e of entries) {
    if (e.type) typeCounts.set(e.type, (typeCounts.get(e.type) ?? 0) + 1);
  }

  /* ── Mobile: compact filter dropdowns ── */
  if (isMobile) {
    return (
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {/* Project dropdown */}
        {projects.length > 0 && (
          <div style={{ position: 'relative' }}>
            <select
              value={activeProject ?? ''}
              onChange={e => onProjectClick(e.target.value || null)}
              style={{
                ...nativeSelect,
                color: activeProject ? 'var(--accent)' : 'var(--muted)',
                borderColor: activeProject ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <option value="">All projects</option>
              {projects.map(([name]) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)' }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        {/* Type dropdown */}
        {typeCounts.size > 0 && (
          <div style={{ position: 'relative' }}>
            <select
              value={activeType ?? ''}
              onChange={e => onTypeClick((e.target.value as Entry['type']) || null)}
              style={{
                ...nativeSelect,
                color: activeType ? 'var(--accent)' : 'var(--muted)',
                borderColor: activeType ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <option value="">All types</option>
              {(Object.keys(TYPE_LABELS) as Array<NonNullable<Entry['type']>>)
                .filter(t => typeCounts.has(t))
                .map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted)' }}>
              <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
    );
  }

  /* ── Desktop: full rail ── */
  return (
    <aside style={{ width: 240, flexShrink: 0, paddingTop: 4 }}>
      {projects.length > 0 && (
        <>
          <div style={sectionLabel}>Projects</div>
          {projects.map(([name, count]) => (
            <button
              key={name}
              style={railItem(activeProject === name)}
              onClick={() => onProjectClick(activeProject === name ? null : name)}
              onMouseEnter={e => { if (activeProject !== name) (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
              onMouseLeave={e => { if (activeProject !== name) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
              <span style={{ color: 'var(--muted)', fontSize: 11, flexShrink: 0, marginLeft: 6 }}>{count}</span>
            </button>
          ))}
        </>
      )}

      <div style={sectionLabel}>Decision type</div>
      {(Object.keys(TYPE_LABELS) as Array<NonNullable<Entry['type']>>)
        .filter(t => typeCounts.has(t))
        .map(t => (
          <button
            key={t}
            style={railItem(activeType === t)}
            onClick={() => onTypeClick(activeType === t ? null : t)}
            onMouseEnter={e => { if (activeType !== t) (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
            onMouseLeave={e => { if (activeType !== t) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <span>{TYPE_LABELS[t]}</span>
            <span style={{ color: 'var(--muted)', fontSize: 11, flexShrink: 0, marginLeft: 6 }}>{typeCounts.get(t)}</span>
          </button>
        ))}
    </aside>
  );
}
