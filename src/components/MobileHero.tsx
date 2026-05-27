import type { Entry } from '../db/database';
import type { WeeklyStats } from '../lib/weeklyReview';
import { ChevronRightIcon } from './Icons';

interface Props {
  entries: Entry[];
  weeklyStats: WeeklyStats;
  onOpenWeeklyReview: () => void;
}

function thisWeekLabel() {
  const now = new Date();
  const day = now.getDay();
  const daysBack = day === 0 ? 6 : day - 1;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack);
  const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
  const fmt = (d: Date) => `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
  return `${fmt(mon)} – ${fmt(sun)}`;
}

export function MobileHero({ entries, weeklyStats, onOpenWeeklyReview }: Props) {
  const projects = new Set(entries.map(e => e.project).filter(Boolean));
  const avgConf = weeklyStats.avgConfidence;

  const stats = [
    { label: 'Total entries', value: String(entries.length) },
    { label: 'This week', value: String(weeklyStats.thisWeekCount) },
    { label: 'Avg confidence', value: avgConf != null ? avgConf.toFixed(1) : '—' },
    { label: 'Projects', value: String(projects.size) },
  ];

  return (
    <div style={{ marginBottom: 24 }}>
      {/* Eyebrow */}
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: 'var(--muted)', marginBottom: 6,
      }}>
        {thisWeekLabel()}
      </div>

      {/* Headline */}
      <h1 style={{
        fontFamily: 'var(--font-serif)', fontSize: 26, fontStyle: 'italic',
        fontWeight: 400, color: 'var(--text)', margin: '0 0 20px',
        lineHeight: 1.2,
      }}>
        A record of why.
      </h1>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        marginBottom: weeklyStats.thisWeekCount > 0 ? 12 : 0,
      }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 20, fontWeight: 600,
              color: 'var(--text)', lineHeight: 1,
            }}>
              {s.value}
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--muted)',
              marginTop: 4,
            }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Weekly review banner */}
      {weeklyStats.thisWeekCount > 0 && (
        <button
          onClick={onOpenWeeklyReview}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 10,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 600,
              color: 'var(--text)',
            }}>
              Weekly review
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)', fontSize: 11, color: 'var(--muted)',
              marginTop: 2,
            }}>
              {weeklyStats.thisWeekCount} {weeklyStats.thisWeekCount === 1 ? 'entry' : 'entries'} logged this week
            </div>
          </div>
          <span style={{ color: 'var(--muted)', flexShrink: 0, display: 'flex' }}>
            <ChevronRightIcon size={16} />
          </span>
        </button>
      )}
    </div>
  );
}
