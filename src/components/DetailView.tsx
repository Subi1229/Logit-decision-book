import { useCallback, useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { db, type Entry, type Revisit } from '../db/database';
import { ConfidenceDots } from './ConfidenceDots';
import { absoluteDate, relativeTime, relativeTimeLong } from '../lib/dates';
import { EditIcon, DuplicateIcon, TrashIcon } from './Icons';

const TYPE_LABELS: Record<NonNullable<Entry['type']>, string> = {
  visual: 'Visual', interaction: 'Interaction', ia: 'IA',
  copy: 'Copy', technical: 'Technical', strategic: 'Strategic',
};

/* ── helpers ──────────────────────────────────────────────── */

function needsRevisit(entry: Entry, thresholdDays: number): boolean {
  const ms = thresholdDays * 86400000;
  if (Date.now() - entry.createdAt < ms) return false;
  if (!entry.revisits?.length) return true;
  const latest = Math.max(...entry.revisits.map(r => r.date));
  return Date.now() - latest > ms;
}

function relatedEntries(current: Entry, all: Entry[]): Entry[] {
  return all
    .filter(e => e.id !== current.id)
    .filter(e =>
      (current.project && e.project === current.project) ||
      (current.type && e.type === current.type)
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);
}

/* ── sub-components ───────────────────────────────────────── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-sans)',
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: 'var(--muted)',
      marginBottom: 8,
      marginTop: 32,
    }}>
      {children}
    </div>
  );
}

function SectionBody({
  text,
  editing,
  value,
  onChange,
  onClick,
  placeholder,
}: {
  text: string;
  editing: boolean;
  value: string;
  onChange: (v: string) => void;
  onClick: () => void;
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
    }
  }, [editing]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [value, editing]);

  if (editing) {
    return (
      <textarea
        ref={ref}
        className="logit-field"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        style={{
          overflow: 'hidden',
          fontSize: 17,
          lineHeight: 1.7,
          width: '100%',
        }}
      />
    );
  }

  return (
    <div
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 17,
        lineHeight: 1.75,
        color: 'var(--text)',
        cursor: 'text',
        borderBottom: '1px solid transparent',
        paddingBottom: 1,
        transition: 'border-color 0.15s',
        whiteSpace: 'pre-wrap',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderBottomColor = 'var(--border)')}
      onMouseLeave={e => (e.currentTarget.style.borderBottomColor = 'transparent')}
    >
      {text || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>{placeholder}</span>}
    </div>
  );
}

/* ── revisit card ─────────────────────────────────────────── */

interface RevisitCardProps {
  entry: Entry;
  onDismiss: () => void;
  onConfirm: () => void;
  onRevise: () => void;
}

function RevisitCard({ entry, onDismiss, onConfirm, onRevise }: RevisitCardProps) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      padding: '18px 20px',
      marginBottom: 36,
      borderLeft: '3px solid var(--accent)',
    }}>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: 15,
        lineHeight: 1.65,
        color: 'var(--secondary)',
        margin: '0 0 14px',
      }}>
        You wrote this {relativeTimeLong(entry.createdAt)}.{' '}
        Looking back, would you make the same call?
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onConfirm} style={revisitBtn('accent')}>Still right</button>
        <button onClick={onRevise}  style={revisitBtn('ghost')}>Revise</button>
        <button onClick={onDismiss} style={dismissBtn}>Dismiss</button>
      </div>
    </div>
  );
}

function revisitBtn(variant: 'accent' | 'ghost'): React.CSSProperties {
  return {
    padding: '6px 14px',
    borderRadius: 6,
    border: variant === 'accent' ? 'none' : '1px solid var(--border)',
    background: variant === 'accent' ? 'var(--accent)' : 'transparent',
    color: variant === 'accent' ? '#fff' : 'var(--secondary)',
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
  };
}

const dismissBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontFamily: 'var(--font-sans)',
  fontSize: 12,
  color: 'var(--muted)',
  cursor: 'pointer',
  marginLeft: 4,
  padding: '6px 4px',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
};

/* ── related entry row ────────────────────────────────────── */

function RelatedRow({ entry, onOpen }: { entry: Entry; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false);
  const snippet = entry.decision || entry.context || '';
  return (
    <div
      onClick={onOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '14px 16px', cursor: 'pointer',
        borderRadius: 8, margin: '4px 0',
        background: hovered ? '#ede9e0' : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
        color: 'var(--text)', marginBottom: 5,
        letterSpacing: '-0.01em',
      }}>
        {entry.title}
      </div>
      {snippet && (
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 13,
          color: 'var(--secondary)', lineHeight: 1.5,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {snippet}
        </div>
      )}
    </div>
  );
}

/* ── edit state ───────────────────────────────────────────── */

type EditForm = {
  title: string;
  context: string;
  decision: string;
  why: string;
  alternatives: string;
  tradeoffs: string;
  revisedNote: string; // only used in revise mode
};

function entryToForm(e: Entry): EditForm {
  return {
    title: e.title,
    context: e.context,
    decision: e.decision,
    why: e.why,
    alternatives: e.alternatives ?? '',
    tradeoffs: e.tradeoffs ?? '',
    revisedNote: '',
  };
}

/* ── icon button ──────────────────────────────────────────── */

function IconBtn({ children, onClick, title, danger }: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 32, height: 32, borderRadius: 7,
        border: `1px solid ${danger && hovered ? '#e05252' : 'var(--border)'}`,
        background: danger && hovered ? '#fef2f2' : hovered ? '#f0f0f0' : '#fff',
        color: danger ? (hovered ? '#e05252' : '#1a1a1a') : '#1a1a1a',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.12s, color 0.12s, border-color 0.12s',
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

/* ── main component ───────────────────────────────────────── */

interface Props {
  entry: Entry;
  allEntries: Entry[];
  onBack: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (entry: Entry) => void;
  onDeleted: () => void;
  onToast: (msg: string) => void;
  revisitPromptsEnabled?: boolean;
  revisitThreshold?: number;
  isMobile?: boolean;
}

export function DetailView({ entry, allEntries, onBack, onOpen, onDuplicate, onDeleted, onToast,
  revisitPromptsEnabled = true, revisitThreshold = 30, isMobile = false,
}: Props) {
  const [isEditing, setIsEditing]       = useState(false);
  const [isRevising, setIsRevising]     = useState(false);
  const [revisitDismissed, setRevisitDismissed] = useState(false);
  const [form, setForm]                 = useState<EditForm>(entryToForm(entry));
  const [focusField, setFocusField]     = useState<keyof EditForm | null>(null);
  const [deletePrompt, setDeletePrompt] = useState(false);
  const titleInputRef                   = useRef<HTMLInputElement>(null);

  // Sync form when entry changes externally (live query update)
  useEffect(() => {
    if (!isEditing) setForm(entryToForm(entry));
  }, [entry, isEditing]);

  const startEditing = useCallback((field?: keyof EditForm) => {
    setForm(entryToForm(entry));
    setIsEditing(true);
    setFocusField(field ?? 'title');
  }, [entry]);

  const cancelEdit = useCallback(() => {
    setIsEditing(false);
    setIsRevising(false);
    setFocusField(null);
    setForm(entryToForm(entry));
  }, [entry]);

  async function saveEdit() {
    const now = Date.now();
    const update: Partial<Entry> = {
      title:        form.title.trim()        || entry.title,
      context:      form.context.trim()      || entry.context,
      decision:     form.decision.trim()     || entry.decision,
      why:          form.why.trim()          || entry.why,
      alternatives: form.alternatives.trim() || undefined,
      tradeoffs:    form.tradeoffs.trim()    || undefined,
      updatedAt:    now,
    };

    if (isRevising) {
      const newRevisit: Revisit = {
        date: now,
        note: form.revisedNote.trim(),
        outcome: 'revised',
      };
      update.revisits = [...(entry.revisits ?? []), newRevisit];
    }

    await db.entries.update(entry.id, update);
    setIsEditing(false);
    setIsRevising(false);
    setFocusField(null);
    onToast('Changes saved.');
  }

  async function confirmRevisit() {
    const newRevisit: Revisit = { date: Date.now(), note: '', outcome: 'confirmed' };
    await db.entries.update(entry.id, {
      revisits: [...(entry.revisits ?? []), newRevisit],
    });
    setRevisitDismissed(true);
    onToast('Revisit recorded.');
  }

  async function handleDelete() {
    await db.entries.delete(entry.id);
    onDeleted();
    onToast('Entry deleted.');
  }

  // Title input: focus when editing starts with 'title'
  useEffect(() => {
    if (isEditing && focusField === 'title') {
      setTimeout(() => titleInputRef.current?.focus(), 20);
    }
  }, [isEditing, focusField]);

  /* Keyboard shortcuts */
  useHotkeys('escape', () => {
    if (deletePrompt) { setDeletePrompt(false); return; }
    if (isEditing) { cancelEdit(); return; }
    onBack();
  }, { enableOnFormTags: true }, [isEditing, deletePrompt]);

  useHotkeys('mod+s', e => {
    e.preventDefault();
    if (isEditing) saveEdit();
  }, { enableOnFormTags: true }, [isEditing, form]);

  useHotkeys('e', () => {
    if (!isEditing) startEditing('title');
  }, { enableOnFormTags: false }, [isEditing]);

  useHotkeys('d', () => {
    if (!isEditing) onDuplicate(entry);
  }, { enableOnFormTags: false }, [isEditing, entry]);

  useHotkeys('mod+backspace', e => {
    e.preventDefault();
    if (!isEditing) setDeletePrompt(true);
  }, { enableOnFormTags: false }, [isEditing]);

  const showRevisitCard = !revisitDismissed && !isEditing && revisitPromptsEnabled && needsRevisit(entry, revisitThreshold);
  const related = relatedEntries(entry, allEntries);
  const hasEdits = entry.updatedAt > entry.createdAt;

  const setF = (k: keyof EditForm) => (v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  return (
    <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start', maxWidth: 820, margin: '0 auto' }}>

      {/* ── Main content ────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>

      {/* Breadcrumb */}
      <div style={{ marginBottom: 40 }}>
        <button
          onClick={onBack}
          style={{
            background: 'none', border: 'none',
            fontFamily: 'var(--font-sans)', fontSize: 13,
            color: 'var(--accent)', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          All entries
        </button>
      </div>

      {/* Revisit card */}
      {showRevisitCard && (
        <RevisitCard
          entry={entry}
          onDismiss={() => setRevisitDismissed(true)}
          onConfirm={confirmRevisit}
          onRevise={() => { startEditing('context'); setIsRevising(true); }}
        />
      )}

      {/* "What changed your mind?" field — revise mode only */}
      {isRevising && (
        <div style={{ marginBottom: 28 }}>
          <SectionHeading>What changed your mind?</SectionHeading>
          <textarea
            className="logit-field"
            value={form.revisedNote}
            onChange={e => setF('revisedNote')(e.target.value)}
            placeholder="What new information or perspective shifted this?"
            rows={2}
            autoFocus
            style={{ overflow: 'hidden', fontSize: 17, lineHeight: 1.7, width: '100%' }}
          />
        </div>
      )}

      {/* Title */}
      {isEditing ? (
        <input
          ref={titleInputRef}
          className="logit-field logit-field-title"
          value={form.title}
          onChange={e => setF('title')(e.target.value)}
          style={{ fontSize: 36, marginBottom: 16, display: 'block' }}
        />
      ) : (
        <h1
          onClick={() => !isMobile && startEditing('title')}
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 36,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            margin: '0 0 16px',
            cursor: 'text',
          }}
        >
          {entry.title}
        </h1>
      )}

      {/* Meta line */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        fontFamily: 'var(--font-sans)', fontSize: 12,
        color: 'var(--muted)', marginBottom: 40,
      }}>
        <span>{absoluteDate(entry.createdAt)}</span>
        {entry.project && (
          <>
            <Dot />
            <span style={{ color: 'var(--accent)' }}>{entry.project}</span>
          </>
        )}
        {entry.type && (
          <>
            <Dot />
            <span style={{ letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: 10 }}>
              {TYPE_LABELS[entry.type]}
            </span>
          </>
        )}
        {entry.confidence && (
          <>
            <Dot />
            <ConfidenceDots value={entry.confidence} />
          </>
        )}
        {hasEdits && (
          <>
            <Dot />
            <span>Edited {relativeTime(entry.updatedAt)}</span>
          </>
        )}
        {entry.revisits?.length ? (
          <>
            <Dot />
            <span>{entry.revisits.length} revisit{entry.revisits.length > 1 ? 's' : ''}</span>
          </>
        ) : null}
      </div>

      {/* Body sections */}
      {(
        [
          { key: 'context',  label: 'Context',      ph: 'What situation required a decision?' },
          { key: 'decision', label: 'The decision',  ph: 'What did you choose?' },
          { key: 'why',      label: 'Why',           ph: 'What made this the right choice?' },
        ] as const
      ).map(({ key, label, ph }) => (
        <div key={key}>
          <SectionHeading>{label}</SectionHeading>
          <SectionBody
            text={entry[key]}
            editing={isEditing}
            value={form[key]}
            onChange={setF(key)}
            onClick={() => !isMobile && startEditing(key)}
            placeholder={ph}
          />
        </div>
      ))}

      {/* Alternatives — always editable; show when filled or editing */}
      {(entry.alternatives || isEditing) && (
        <div>
          <SectionHeading>Alternatives</SectionHeading>
          <SectionBody
            text={entry.alternatives ?? ''}
            editing={isEditing}
            value={form.alternatives}
            onChange={setF('alternatives')}
            onClick={() => !isMobile && startEditing('alternatives')}
            placeholder="What else did you look at?"
          />
        </div>
      )}

      {/* Tradeoffs */}
      {(entry.tradeoffs || isEditing) && (
        <div>
          <SectionHeading>Tradeoffs</SectionHeading>
          <SectionBody
            text={entry.tradeoffs ?? ''}
            editing={isEditing}
            value={form.tradeoffs}
            onChange={setF('tradeoffs')}
            onClick={() => !isMobile && startEditing('tradeoffs')}
            placeholder="What did you give up?"
          />
        </div>
      )}

      {/* Revisit history */}
      {entry.revisits?.length ? (
        <div style={{ marginTop: 40 }}>
          <SectionHeading>Revisit history</SectionHeading>
          <div style={{
            borderLeft: '2px solid var(--border)',
            paddingLeft: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            marginTop: 12,
          }}>
            {entry.revisits.map((r, i) => (
              <div key={i}>
                <div style={{
                  display: 'flex', gap: 8, alignItems: 'center',
                  marginBottom: r.note ? 6 : 0,
                }}>
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 11,
                    fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                    color: r.outcome === 'confirmed' ? 'var(--accent)' : 'var(--muted)',
                  }}>
                    {r.outcome === 'confirmed' ? 'Confirmed' : 'Revised'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--muted)' }}>
                    {absoluteDate(r.date)}
                  </span>
                </div>
                {r.note && (
                  <p style={{
                    fontFamily: 'var(--font-serif)', fontSize: 15,
                    lineHeight: 1.65, color: 'var(--secondary)', margin: 0,
                  }}>
                    {r.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Delete confirm — fixed bottom bar */}
      {deletePrompt && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 50,
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 20px',
          borderRadius: 10,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
          whiteSpace: 'nowrap',
        }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--secondary)' }}>
            Delete this entry permanently?
          </span>
          <button
            onClick={handleDelete}
            style={{
              padding: '6px 16px', borderRadius: 6,
              border: 'none', background: '#E05252', color: '#fff',
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Delete
          </button>
          <button
            onClick={() => setDeletePrompt(false)}
            style={{
              padding: '6px 14px', borderRadius: 6,
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--secondary)',
              fontFamily: 'var(--font-sans)', fontSize: 13, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Related entries */}
      {related.length > 0 && (
        <div style={{ marginTop: 56, paddingTop: 32, borderTop: '1px solid var(--border)' }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)',
            marginBottom: 8,
          }}>
            Related entries
          </div>
          {related.map(e => (
            <RelatedRow key={e.id} entry={e} onOpen={() => onOpen(e.id)} />
          ))}
        </div>
      )}

      {/* Bottom padding */}
      <div style={{ height: 80 }} />
      </div>{/* end main content */}

      {/* ── Right action strip ──────────────────────────────── */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        paddingTop: 0, flexShrink: 0,
        position: 'sticky', top: 0,
      }}>
        {!isEditing ? (
          <>
            <IconBtn title="Edit (E)" onClick={() => startEditing('title')}>
              <EditIcon size={16} />
            </IconBtn>
            <IconBtn title="Duplicate (D)" onClick={() => onDuplicate(entry)}>
              <DuplicateIcon size={16} />
            </IconBtn>
            <IconBtn
              title="Delete (⌘⌫)"
              onClick={() => setDeletePrompt(true)}
              danger={deletePrompt}
            >
              <TrashIcon size={16} />
            </IconBtn>
          </>
        ) : (
          <>
            <button
              onClick={saveEdit}
              style={{
                background: 'var(--accent)', border: 'none',
                borderRadius: 6, padding: '6px 12px',
                fontFamily: 'var(--font-sans)', fontSize: 12,
                fontWeight: 500, color: '#fff', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Save <span style={{ opacity: 0.7, fontSize: 10 }}>⌘S</span>
            </button>
            <button
              onClick={cancelEdit}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: 6, padding: '6px 12px',
                fontFamily: 'var(--font-sans)', fontSize: 12,
                color: 'var(--secondary)', cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Cancel <span style={{ opacity: 0.5, fontSize: 10 }}>Esc</span>
            </button>
          </>
        )}
      </div>

    </div>
  );
}

function Dot() {
  return (
    <span style={{
      width: 3, height: 3, borderRadius: '50%',
      background: 'var(--border)', display: 'inline-block', flexShrink: 0,
    }} />
  );
}
