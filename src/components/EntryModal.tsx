import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { nanoid } from 'nanoid';
import { db, type Entry } from '../db/database';

const TYPES: { value: NonNullable<Entry['type']>; label: string }[] = [
  { value: 'visual',      label: 'Visual' },
  { value: 'interaction', label: 'Interaction' },
  { value: 'ia',          label: 'IA' },
  { value: 'copy',        label: 'Copy' },
  { value: 'technical',   label: 'Technical' },
  { value: 'strategic',   label: 'Strategic' },
];

const EMPTY = {
  title: '',
  context: '',
  decision: '',
  why: '',
  alternatives: '',
  tradeoffs: '',
  project: '',
  type: undefined as Entry['type'],
  confidence: undefined as Entry['confidence'],
};

type FormState = typeof EMPTY;

interface Props {
  open: boolean;
  existingProjects: string[];
  initialValues?: Partial<FormState>;
  fullScreen?: boolean;
  onClose: () => void;
  onSaved: (msg: string) => void;
}

function isDirty(f: FormState) {
  return Object.values(f).some(v => v !== undefined && v !== '');
}

function isValid(f: FormState) {
  return f.title.trim() !== '' && f.decision.trim() !== '';
}

/* Auto-grow textarea */
function AutoTextarea({
  value,
  onChange,
  placeholder,
  minRows = 2,
  className = 'logit-field',
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  minRows?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [value]);

  return (
    <textarea
      ref={ref}
      className={className}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={minRows}
      style={{ overflow: 'hidden', ...style }}
    />
  );
}

/* Project typeahead */
function ProjectField({
  value,
  onChange,
  suggestions,
}: {
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
}) {
  const [open, setOpen] = useState(false);
  const filtered = suggestions.filter(
    s => s.toLowerCase().includes(value.toLowerCase()) && s !== value
  );
  const showNew = value.trim() !== '' && !suggestions.includes(value.trim());

  return (
    <div style={{ position: 'relative' }}>
      <input
        className="logit-field"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Which project is this for?"
        style={{ fontSize: 14 }}
      />
      {open && (filtered.length > 0 || showNew) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            marginTop: 2,
            zIndex: 50,
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          }}
        >
          {filtered.map(s => (
            <button
              key={s}
              type="button"
              onMouseDown={() => onChange(s)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--text)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {s}
            </button>
          ))}
          {showNew && (
            <button
              type="button"
              onMouseDown={() => onChange(value.trim())}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                borderTop: filtered.length > 0 ? '1px solid var(--border)' : 'none',
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--accent)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Create "{value.trim()}"
            </button>
          )}
        </div>
      )}
    </div>
  );
}



export function EntryModal({ open, existingProjects, initialValues, fullScreen, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [discardPrompt, setDiscardPrompt] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  /* Focus title on open; apply initialValues if provided */
  useEffect(() => {
    if (open) {
      setForm(initialValues ? { ...EMPTY, ...initialValues } : EMPTY);
      setDiscardPrompt(false);
      setTimeout(() => titleRef.current?.focus(), 40);
    }
  }, [open]);

  const set = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(prev => ({ ...prev, [k]: v }));
  }, []);

  async function save(andNew: boolean) {
    if (!isValid(form)) return;
    const now = Date.now();
    await db.entries.add({
      id: nanoid(),
      title: form.title.trim(),
      context: form.context.trim(),
      decision: form.decision.trim(),
      why: form.why.trim(),
      alternatives: form.alternatives.trim() || undefined,
      tradeoffs: form.tradeoffs.trim() || undefined,
      project: form.project.trim() || undefined,
      type: form.type,
      confidence: form.confidence,
      createdAt: now,
      updatedAt: now,
    });
    onSaved('Entry saved.');
    if (andNew) {
      setForm(EMPTY);
      setDiscardPrompt(false);
      setTimeout(() => titleRef.current?.focus(), 40);
    } else {
      setForm(EMPTY);
      onClose();
    }
  }

  function tryClose() {
    if (isDirty(form)) {
      setDiscardPrompt(true);
    } else {
      onClose();
    }
  }

  /* Keyboard shortcuts — scoped to when modal is open */
  useHotkeys('mod+enter', () => { if (open) save(false); }, { enableOnFormTags: true }, [open, form]);
  useHotkeys('mod+shift+enter', () => { if (open) save(true); }, { enableOnFormTags: true }, [open, form]);
  useHotkeys('escape', () => { if (open) tryClose(); }, { enableOnFormTags: true }, [open, form]);

  if (!open) return null;

  const valid = isValid(form);

  const btnBase: React.CSSProperties = {
    fontFamily: 'var(--font-sans)',
    fontSize: 13,
    fontWeight: 500,
    padding: '7px 14px',
    borderRadius: 6,
    cursor: valid ? 'pointer' : 'not-allowed',
    opacity: valid ? 1 : 0.45,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const kbdStyle: React.CSSProperties = {
    fontSize: 10,
    padding: '1px 5px',
    borderRadius: 3,
    border: '1px solid',
    lineHeight: '16px',
    letterSpacing: '0.02em',
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={tryClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.38)',
          zIndex: 80,
          animation: 'overlay-in 0.18s ease',
        }}
      />

      {/* Modal */}
      <div
        className={fullScreen ? 'logit-modal-sheet' : undefined}
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 'min(720px, calc(100vw - 32px))',
          maxHeight: 'calc(100vh - 48px)',
          display: 'flex', flexDirection: 'column',
          background: '#faf9f6',
          border: '1px solid var(--border)',
          borderRadius: 14,
          zIndex: 90,
          animation: 'modal-in 0.18s cubic-bezier(0.16,1,0.3,1)',
          boxShadow: '0 12px 48px rgba(0,0,0,0.16)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--secondary)',
          }}>
            New Decision
          </span>
          <button
            onClick={tryClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', padding: 4, display: 'flex',
              borderRadius: 4, transition: 'color 0.1s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <div style={{ padding: '0 32px' }}>

            {/* Main fields: Title, Context, The Decision, Why */}
            {([
              { key: 'title',    label: 'Title',        ph: 'A one-line summary of the decision',  req: true,  rows: 1, isTitle: true },
              { key: 'context',  label: 'Context',      ph: 'What situation required a decision?', req: true,  rows: 3, isTitle: false },
              { key: 'decision', label: 'The Decision', ph: 'What did you choose?',                req: true,  rows: 3, isTitle: false },
              { key: 'why',      label: 'Why',          ph: 'What made this the right choice?',    req: true,  rows: 3, isTitle: false },
            ] as const).map(({ key, label, ph, req, rows, isTitle }) => (
              <div key={key} style={{ borderBottom: '1px solid var(--border)', padding: '22px 0' }}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--secondary)', marginBottom: 10,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {label}
                  {req && <span style={{ color: '#c0392b', fontSize: 11 }}>*</span>}
                </div>
                {isTitle ? (
                  <input
                    ref={titleRef}
                    value={form[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={ph}
                    style={{
                      width: '100%', border: 'none', outline: 'none', background: 'transparent',
                      fontFamily: 'var(--font-serif)', fontSize: 17, fontStyle: 'italic',
                      color: form[key] ? 'var(--text)' : 'var(--muted)',
                      lineHeight: 1.6,
                    }}
                  />
                ) : (
                  <AutoTextarea
                    value={form[key] as string}
                    onChange={v => set(key, v)}
                    placeholder={ph}
                    minRows={rows}
                    className=""
                    style={{
                      width: '100%', border: 'none', outline: 'none', background: 'transparent',
                      fontFamily: 'var(--font-serif)', fontSize: 17, fontStyle: 'italic',
                      color: form[key] ? 'var(--text)' : 'var(--muted)',
                      lineHeight: 1.6, resize: 'none', padding: 0,
                    }}
                  />
                )}
              </div>
            ))}

            {/* Optional fields */}
            {([
              { key: 'alternatives', label: 'Alternatives', ph: 'What else did you look at?' },
              { key: 'tradeoffs',    label: 'Tradeoffs',    ph: 'What did you give up?' },
            ] as const).map(({ key, label, ph }) => (
              <div key={key} style={{ borderBottom: '1px solid var(--border)', padding: '22px 0' }}>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
                  letterSpacing: '0.12em', textTransform: 'uppercase',
                  color: 'var(--secondary)', marginBottom: 10,
                }}>
                  {label}
                </div>
                <AutoTextarea
                  value={form[key] as string}
                  onChange={v => set(key, v)}
                  placeholder={ph}
                  minRows={1}
                  className=""
                  style={{
                    width: '100%', border: 'none', outline: 'none', background: 'transparent',
                    fontFamily: 'var(--font-serif)', fontSize: 17, fontStyle: 'italic',
                    color: form[key] ? 'var(--text)' : 'var(--muted)',
                    lineHeight: 1.6, resize: 'none', padding: 0,
                  }}
                />
              </div>
            ))}

            {/* Project */}
            <div style={{ borderBottom: '1px solid var(--border)', padding: '22px 0' }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--secondary)', marginBottom: 10,
              }}>
                Project
              </div>
              <ProjectField
                value={form.project}
                onChange={v => set('project', v)}
                suggestions={existingProjects}
              />
            </div>

            {/* Type chips */}
            <div style={{ borderBottom: '1px solid var(--border)', padding: '22px 0' }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--secondary)', marginBottom: 10,
              }}>
                Type
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TYPES.map(t => {
                  const active = form.type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set('type', active ? undefined : t.value)}
                      style={{
                        padding: '4px 10px', borderRadius: 20,
                        border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                        background: active ? 'var(--accent)' : 'transparent',
                        color: active ? '#fff' : 'var(--secondary)',
                        fontFamily: 'var(--font-sans)', fontSize: 12,
                        cursor: 'pointer', transition: 'all 0.1s',
                      }}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Confidence */}
            <div style={{ padding: '22px 0 28px' }}>
              <div style={{
                fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'var(--secondary)', marginBottom: 12,
              }}>
                Confidence
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {([1, 2, 3, 4, 5] as const).map(n => {
                  const filled = form.confidence !== undefined && n <= form.confidence;
                  const danger = form.confidence !== undefined && form.confidence <= 2;
                  const color = filled ? (danger ? '#E05252' : 'var(--accent)') : 'var(--border)';
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => set('confidence', form.confidence === n ? undefined : n)}
                      title={`${n}/5`}
                      style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: color, border: 'none', cursor: 'pointer', padding: 0,
                        transition: 'background 0.1s, transform 0.1s',
                        transform: filled ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  );
                })}
                {form.confidence && (
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>
                    {form.confidence}/5
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Discard prompt */}
          {discardPrompt && (
            <div style={{
              margin: '0 32px 16px',
              padding: '12px 14px', borderRadius: 7,
              background: 'var(--bg)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--secondary)', flex: 1 }}>
                Discard this entry?
              </span>
              <button onClick={() => { setForm(EMPTY); onClose(); }} style={{ padding: '5px 12px', borderRadius: 5, border: 'none', background: '#E05252', color: '#fff', fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer' }}>
                Discard
              </button>
              <button onClick={() => setDiscardPrompt(false)} style={{ padding: '5px 12px', borderRadius: 5, border: '1px solid var(--border)', background: 'transparent', color: 'var(--secondary)', fontFamily: 'var(--font-sans)', fontSize: 12, cursor: 'pointer' }}>
                Keep editing
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8,
          padding: '16px 32px',
          borderTop: '1px solid var(--border)',
          background: '#faf9f6',
        }}>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--muted)', marginRight: 'auto' }}>
            <span style={{ color: '#c0392b' }}>*</span> Title + Decision required
          </span>
          <button
            type="button" disabled={!valid} onClick={() => save(true)}
            style={{ ...btnBase, border: '1px solid var(--border)', background: 'transparent', color: 'var(--secondary)' }}
          >
            Save & new
            <kbd style={{ ...kbdStyle, borderColor: 'var(--border)', color: 'var(--muted)' }}>⌘⇧↵</kbd>
          </button>
          <button
            type="button" disabled={!valid} onClick={() => save(false)}
            style={{ ...btnBase, border: 'none', background: 'var(--accent)', color: '#fff' }}
          >
            Save & close
            <kbd style={{ ...kbdStyle, borderColor: 'rgba(255,255,255,0.35)', color: 'rgba(255,255,255,0.8)' }}>⌘↵</kbd>
          </button>
        </div>
      </div>
    </>
  );
}
