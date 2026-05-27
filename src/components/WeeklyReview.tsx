import { type WeeklyStats } from '../lib/weeklyReview';
import { relativeTime } from '../lib/dates';
import { ConfidenceDots } from './ConfidenceDots';
import { useMobile } from '../hooks/useMobile';

interface Props {
  stats: WeeklyStats;
  onClose: () => void;
  onOpenEntry: (id: string) => void;
}

const HEADLINES = [
  'Quiet, considered work.',
  'A week of decisions made.',
  'The record grows.',
  'Another week, well documented.',
  'Decisions captured, intentions clear.',
  'The log remembers what memory forgets.',
];

function getWeekRange() {
  const now = new Date();
  const day = now.getDay();
  const daysBack = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysBack);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monday)} – ${fmt(sunday)}, ${now.getFullYear()}`;
}

function headline(count: number): string {
  if (count === 0) return 'Nothing logged this week.';
  return HEADLINES[count % HEADLINES.length];
}

export function WeeklyReview({ stats, onClose, onOpenEntry }: Props) {
  const isMobile = useMobile();
  const { thisWeekCount, lastWeekCount, mostActiveProject, avgConfidence, lastWeekAvgConfidence, worthRevisiting, projectCounts } = stats;

  const countDelta = thisWeekCount - lastWeekCount;
  const confDelta = avgConfidence != null && lastWeekAvgConfidence != null
    ? +(avgConfidence - lastWeekAvgConfidence).toFixed(1)
    : null;

  const mostActiveCount = mostActiveProject
    ? projectCounts.find(p => p.project === mostActiveProject)?.count ?? 0
    : 0;

  const pad = isMobile ? '20px' : '32px';

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 80, animation: 'overlay-in 0.18s ease',
      }} />

      {/* Modal — bottom sheet on mobile, centered on desktop */}
      <div style={{
        position: 'fixed',
        ...(isMobile
          ? { bottom: 0, left: 0, right: 0, top: 'auto', transform: 'none', borderRadius: '16px 16px 0 0', maxHeight: '92vh' }
          : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 'min(620px, calc(100vw - 32px))', borderRadius: 14, maxHeight: 'calc(100vh - 48px)' }
        ),
        overflowY: 'auto',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        zIndex: 90,
        animation: isMobile
          ? 'sheet-in 0.22s cubic-bezier(0.16,1,0.3,1)'
          : 'modal-in 0.18s cubic-bezier(0.16,1,0.3,1)',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.14)',
      }}>

        {/* Drag handle (mobile only) */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border)' }} />
          </div>
        )}

        {/* ── Hero section ──────────────────────────────────── */}
        <div style={{ padding: `${isMobile ? '16px' : '28px'} ${pad} 20px`, borderBottom: '1px solid var(--border)' }}>
          {/* Eyebrow */}
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--accent)', marginBottom: 8,
          }}>
            This Week's Review
          </div>

          {/* Headline */}
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: isMobile ? 24 : 28, fontWeight: 400,
            fontStyle: 'italic', color: 'var(--text)',
            margin: '0 0 8px', lineHeight: 1.25, letterSpacing: '-0.01em',
          }}>
            {headline(thisWeekCount)}
          </h2>

          {/* Date range + skip */}
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 13,
            color: 'var(--secondary)', letterSpacing: '0.005em',
          }}>
            {getWeekRange()} · <span
              onClick={onClose}
              style={{ cursor: 'pointer', color: 'var(--muted)' }}
            >You can skip this anytime.</span>
          </div>
        </div>

        {/* ── Stat cards ────────────────────────────────────── */}
        <div style={{ padding: `20px ${pad}`, borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 10 }}>

            {/* Entries this week */}
            <div style={statCard}>
              <div style={statLabel}>Entries this week</div>
              <div style={statValue}>{thisWeekCount}</div>
              {countDelta !== 0 && (
                <div style={{ ...statSub, color: countDelta > 0 ? '#4caf50' : 'var(--accent)' }}>
                  {countDelta > 0 ? '+' : ''}{countDelta} vs last week
                </div>
              )}
              {countDelta === 0 && lastWeekCount > 0 && (
                <div style={{ ...statSub, color: 'var(--muted)' }}>same as last week</div>
              )}
            </div>

            {/* Most active project */}
            <div style={statCard}>
              <div style={statLabel}>Most active project</div>
              {mostActiveProject ? (
                <>
                  <div style={{ ...statValue, fontStyle: 'italic', fontSize: mostActiveProject.length > 10 ? 18 : 24 }}>
                    {mostActiveProject}
                  </div>
                  <div style={statSub}>
                    {mostActiveCount} of {thisWeekCount || projectCounts.reduce((s, p) => s + p.count, 0)} entries
                  </div>
                </>
              ) : (
                <div style={{ ...statValue, color: 'var(--muted)' }}>—</div>
              )}
            </div>

            {/* Avg confidence — spans full width on mobile (3rd in 2-col grid) */}
            <div style={{ ...statCard, ...(isMobile ? { gridColumn: '1 / -1' } : {}) }}>
              <div style={statLabel}>Avg. Confidence</div>
              {avgConfidence != null ? (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <div style={statValue}>{avgConfidence.toFixed(1)}</div>
                  {confDelta !== null && confDelta !== 0 && (
                    <div style={{ ...statSub, color: confDelta > 0 ? '#4caf50' : 'var(--accent)' }}>
                      {confDelta > 0 ? '↑' : '↓'} {Math.abs(confDelta)} vs last week
                    </div>
                  )}
                  {(confDelta === null || confDelta === 0) && (
                    <div style={statSub}>out of 5</div>
                  )}
                </div>
              ) : (
                <div style={{ ...statValue, color: 'var(--muted)' }}>—</div>
              )}
            </div>
          </div>
        </div>

        {/* ── Worth revisiting ──────────────────────────────── */}
        <div style={{ padding: `20px ${pad} 24px` }}>
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 400,
            color: '#1a1a1a', marginBottom: 6,
          }}>
            Worth revisiting
          </div>
          <div style={{
            fontFamily: 'var(--font-serif)', fontSize: 14, fontStyle: 'italic',
            color: 'var(--secondary)', marginBottom: worthRevisiting.length ? 16 : 0,
          }}>
            {worthRevisiting.length > 0
              ? 'You logged these but flagged them as uncertain.'
              : 'No low-confidence entries to revisit — solid week.'}
          </div>

          {worthRevisiting.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {worthRevisiting.map(e => (
                <button
                  key={e.id}
                  onClick={() => { onOpenEntry(e.id); onClose(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left', width: '100%', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{
                    flex: 1, fontFamily: 'var(--font-sans)', fontSize: 13,
                    color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {e.title}
                  </span>
                  {e.project && (
                    <span style={{
                      fontFamily: 'var(--font-sans)', fontSize: 11,
                      color: 'var(--muted)', flexShrink: 0,
                    }}>
                      {e.project}
                    </span>
                  )}
                  <ConfidenceDots value={e.confidence} />
                  <span style={{
                    fontFamily: 'var(--font-sans)', fontSize: 11,
                    color: 'var(--muted)', flexShrink: 0,
                  }}>
                    {relativeTime(e.createdAt)}
                  </span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: 'var(--muted)', flexShrink: 0 }}>
                    <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer ────────────────────────────────────────── */}
        <div style={{
          padding: isMobile ? `12px ${pad} 28px` : `14px ${pad}`,
          borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: isMobile ? 'stretch' : 'flex-end',
        }}>
          <button onClick={onClose} style={{
            flex: isMobile ? 1 : undefined,
            padding: isMobile ? '12px 20px' : '7px 20px',
            borderRadius: isMobile ? 10 : 7,
            border: 'none',
            background: 'var(--accent)', color: '#fff',
            fontFamily: 'var(--font-sans)', fontSize: isMobile ? 15 : 13, fontWeight: 500,
            cursor: 'pointer',
          }}>
            Done
          </button>
        </div>
      </div>
    </>
  );
}

const statCard: React.CSSProperties = {
  background: 'var(--bg)',
  borderRadius: 10,
  padding: '14px 16px 12px',
  border: '1px solid var(--border)',
};

const statLabel: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 500,
  letterSpacing: '0.08em', textTransform: 'uppercase',
  color: 'var(--muted)', marginBottom: 8,
};

const statValue: React.CSSProperties = {
  fontFamily: 'var(--font-serif)', fontSize: 26, fontWeight: 400,
  color: 'var(--text)', lineHeight: 1.1, marginBottom: 4,
};

const statSub: React.CSSProperties = {
  fontFamily: 'var(--font-sans)', fontSize: 12,
  color: 'var(--muted)',
};
