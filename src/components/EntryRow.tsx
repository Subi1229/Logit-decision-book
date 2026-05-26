import { useRef, useState } from 'react';
import { type Entry } from '../db/database';
import { ConfidenceDots } from './ConfidenceDots';
import { relativeTime } from '../lib/dates';
import { db } from '../db/database';
import { nanoid } from 'nanoid';

interface Props {
  entry: Entry;
  focused: boolean;
  onOpen: () => void;
  onFocus: () => void;
  onLongPress?: () => void; // mobile: open edit modal
  isMobile?: boolean;
}

const TYPE_SHORT: Record<NonNullable<Entry['type']>, string> = {
  visual: 'VISUAL', interaction: 'INTERACTION', ia: 'IA',
  copy: 'COPY', technical: 'TECHNICAL', strategic: 'STRATEGIC',
};

export function EntryRow({ entry, focused, onOpen, onFocus, onLongPress, isMobile }: Props) {
  const [hovered, setHovered]           = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const menuRef                         = useRef<HTMLDivElement>(null);
  const longPressTimer                  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rowBg = focused
    ? 'var(--surface)'
    : hovered ? 'var(--surface)' : 'transparent';

  /* Long-press handling for mobile */
  function startLongPress() {
    if (!isMobile || !onLongPress) return;
    longPressTimer.current = setTimeout(() => { onLongPress(); }, 500);
  }
  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.stopPropagation();
    setMenuOpen(false);
    const now = Date.now();
    await db.entries.add({ ...entry, id: nanoid(), title: entry.title + ' (copy)', createdAt: now, updatedAt: now });
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setMenuOpen(false);
    setConfirmDelete(false);
    await db.entries.delete(entry.id);
  }

  return (
    <div
      tabIndex={0}
      role="button"
      onClick={onOpen}
      onFocus={onFocus}
      onKeyDown={e => { if (e.key === 'Enter') onOpen(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false); setConfirmDelete(false); }}
      onPointerDown={startLongPress}
      onPointerUp={cancelLongPress}
      onPointerCancel={cancelLongPress}
      style={{
        position: 'relative', padding: '12px 14px', borderRadius: 7,
        background: rowBg, cursor: 'pointer',
        outline: focused ? '2px solid var(--accent)' : 'none', outlineOffset: -2,
        transition: 'background 0.1s', userSelect: 'none',
      }}
    >
      {/* Title */}
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text)',
        marginBottom: 4, lineHeight: 1.3, paddingRight: hovered && !isMobile ? 28 : 0,
      }}>
        {entry.title}
      </div>

      {/* Decision preview */}
      <div style={{
        fontFamily: 'var(--body-font, var(--font-serif))', fontSize: 13,
        color: 'var(--secondary)', lineHeight: 1.55,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 8,
      }}>
        {entry.decision}
      </div>

      {/* Meta footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {entry.project && (
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>
            {entry.project}
          </span>
        )}
        {entry.project && (entry.type || entry.confidence) && (
          <span style={{ width: 1, height: 10, background: 'var(--border)', display: 'inline-block' }} />
        )}
        {entry.type && (
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500, letterSpacing: '0.06em', color: 'var(--muted)' }}>
            {TYPE_SHORT[entry.type]}
          </span>
        )}
        {entry.type && entry.confidence && (
          <span style={{ width: 1, height: 10, background: 'var(--border)', display: 'inline-block' }} />
        )}
        {entry.confidence && <ConfidenceDots value={entry.confidence} />}
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--muted)' }}>
          {relativeTime(entry.createdAt)}
        </span>
      </div>

      {/* Kebab (desktop only) */}
      {hovered && !isMobile && (
        <div ref={menuRef} style={{ position: 'absolute', top: 12, right: 12 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(o => !o); }}
            style={{
              width: 24, height: 24, borderRadius: 4, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="3"  r="1.2" fill="currentColor"/>
              <circle cx="7" cy="7"  r="1.2" fill="currentColor"/>
              <circle cx="7" cy="11" r="1.2" fill="currentColor"/>
            </svg>
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', top: 28, right: 0,
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 7, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              minWidth: 150, zIndex: 20, overflow: 'hidden',
            }}>
              {[
                { label: 'Edit',     onClick: (e: React.MouseEvent) => { e.stopPropagation(); setMenuOpen(false); onOpen(); } },
                { label: 'Duplicate', onClick: handleDuplicate },
                { label: confirmDelete ? 'Confirm delete?' : 'Delete', onClick: handleDelete, danger: true },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  style={{
                    display: 'block', width: '100%', padding: '8px 14px', textAlign: 'left',
                    background: 'transparent', border: 'none',
                    fontFamily: 'var(--font-sans)', fontSize: 13,
                    color: item.danger ? '#E05252' : 'var(--text)', cursor: 'pointer',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
