import { useEffect, useMemo, useRef, useState } from 'react';
import type { Entry } from '../db/database';
import type { BrowseFilter } from './Sidebar';
import { SunIcon, MoonIcon, MonitorIcon, SettingsIcon } from './Icons';
import { groupEntries, relativeTime, absoluteDate } from '../lib/dates';
import { searchEntries } from '../lib/search';
import { needsRevisitCheck, computeWeeklyStats } from '../lib/weeklyReview';
import { ConfidenceDots } from './ConfidenceDots';

interface Props {
  entries: Entry[];
  browseFilter: BrowseFilter;
  activeProject: string | null;
  activeType: string | null;
  revisitThreshold: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpen: (id: string) => void;
  onNewEntry: () => void;
  onOpenWeeklyReview: () => void;
  onCycleTheme: () => void;
  onOpenSettings: () => void;
  theme: string;
  onBrowse: (f: BrowseFilter) => void;
  onProject: (p: string | null) => void;
  onType: (t: string | null) => void;
}

const TODAY_START = new Date(new Date().setHours(0, 0, 0, 0)).getTime();

const TYPE_LABELS: Record<string, string> = {
  visual: 'Visual', interaction: 'Interaction', ia: 'IA / Structure',
  copy: 'Copy', technical: 'Technical', strategic: 'Strategic',
};

const PROJECT_COLORS = [
  '#B4623F','#6B7FD7','#5EA37E','#D4A853','#9B6BB5',
  '#D05E8A','#4FA8C5','#7A8B3E',
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

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Search dropdown ─────────────────────────────────────── */
function SearchDropdown({
  entries, searchQuery, onSearchChange, onOpen, inputRef,
}: {
  entries: Entry[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpen: (id: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!searchQuery.trim()) return entries.slice(0, 8);
    return searchEntries(entries, searchQuery).slice(0, 10);
  }, [entries, searchQuery]);

  useEffect(() => { setActiveIndex(0); }, [searchQuery]);

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const showDropdown = focused && results.length > 0;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[activeIndex]) { onOpen(results[activeIndex].id); setFocused(false); onSearchChange(''); } }
    else if (e.key === 'Escape') { setFocused(false); onSearchChange(''); inputRef.current?.blur(); }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, maxWidth: focused ? 480 : 340, transition: 'max-width 0.2s ease' }}>
      {/* Search icon */}
      <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: focused ? 'var(--accent)' : 'var(--muted)', pointerEvents: 'none', transition: 'color 0.15s' }}
        width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>

      <input
        ref={inputRef}
        value={searchQuery}
        onChange={e => onSearchChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search entries… ⌘K"
        style={{
          width: '100%', height: 34, paddingLeft: 32, paddingRight: searchQuery ? 28 : 10,
          background: focused ? '#fff' : 'var(--surface)',
          border: '1px solid',
          borderColor: focused ? 'var(--accent)' : 'var(--border)',
          borderRadius: showDropdown ? '8px 8px 0 0' : 8,
          outline: 'none',
          fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text)',
          transition: 'border-color 0.15s, background 0.15s, border-radius 0.1s',
          boxShadow: focused ? '0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent)' : 'none',
        }}
      />

      {/* Clear button */}
      {searchQuery && (
        <button
          onMouseDown={e => { e.preventDefault(); onSearchChange(''); inputRef.current?.focus(); }}
          style={{
            position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', padding: 2,
            color: 'var(--muted)', display: 'flex', alignItems: 'center',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      )}

      {/* Dropdown */}
      {showDropdown && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff',
          border: '1px solid var(--accent)',
          borderTop: 'none',
          borderRadius: '0 0 10px 10px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
          overflow: 'hidden',
        }}>
          {!searchQuery.trim() && (
            <div style={{
              padding: '8px 14px 6px',
              fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)',
            }}>
              Recent
            </div>
          )}
          {results.map((entry, i) => (
            <SearchResult
              key={entry.id}
              entry={entry}
              active={i === activeIndex}
              query={searchQuery}
              onMouseEnter={() => setActiveIndex(i)}
              onClick={() => { onOpen(entry.id); setFocused(false); onSearchChange(''); }}
            />
          ))}
          {searchQuery.trim() && results.length === 0 && (
            <div style={{ padding: '14px 16px', fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--muted)' }}>
              No results for "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SearchResult({ entry, active, query, onMouseEnter, onClick }: {
  entry: Entry; active: boolean; query: string;
  onMouseEnter: () => void; onClick: () => void;
}) {
  const color = entry.project ? projectColor(entry.project) : 'var(--muted)';
  return (
    <div
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      style={{
        padding: '10px 14px',
        background: active ? '#f5f5f5' : 'transparent',
        cursor: 'pointer', transition: 'background 0.08s',
        display: 'flex', alignItems: 'center', gap: 10,
        borderTop: '1px solid #f0f0f0',
      }}
    >
      {/* Color dot */}
      <span style={{
        width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
        background: entry.project ? color : 'var(--border)',
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
          color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {highlightMatch(entry.title, query)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          {entry.project && (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: color, fontWeight: 500 }}>
              {entry.project}
            </span>
          )}
          {entry.project && entry.type && <span style={{ color: '#ccc', fontSize: 10 }}>·</span>}
          {entry.type && (
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#999' }}>
              {TYPE_LABELS[entry.type] ?? entry.type}
            </span>
          )}
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: '#bbb', marginLeft: 'auto' }}>
            {new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: active ? '#999' : 'transparent', flexShrink: 0, transition: 'color 0.08s' }}>
        <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'inherit', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function TopBarIconBtn({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title?: string }) {
  return (
    <button onClick={onClick} title={title} style={{
      width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
      background: 'transparent', color: 'var(--secondary)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background 0.12s, color 0.12s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--text)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--secondary)'; }}
    >{children}</button>
  );
}

/* ── Expanded entry card ─────────────────────────────────── */
function EntryCard({ entry, onOpen }: { entry: Entry; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = entry.project ? projectColor(entry.project) : 'var(--muted)';

  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '24px 0 28px', borderBottom: '1px solid var(--border)',
        cursor: 'pointer', transition: 'background 0.1s',
      }}
    >
      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {entry.project && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: `${color}18`, border: `1px solid ${color}40`,
            borderRadius: 20, padding: '3px 10px',
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 500,
            color: color,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
            {entry.project}
          </span>
        )}
        {entry.type && (
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: 12,
            color: 'var(--muted)', fontStyle: 'italic',
          }}>
            — {TYPE_LABELS[entry.type] ?? entry.type}
          </span>
        )}
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--muted)', marginLeft: 'auto',
        }}>
          {relativeTime(entry.createdAt)}
        </span>
      </div>

      {/* Title */}
      <h2 style={{
        fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 600,
        color: hovered ? 'var(--accent)' : 'var(--text)',
        lineHeight: 1.3, margin: '0 0 16px', letterSpacing: '-0.01em',
        transition: 'color 0.15s',
      }}>
        {entry.title}
      </h2>

      {/* Context */}
      {entry.context && (
        <p style={{
          fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.7,
          color: 'var(--secondary)', margin: '0 0 14px',
        }}>
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
            letterSpacing: '0.1em', color: 'var(--muted)', marginRight: 8,
            textTransform: 'uppercase',
          }}>Context.</span>
          {entry.context}
        </p>
      )}

      {/* Decision */}
      {entry.decision && (
        <div style={{
          borderLeft: '3px solid var(--accent)', paddingLeft: 16,
          marginBottom: entry.confidence || entry.alternatives ? 14 : 0,
        }}>
          <p style={{
            fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.7,
            color: 'var(--text)', margin: 0,
          }}>
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', color: 'var(--muted)', marginRight: 8,
              textTransform: 'uppercase',
            }}>Chose.</span>
            <em style={{ color: 'var(--accent)' }}>{entry.decision}</em>
          </p>
        </div>
      )}

      {/* Confidence + alternatives */}
      {(entry.confidence || entry.alternatives) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          {entry.confidence && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{
                fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase',
              }}>Confidence</span>
              <ConfidenceDots value={entry.confidence} />
            </div>
          )}
          {entry.alternatives && (
            <span style={{
              fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic',
              color: 'var(--muted)',
            }}>
              Considered: {entry.alternatives}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────── */
export function HomeScreen({
  entries, browseFilter, activeProject, activeType,
  revisitThreshold, searchQuery, onSearchChange,
  onOpen, onNewEntry, onOpenWeeklyReview, onCycleTheme, onOpenSettings, theme,
  onBrowse, onProject, onType,
}: Props) {
  const [weeklyBannerDismissed, setWeeklyBannerDismissed] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const thisMonday = getThisMonday6am();
  const stats = useMemo(() => computeWeeklyStats(entries), [entries]);
  const now = new Date();
  const weekNum = getWeekNumber(now);

  const filtered = useMemo(() => {
    let base = entries;
    if (browseFilter === 'today')    base = base.filter(e => e.createdAt >= TODAY_START);
    if (browseFilter === 'thisWeek') base = base.filter(e => e.createdAt >= thisMonday);
    if (browseFilter === 'lowConf')  base = base.filter(e => e.confidence != null && e.confidence <= 2);
    if (browseFilter === 'revisit')  base = base.filter(e => needsRevisitCheck(e, revisitThreshold));
    if (activeProject) base = base.filter(e => e.project === activeProject);
    if (activeType)    base = base.filter(e => e.type === activeType);
    return base;
  }, [entries, browseFilter, activeProject, activeType, revisitThreshold, thisMonday]);

  const displayed = useMemo(
    () => searchQuery.trim() ? searchEntries(filtered, searchQuery) : null,
    [filtered, searchQuery],
  );

  const grouped = useMemo(
    () => displayed ? null : groupEntries(filtered),
    [filtered, displayed],
  );

  const avgConf = stats.avgConfidence != null ? stats.avgConfidence.toFixed(1) : '—';
  const revisitCount = useMemo(
    () => entries.filter(e => needsRevisitCheck(e, revisitThreshold)).length,
    [entries, revisitThreshold],
  );
  const projectCount = useMemo(
    () => new Set(entries.map(e => e.project).filter(Boolean)).size,
    [entries],
  );
  const weekDelta = stats.thisWeekCount - stats.lastWeekCount;

  /* Stat subtitles */
  const statRows = [
    {
      value: entries.length,
      label: 'Total entries',
      sub: projectCount > 0 ? `across ${projectCount} project${projectCount !== 1 ? 's' : ''}` : null,
    },
    {
      value: stats.thisWeekCount,
      label: 'This week',
      sub: weekDelta !== 0 ? `${weekDelta > 0 ? '+' : ''}${weekDelta} vs last week` : 'same as last week',
    },
    {
      value: avgConf,
      label: 'Avg confidence',
      sub: stats.lastWeekAvgConfidence != null && stats.avgConfidence != null
        ? (stats.avgConfidence >= stats.lastWeekAvgConfidence ? 'trending up' : 'trending down')
        : null,
    },
    {
      value: revisitCount,
      label: 'To revisit',
      sub: revisitCount > 0
        ? (() => {
            const oldest = entries
              .filter(e => needsRevisitCheck(e, revisitThreshold))
              .sort((a, b) => a.createdAt - b.createdAt)[0];
            if (!oldest) return null;
            const d = new Date(oldest.createdAt);
            return `eldest from ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
          })()
        : null,
    },
  ];

  /* Active filter chips */
  const activeChips: { label: string; color?: string; onRemove: () => void }[] = [];
  if (browseFilter !== 'all') {
    const labels: Record<string, string> = { today: 'Today', thisWeek: 'This week', lowConf: 'Low confidence', revisit: 'To revisit' };
    activeChips.push({ label: labels[browseFilter] ?? browseFilter, onRemove: () => onBrowse('all') });
  }
  if (activeProject) {
    activeChips.push({ label: activeProject, color: projectColor(activeProject), onRemove: () => onProject(null) });
  }
  if (activeType) {
    activeChips.push({ label: TYPE_LABELS[activeType] ?? activeType, onRemove: () => onType(null) });
  }

  /* Weekly review banner visibility */
  const showWeeklyBanner = !weeklyBannerDismissed && stats.lastWeekCount > 0;

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top bar (unchanged) ─────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--bg)', borderBottom: '1px solid var(--border)',
        padding: '10px 40px', display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <SearchDropdown
          entries={entries}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onOpen={id => { onOpen(id); }}
          inputRef={searchInputRef}
        />
        <div style={{ flex: 1 }} />
        <button onClick={onNewEntry} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '0 14px', height: 34, borderRadius: 8,
          background: 'var(--accent)', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
          color: '#fff', whiteSpace: 'nowrap', transition: 'opacity 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          <span style={{ fontSize: 16, lineHeight: 1, marginTop: -1 }}>+</span>
          New entry
          <kbd style={{ background: 'rgba(255,255,255,0.2)', borderRadius: 4, padding: '1px 5px', fontSize: 11, border: 'none', color: '#fff' }}>⌘N</kbd>
        </button>
        <TopBarIconBtn title="Toggle theme" onClick={onCycleTheme}>
          {theme === 'light' ? <SunIcon size={16} /> : theme === 'dark' ? <MoonIcon size={16} /> : <MonitorIcon size={16} />}
        </TopBarIconBtn>
        <TopBarIconBtn title="Settings" onClick={onOpenSettings}>
          <SettingsIcon size={16} />
        </TopBarIconBtn>
      </div>

      {/* ── Content ─────────────────────────────────────────── */}
      <div style={{ padding: '36px 48px 96px', maxWidth: 860 }}>

        {/* Eyebrow */}
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 400,
          letterSpacing: '0.08em', color: 'var(--muted)', textTransform: 'uppercase',
          marginBottom: 10,
        }}>
          Your decision log · Week {weekNum}, {now.getFullYear()}
        </div>

        {/* Hero headline */}
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontSize: 52, fontWeight: 400,
          color: 'var(--text)', lineHeight: 1.12, margin: '0 0 12px',
          letterSpacing: '-0.02em',
        }}>
          A record of{' '}
          <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>why</em>
          {','}
          <br />{'kept while the reasons are still warm.'}
        </h1>

        {/* Subtitle */}
        <p style={{
          fontFamily: 'var(--font-serif)', fontSize: 16, fontStyle: 'italic',
          color: 'var(--secondary)', margin: '0 0 30px', lineHeight: 1.75,
          maxWidth: 580, letterSpacing: '0.005em',
        }}>
          {entries.length === 0
            ? 'No entries yet. Press ⌘N to capture your first decision. Every great body of work starts with a single log.'
            : activeProject
            ? `Showing decisions for ${activeProject}. Every choice here shaped the direction.`
            : activeType
            ? `Filtered by ${TYPE_LABELS[activeType] ?? activeType}. Patterns emerge when you look back.`
            : stats.thisWeekCount > 0
            ? `${entries.length} decision${entries.length !== 1 ? 's' : ''} logged${projectCount > 1 ? ` across ${projectCount} projects` : ''}. ${stats.thisWeekCount} this week — keep the momentum going.`
            : `${entries.length} decision${entries.length !== 1 ? 's' : ''} in the log. Nothing captured this week yet — the best time to write it down is now.`}
        </p>

        {/* ── Stats row ──────────────────────────────────────── */}
        <div style={{ borderTop: '1px solid var(--border)', marginBottom: 0 }} />
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: '1px solid var(--border)', marginBottom: 28,
        }}>
          {statRows.map(({ value, label, sub }, i) => (
            <div key={label} style={{
              padding: '18px 0 18px',
              paddingLeft: i === 0 ? 0 : 28,
              paddingRight: i === 3 ? 0 : 28,
              borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
            }}>
              <div style={{
                fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 600,
                color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1,
                marginBottom: 6,
              }}>
                {value}
              </div>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500,
                letterSpacing: '0.07em', color: 'var(--muted)', textTransform: 'uppercase',
                marginBottom: sub ? 4 : 0,
              }}>
                {label}
              </div>
              {sub && (
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 12,
                  color: sub === 'trending up' ? '#4caf50'
                    : sub === 'trending down' ? '#e05252'
                    : 'var(--muted)',
                }}>
                  {sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Filter chips row ───────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
          flexWrap: 'wrap',
        }}>
          {activeChips.length > 0 && (
            <span style={{
              fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 700,
              letterSpacing: '0.1em', color: 'var(--muted)', textTransform: 'uppercase',
              marginRight: 4,
            }}>Filter</span>
          )}

          {activeChips.map(chip => (
            <button
              key={chip.label}
              onClick={chip.onRemove}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20,
                background: chip.color ? `${chip.color}18` : 'var(--surface)',
                border: `1px solid ${chip.color ? `${chip.color}40` : 'var(--border)'}`,
                fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                color: chip.color ?? 'var(--text)', cursor: 'pointer',
                transition: 'opacity 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              {chip.color && <span style={{ width: 6, height: 6, borderRadius: '50%', background: chip.color }} />}
              {chip.label}
              <span style={{ opacity: 0.5, fontSize: 14, lineHeight: 1, marginLeft: 2 }}>×</span>
            </button>
          ))}

        </div>

        {/* ── Weekly review banner ───────────────────────────── */}
        {showWeeklyBanner && (
          <div style={{
            borderLeft: '3px solid #C9973A',
            background: 'var(--surface)',
            borderRadius: '0 10px 10px 0',
            padding: '24px 28px 20px',
            marginBottom: 40,
          }}>
            {/* Eyebrow */}
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500,
              letterSpacing: '0.1em', color: '#C9973A', textTransform: 'uppercase',
              marginBottom: 12,
            }}>
              {DAY_NAMES[now.getDay()]} Morning · Weekly Review
            </div>

            {/* Body text */}
            <p style={{
              fontFamily: 'var(--font-serif)', fontSize: 16, lineHeight: 1.72,
              color: 'var(--text)', margin: '0 0 20px',
              letterSpacing: '0.004em',
            }}>
              You logged{' '}
              <strong style={{ fontWeight: 600 }}>{stats.lastWeekCount} decision{stats.lastWeekCount !== 1 ? 's' : ''}</strong>
              {' '}last week
              {stats.mostActiveProject ? ` — most about the ${stats.mostActiveProject}` : ''}.
              {stats.worthRevisiting.length > 0 ? (
                <> {stats.worthRevisiting.length} were rated low-confidence at the time.{' '}
                  <strong style={{ fontWeight: 600 }}>Revisit them?</strong>
                </>
              ) : (
                <> Keep the momentum going.</>
              )}
            </p>

            {/* Actions row */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                onClick={onOpenWeeklyReview}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text)',
                  letterSpacing: '0.01em',
                  borderBottom: '1px solid var(--border)',
                  paddingBottom: 1,
                  transition: 'border-color 0.15s, color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--text)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                Open weekly review →
              </button>
              <button
                onClick={() => setWeeklyBannerDismissed(true)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--muted)',
                  marginLeft: 'auto', letterSpacing: '0.01em',
                  borderBottom: '1px solid transparent', paddingBottom: 1,
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'transparent'; }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* ── Entry list ──────────────────────────────────────── */}
        {searchQuery.trim() ? (
          displayed!.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontStyle: 'italic', color: 'var(--muted)' }}>
              No entries match "{searchQuery}"
            </p>
          ) : (
            <>
              {displayed!.map(entry => (
                <EntryCard key={entry.id} entry={entry} onOpen={() => onOpen(entry.id)} />
              ))}
            </>
          )
        ) : grouped ? (
          grouped.map(group => {
            const d = new Date(group.items[0].createdAt);
            const isToday = group.items[0].createdAt >= TODAY_START;
            const headerDate = isToday
              ? `Today, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`
              : absoluteDate(group.items[0].createdAt);

            return (
              <div key={group.label}>
                {/* Date group header */}
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 14,
                  paddingBottom: 14, borderBottom: '1px solid var(--border)',
                  marginBottom: 0,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 400,
                    color: 'var(--text)', letterSpacing: '-0.01em',
                  }}>
                    {headerDate}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 400,
                    letterSpacing: '0.06em', color: 'var(--muted)', textTransform: 'uppercase',
                  }}>
                    {DAY_NAMES[d.getDay()]}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--muted)',
                    marginLeft: 'auto',
                  }}>
                    {group.items.length} {group.items.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>

                {group.items.map(entry => (
                  <EntryCard key={entry.id} entry={entry} onOpen={() => onOpen(entry.id)} />
                ))}

                <div style={{ height: 32 }} />
              </div>
            );
          })
        ) : filtered.length === 0 ? (
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, fontStyle: 'italic', color: 'var(--muted)' }}>
            No entries in this view.
          </p>
        ) : null}
      </div>
    </div>
  );
}
