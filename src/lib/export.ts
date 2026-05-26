import type { Entry } from '../db/database';
import { db } from '../db/database';
import { nanoid } from 'nanoid';

function pad(n: number) { return String(n).padStart(2, '0'); }

function dateStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function entryToMarkdown(e: Entry): string {
  const lines: string[] = [];
  lines.push(`# ${e.title}`, '');
  if (e.project)    lines.push(`**Project:** ${e.project}  `);
  if (e.type)       lines.push(`**Type:** ${e.type}  `);
  if (e.confidence) lines.push(`**Confidence:** ${e.confidence}/5  `);
  lines.push(`**Date:** ${new Date(e.createdAt).toLocaleDateString()}`, '');
  lines.push('## Context', '', e.context, '');
  lines.push('## Decision', '', e.decision, '');
  lines.push('## Why', '', e.why, '');
  if (e.alternatives) lines.push('## Alternatives', '', e.alternatives, '');
  if (e.tradeoffs)    lines.push('## Tradeoffs',    '', e.tradeoffs,    '');
  if (e.revisits?.length) {
    lines.push('## Revisit History', '');
    for (const r of e.revisits) {
      lines.push(`- **${r.outcome}** — ${new Date(r.date).toLocaleDateString()}${r.note ? `: ${r.note}` : ''}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

export function exportEntryMarkdown(entry: Entry) {
  const slug = entry.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
  download(entryToMarkdown(entry), `logit-${slug}-${dateStamp()}.md`, 'text/markdown');
}

export function exportEntriesMarkdown(entries: Entry[]) {
  const content = entries.map(entryToMarkdown).join('\n\n---\n\n');
  download(content, `logit-export-${dateStamp()}.md`, 'text/markdown');
}

export function exportEntriesJSON(entries: Entry[]) {
  download(
    JSON.stringify({ version: 1, exportedAt: Date.now(), entries }, null, 2),
    `logit-export-${dateStamp()}.json`,
    'application/json',
  );
}

export function exportEntriesCSV(entries: Entry[]) {
  const cols = ['title', 'project', 'type', 'confidence', 'context', 'decision', 'why', 'alternatives', 'tradeoffs', 'createdAt'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [cols.join(','), ...entries.map(e => [
    esc(e.title), esc(e.project), esc(e.type), esc(e.confidence),
    esc(e.context), esc(e.decision), esc(e.why), esc(e.alternatives), esc(e.tradeoffs),
    esc(new Date(e.createdAt).toISOString()),
  ].join(','))];
  download(rows.join('\n'), `logit-export-${dateStamp()}.csv`, 'text/csv');
}

export async function importEntriesJSON(file: File): Promise<number> {
  const text = await file.text();
  const data = JSON.parse(text) as { entries?: Entry[] };
  if (!Array.isArray(data.entries)) throw new Error('Invalid Logit export file');
  const now = Date.now();
  const remapped: Entry[] = data.entries.map(e => ({
    ...e,
    id: nanoid(),           // always fresh id to avoid collisions
    updatedAt: e.updatedAt ?? now,
    createdAt: e.createdAt ?? now,
  }));
  await db.entries.bulkAdd(remapped);
  return remapped.length;
}
