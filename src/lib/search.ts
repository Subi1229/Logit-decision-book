import Fuse from 'fuse.js';
import type { Entry } from '../db/database';

export function buildFuse(entries: Entry[]) {
  return new Fuse(entries, {
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    keys: [
      { name: 'title',        weight: 3 },
      { name: 'decision',     weight: 2 },
      { name: 'why',          weight: 2 },
      { name: 'context',      weight: 1 },
      { name: 'alternatives', weight: 0.5 },
      { name: 'tradeoffs',    weight: 0.5 },
    ],
  });
}

export function searchEntries(entries: Entry[], query: string): Entry[] {
  if (!query.trim()) return entries;
  const fuse = buildFuse(entries);
  return fuse.search(query).map(r => r.item);
}
