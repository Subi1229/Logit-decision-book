import { useState } from 'react';
import type { Entry } from '../db/database';
import type { WeeklyStats } from '../lib/weeklyReview';

interface Props {
  entries: Entry[];
  weeklyStats: WeeklyStats;
  onOpenWeeklyReview: () => void;
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const TIME_PARTS = ['Morning','Afternoon','Evening'];

function dayTimeLabel() {
  const now = new Date();
  const day = DAY_NAMES[now.getDay()];
  const hour = now.getHours();
  const time = hour < 12 ? TIME_PARTS[0] : hour < 17 ? TIME_PARTS[1] : TIME_PARTS[2];
  return `${day} ${time}`;
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

function weekSummary(count: number, period: string): string {
  if (count === 0) return 'Nothing logged yet. Start the record.';
  if (count === 1) return `You logged 1 decision ${period}. Keep the momentum going.`;
  return `You logged ${count} decisions ${period}. Good week.`;
}

export function MobileHero({ entries, weeklyStats, onOpenWeeklyReview }: Props) {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const projects = new Set(entries.map(e => e.project).filter(Boolean));
  const avgConf = weeklyStats.avgConfidence;

  const bannerCount = weeklyStats.thisWeekCount > 0 ? weeklyStats.thisWeekCount : weeklyStats.lastWeekCount;
  const bannerPeriod = weeklyStats.thisWeekCount > 0 ? 'this week' : 'last week';
  const showBanner = !bannerDismissed && bannerCount > 0;

  const stats = [
    { label: 'Total entries', value: String(entries.length) },
    { label: 'This week', value: String(weeklyStats.thisWeekCount) },
    { label: 'Avg confidence', value: avgConf != null ? avgConf.toFixed(1) : '—' },
    { label: 'Projects', value: String(projects.size) },
  ];

  return (
    <div style={{ marginBottom: 20 }}>
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
        fontWeight: 400, color: 'var(--text)', margin: '0 0 18px',
        lineHeight: 1.2,
      }}>
        A record of why.
      </h1>

      {/* Stats grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
        marginBottom: showBanner ? 12 : 0,
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

      {/* Weekly review banner — left-accent card style */}
      {showBanner && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderLeft: '3px solid #D4A853',
          borderRadius: 10,
          padding: '14px 16px',
        }}>
          {/* Eyebrow */}
          <div style={{
            fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.09em', textTransform: 'uppercase',
            color: '#D4A853', marginBottom: 8,
          }}>
            {dayTimeLabel()} · Weekly Review
          </div>

          {/* Summary sentence */}
          <p style={{
            fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: 1.55,
            color: 'var(--text)', margin: '0 0 14px',
          }}>
            {weekSummary(bannerCount, bannerPeriod).split(/(\d+ decision(?:s)?)/).map((part, i) =>
              /\d+ decision/.test(part)
                ? <strong key={i}>{part}</strong>
                : part
            )}
          </p>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={onOpenWeeklyReview}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text)',
                borderBottom: '1px solid var(--text)',
                paddingBottom: 1,
              }}
            >
              Open weekly review →
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--muted)',
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
