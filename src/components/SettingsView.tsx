import { useRef, useState } from 'react';
import { type Settings } from '../hooks/useSettings';
import { type Theme } from '../hooks/useTheme';
import { db } from '../db/database';
import { useEntries } from '../hooks/useEntries';
import { exportEntriesJSON, exportEntriesMarkdown, exportEntriesCSV, importEntriesJSON } from '../lib/export';
import { resetWeeklyReviewShown } from '../lib/weeklyReview';

interface Props {
  settings: Settings;
  onUpdate: (patch: Partial<Settings>) => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  onBack: () => void;
  onOpenWeeklyReview: () => void;
  onToast: (msg: string) => void;
}

/* ── Section header ─────────────────────────────────────── */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500,
      letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)',
      paddingBottom: 12, borderBottom: '1px solid var(--border)',
      marginBottom: 0,
    }}>{children}</div>
  );
}

/* ── Row ─────────────────────────────────────────────────── */
function Row({ label, sub, children, last }: {
  label: string; sub?: string; children: React.ReactNode; last?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 0',
      borderBottom: last ? 'none' : '1px solid var(--border)',
    }}>
      <div>
        <div style={{
          fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
          color: 'var(--text)', marginBottom: sub ? 4 : 0,
        }}>{label}</div>
        {sub && (
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic',
            color: 'var(--secondary)', letterSpacing: '0.005em',
          }}>{sub}</div>
        )}
      </div>
      <div style={{ flexShrink: 0, marginLeft: 24 }}>{children}</div>
    </div>
  );
}

/* ── Segmented control ───────────────────────────────────── */
function SegmentedControl<T extends string>({
  options, value, onChange,
}: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div style={{
      display: 'inline-flex', borderRadius: 8,
      border: '1px solid var(--border)',
      background: 'var(--bg)',
      padding: 2, gap: 1,
    }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: '5px 14px', border: 'none', cursor: 'pointer',
            borderRadius: 6,
            fontFamily: 'var(--font-sans)', fontSize: 13,
            fontWeight: 400,
            background: opt.value === value ? 'var(--surface)' : 'transparent',
            color: opt.value === value ? 'var(--text)' : 'var(--muted)',
            boxShadow: opt.value === value ? '0 1px 4px rgba(0,0,0,0.12), inset 0 0 0 1px var(--border)' : 'none',
            transition: 'all 0.12s',
            whiteSpace: 'nowrap',
          }}
        >{opt.label}</button>
      ))}
    </div>
  );
}

/* ── Ghost button ────────────────────────────────────────── */
function GhostBtn({ children, onClick, disabled }: {
  children: React.ReactNode; onClick?: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px', borderRadius: 7,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--secondary)',
        fontFamily: 'var(--font-sans)', fontSize: 13,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background 0.12s, color 0.12s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text)'; } }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.color = 'var(--secondary)'; }}
    >
      {children}
    </button>
  );
}

export function SettingsView({ settings, onUpdate, theme, onThemeChange, onBack, onOpenWeeklyReview, onToast }: Props) {
  const entries = useEntries() ?? [];
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteInput, setShowDeleteInput] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const sizeKB = Math.round(JSON.stringify(entries).length / 1024);

  async function handleClearAll() {
    if (deleteConfirm !== 'DELETE') return;
    await db.entries.clear();
    setDeleteConfirm('');
    setShowDeleteInput(false);
    onToast('All entries deleted.');
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const count = await importEntriesJSON(file);
      onToast(`Imported ${count} entries.`);
    } catch {
      onToast('Import failed — invalid file.');
    } finally {
      setImporting(false);
      if (importRef.current) importRef.current.value = '';
    }
  }

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>

      {/* Back */}
      <button onClick={onBack} style={{
        background: 'none', border: 'none', fontFamily: 'var(--font-sans)',
        fontSize: 13, color: 'var(--accent)', cursor: 'pointer', padding: 0,
        marginBottom: 36, display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>

      {/* Title */}
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 40, fontWeight: 400,
        fontStyle: 'italic', letterSpacing: '-0.02em',
        color: 'var(--text)', margin: '0 0 40px',
      }}>Settings</h1>

      {/* ── APPEARANCE ─────────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <SectionTitle>Appearance</SectionTitle>
        <Row label="Theme" sub="Follow your eye; this is a writing tool.">
          <SegmentedControl
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]}
            value={theme}
            onChange={onThemeChange}
          />
        </Row>
        <Row label="Body font" sub="Serif feels like a journal. Sans feels like software." last>
          <SegmentedControl
            options={[{ value: 'serif', label: 'Editorial' }, { value: 'sans', label: 'Plain' }]}
            value={settings.bodyFont}
            onChange={v => onUpdate({ bodyFont: v as 'serif' | 'sans' })}
          />
        </Row>
      </section>

      {/* ── DATA ───────────────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <SectionTitle>Data</SectionTitle>
        <Row label="Total entries" sub={`${entries.length} entries · ~${sizeKB} KB used`}>
          <span />
        </Row>
        <Row label="Export" sub="Your data, your choice of format.">
          <div style={{ display: 'flex', gap: 8 }}>
            <GhostBtn onClick={() => exportEntriesJSON(entries)}>JSON</GhostBtn>
            <GhostBtn onClick={() => exportEntriesMarkdown(entries)}>Markdown</GhostBtn>
            <GhostBtn onClick={() => exportEntriesCSV(entries)}>CSV</GhostBtn>
          </div>
        </Row>
        <Row label="Import" sub="Drag a Logit-exported JSON file." last>
          <GhostBtn onClick={() => importRef.current?.click()} disabled={importing}>
            {importing ? 'Importing…' : 'Choose file'}
          </GhostBtn>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </Row>
      </section>

      {/* ── REVIEW ─────────────────────────────────────────── */}
      <section style={{ marginBottom: 40 }}>
        <SectionTitle>Review</SectionTitle>
        <Row label="Weekly review" sub="Monday morning, once per week.">
          <SegmentedControl
            options={[{ value: 'true', label: 'On' }, { value: 'false', label: 'Off' }]}
            value={String(settings.weeklyReviewEnabled)}
            onChange={v => onUpdate({ weeklyReviewEnabled: v === 'true' })}
          />
        </Row>
        <Row label="Revisit prompts" sub='"Would you still make that call?"'>
          <SegmentedControl
            options={[{ value: 'true', label: 'On' }, { value: 'false', label: 'Off' }]}
            value={String(settings.revisitPromptsEnabled)}
            onChange={v => onUpdate({ revisitPromptsEnabled: v === 'true' })}
          />
        </Row>
        <Row label="Revisit after" sub="How old before an entry prompts revisit.">
          <SegmentedControl
            options={[{ value: '30', label: '30d' }, { value: '60', label: '60d' }, { value: '90', label: '90d' }]}
            value={String(settings.revisitThreshold)}
            onChange={v => onUpdate({ revisitThreshold: Number(v) as 30 | 60 | 90 })}
          />
        </Row>
        <Row label="Open weekly review" sub="">
          <GhostBtn onClick={onOpenWeeklyReview}>Open now</GhostBtn>
        </Row>
        <Row label="Reset weekly review timer" sub="Show again next time you open the app." last>
          <GhostBtn onClick={() => { resetWeeklyReviewShown(); onToast('Timer reset.'); }}>Reset</GhostBtn>
        </Row>
      </section>

      {/* ── DANGER ZONE ────────────────────────────────────── */}
      <section style={{ marginBottom: 48 }}>
        <SectionTitle>Danger Zone</SectionTitle>
        <div style={{ paddingTop: 20 }}>
          <div style={{
            border: '1px dashed rgba(180,50,50,0.4)',
            borderRadius: 10,
            padding: '20px 24px',
          }}>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#a03030', marginBottom: 14,
            }}>
              Irreversible
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
              <div>
                <div style={{
                  fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                  color: 'var(--text)', marginBottom: 4,
                }}>
                  Clear all entries
                </div>
                <div style={{
                  fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic',
                  color: 'var(--secondary)',
                }}>
                  Delete every entry. There is no undo.
                </div>
                {showDeleteInput && (
                  <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="text"
                      value={deleteConfirm}
                      onChange={e => setDeleteConfirm(e.target.value)}
                      placeholder='Type DELETE to confirm'
                      autoFocus
                      style={{
                        padding: '6px 10px', borderRadius: 6,
                        border: '1px solid rgba(180,50,50,0.4)',
                        background: 'var(--bg)', width: 200,
                        fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text)',
                        outline: 'none',
                      }}
                    />
                    <button
                      onClick={handleClearAll}
                      disabled={deleteConfirm !== 'DELETE'}
                      style={{
                        padding: '6px 14px', borderRadius: 6, border: 'none',
                        background: deleteConfirm === 'DELETE' ? '#c0392b' : 'var(--border)',
                        color: deleteConfirm === 'DELETE' ? '#fff' : 'var(--muted)',
                        fontFamily: 'var(--font-sans)', fontSize: 13,
                        cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed',
                        transition: 'background 0.15s',
                      }}
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => { setShowDeleteInput(false); setDeleteConfirm(''); }}
                      style={{
                        padding: '6px 10px', borderRadius: 6,
                        border: '1px solid var(--border)', background: 'transparent',
                        color: 'var(--muted)', fontFamily: 'var(--font-sans)',
                        fontSize: 13, cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {!showDeleteInput && (
                <button
                  onClick={() => setShowDeleteInput(true)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
                    color: '#a03030', flexShrink: 0,
                    transition: 'opacity 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  Clear data
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT ──────────────────────────────────────────── */}
      <section style={{ marginBottom: 60 }}>
        <SectionTitle>About</SectionTitle>
        <div style={{ padding: '20px 0' }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
            color: 'var(--text)', marginBottom: 4,
          }}>
            Logit v1.0
          </div>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: 13, fontStyle: 'italic',
            color: 'var(--secondary)',
          }}>
            Built locally. Stored locally. Yours, locally.
          </div>
        </div>
      </section>

    </div>
  );
}
