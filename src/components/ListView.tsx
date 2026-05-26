import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Entry } from '../db/database';
import { groupEntries } from '../lib/dates';
import { searchEntries } from '../lib/search';
import { LeftRail } from './LeftRail';
import { EntryRow } from './EntryRow';

interface Props {
  entries: Entry[];
  onOpen: (id: string) => void;
  searchQuery: string;
  isMobile: boolean;
  onLongPressEntry?: (entry: Entry) => void;
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px 3px 10px', borderRadius: 20,
      background: 'var(--surface)', border: '1px solid var(--border)',
      fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--secondary)',
    }}>
      {label}
      <button onClick={onRemove} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 14, height: 14, borderRadius: '50%', border: 'none',
        background: 'var(--border)', color: 'var(--secondary)',
        cursor: 'pointer', padding: 0, fontSize: 10, lineHeight: 1,
      }}>×</button>
    </span>
  );
}

export function ListView({ entries, onOpen, searchQuery, isMobile, onLongPressEntry }: Props) {
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [activeType, setActiveType]       = useState<Entry['type'] | null>(null);
  const [focusedIndex, setFocusedIndex]   = useState<number>(-1);
  const containerRef                      = useRef<HTMLDivElement>(null);
  const isSearching                       = searchQuery.trim().length > 0;

  /* Search takes priority over filters */
  const displayed: Entry[] = useMemo(() => {
    if (isSearching) return searchEntries(entries, searchQuery);
    return entries.filter(e => {
      if (activeProject && e.project !== activeProject) return false;
      if (activeType    && e.type    !== activeType)    return false;
      return true;
    });
  }, [entries, searchQuery, isSearching, activeProject, activeType]);

  const groups = useMemo(
    () => isSearching
      ? [{ label: `${displayed.length} result${displayed.length !== 1 ? 's' : ''}`, items: displayed }]
      : groupEntries(displayed),
    [displayed, isSearching],
  );

  const flatEntries = useMemo(() => groups.flatMap(g => g.items), [groups]);

  const clearAll = useCallback(() => { setActiveProject(null); setActiveType(null); }, []);
  const hasFilters = activeProject !== null || activeType !== null;

  /* Keyboard nav */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowDown') { e.preventDefault(); setFocusedIndex(i => Math.min(i + 1, flatEntries.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setFocusedIndex(i => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter' && focusedIndex >= 0) { const en = flatEntries[focusedIndex]; if (en) onOpen(en.id); }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flatEntries, focusedIndex, onOpen]);

  useEffect(() => {
    if (focusedIndex < 0) return;
    const rows = containerRef.current?.querySelectorAll('[data-entry-row]');
    if (rows?.[focusedIndex]) (rows[focusedIndex] as HTMLElement).scrollIntoView({ block: 'nearest' });
  }, [focusedIndex]);

  /* Reset focus when results change */
  useEffect(() => { setFocusedIndex(-1); }, [searchQuery, activeProject, activeType]);

  const dividerStyle: React.CSSProperties = {
    fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
    letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--muted)',
    padding: '20px 14px 6px',
    borderBottom: isSearching ? 'none' : '1px solid var(--border)',
    marginBottom: 4,
  };

  const mainList = (
    <div style={{ flex: 1, minWidth: 0 }} ref={containerRef}>
      {/* Mobile filters inline */}
      {isMobile && (
        <LeftRail
          entries={entries}
          activeProject={activeProject}
          activeType={activeType}
          onProjectClick={setActiveProject}
          onTypeClick={setActiveType}
          isMobile
        />
      )}

      {/* Filter bar (desktop) */}
      {!isSearching && hasFilters && !isMobile && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--muted)' }}>
            {displayed.length} {displayed.length === 1 ? 'entry' : 'entries'}
          </span>
          {activeProject && <FilterChip label={activeProject} onRemove={() => setActiveProject(null)} />}
          {activeType    && <FilterChip label={activeType}    onRemove={() => setActiveType(null)} />}
          <button onClick={clearAll} style={{
            background: 'none', border: 'none', fontFamily: 'var(--font-sans)',
            fontSize: 12, color: 'var(--accent)', cursor: 'pointer', padding: 0, marginLeft: 2,
          }}>Clear all</button>
        </div>
      )}

      {displayed.length === 0 ? (
        <div style={{ padding: '48px 14px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--muted)' }}>
          {isSearching ? `No results for "${searchQuery}".` : 'No entries match the current filters.'}
        </div>
      ) : (
        groups.map(group => {
          let offset = 0;
          for (const g of groups) { if (g.label === group.label) break; offset += g.items.length; }
          return (
            <div key={group.label}>
              <div style={dividerStyle}>{group.label}</div>
              {group.items.map((entry, i) => (
                <div key={entry.id} data-entry-row="">
                  <EntryRow
                    entry={entry}
                    focused={focusedIndex === offset + i}
                    onOpen={() => onOpen(entry.id)}
                    onFocus={() => setFocusedIndex(offset + i)}
                    isMobile={isMobile}
                    onLongPress={onLongPressEntry ? () => onLongPressEntry(entry) : undefined}
                  />
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );

  if (isMobile) return mainList;

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
      <LeftRail
        entries={entries}
        activeProject={activeProject}
        activeType={activeType}
        onProjectClick={setActiveProject}
        onTypeClick={setActiveType}
        isMobile={false}
      />
      {mainList}
    </div>
  );
}
