import type { Entry } from '../db/database';

const SHOWN_KEY = 'logit-weekly-review-shown';

export function getThisMonday6am(): number {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const daysBack = day === 0 ? 6 : day - 1;
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysBack, 6, 0, 0, 0);
  return mon.getTime();
}

export function shouldShowWeeklyReview(enabled: boolean): boolean {
  if (!enabled) return false;
  const thisMonday6am = getThisMonday6am();
  if (Date.now() < thisMonday6am) return false;
  const lastShown = Number(localStorage.getItem(SHOWN_KEY) ?? 0);
  return lastShown < thisMonday6am;
}

export function markWeeklyReviewShown() {
  localStorage.setItem(SHOWN_KEY, String(Date.now()));
}

export function resetWeeklyReviewShown() {
  localStorage.removeItem(SHOWN_KEY);
}

export function needsRevisitCheck(entry: Entry, thresholdDays: number): boolean {
  const ms = thresholdDays * 86400000;
  if (Date.now() - entry.createdAt < ms) return false;
  if (!entry.revisits?.length) return true;
  const latest = Math.max(...entry.revisits.map(r => r.date));
  return Date.now() - latest > ms;
}

export interface WeeklyStats {
  thisWeekCount: number;
  lastWeekCount: number;
  mostActiveProject: string | null;
  avgConfidence: number | null;
  lastWeekAvgConfidence: number | null;
  worthRevisiting: Entry[];
  projectCounts: { project: string; count: number }[];
}

export function computeWeeklyStats(entries: Entry[]): WeeklyStats {
  const thisMonday = getThisMonday6am();
  const lastMonday = thisMonday - 7 * 86400000;

  const thisWeek = entries.filter(e => e.createdAt >= thisMonday);
  const lastWeek = entries.filter(e => e.createdAt >= lastMonday && e.createdAt < thisMonday);

  // Project counts this week (fall back to all-time if empty)
  const base = thisWeek.length > 0 ? thisWeek : entries;
  const projectMap = new Map<string, number>();
  for (const e of base) {
    if (e.project) projectMap.set(e.project, (projectMap.get(e.project) ?? 0) + 1);
  }
  const projectCounts = [...projectMap.entries()]
    .map(([project, count]) => ({ project, count }))
    .sort((a, b) => b.count - a.count);

  const mostActiveProject = projectCounts[0]?.project ?? null;

  function avgConf(arr: Entry[]) {
    const withConf = arr.filter(e => e.confidence != null);
    if (!withConf.length) return null;
    return withConf.reduce((s, e) => s + e.confidence!, 0) / withConf.length;
  }

  const worthRevisiting = entries
    .filter(e => e.confidence != null && e.confidence <= 2)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);

  return {
    thisWeekCount:          thisWeek.length,
    lastWeekCount:          lastWeek.length,
    mostActiveProject,
    avgConfidence:          avgConf(thisWeek.length ? thisWeek : entries),
    lastWeekAvgConfidence:  avgConf(lastWeek),
    worthRevisiting,
    projectCounts,
  };
}
