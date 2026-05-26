import { nanoid } from 'nanoid';
import { db, type Entry } from './database';

const seedEntries: Omit<Entry, 'id'>[] = [
  {
    title: 'Use bottom navigation over hamburger menu on mobile',
    context:
      'We were redesigning the mobile nav for the consumer app. The hamburger menu had been in place since v1 but analytics showed a 34% drop-off on menu interactions. Users were struggling to discover secondary sections.',
    decision:
      'Switch to a persistent bottom tab bar with five destinations: Home, Explore, Saved, Notifications, Profile.',
    why:
      'Bottom nav keeps primary actions in thumb reach. It surfaces all top-level sections simultaneously, eliminating the discoverability problem. iOS and Android both have strong bottom-nav conventions users are trained to expect.',
    alternatives:
      'Keep hamburger with improved animation and labels. Top tab bar. Gesture-based navigation (swipe between sections).',
    tradeoffs:
      'Loses ~80px of vertical screen space. Five-tab constraint means we can\'t expose more than five destinations — forces prioritisation decisions we\'ve been avoiding. On tablets the bottom nav feels awkward.',
    project: 'Consumer App',
    type: 'interaction',
    confidence: 4,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    revisits: [
      {
        date: Date.now() - 1000 * 60 * 60 * 24 * 7,
        note: 'Three weeks post-launch. Menu interaction rate up 61%. Session depth increased. No significant complaints about screen real estate loss.',
        outcome: 'confirmed',
      },
    ],
  },
  {
    title: 'Newsreader serif for editorial body copy',
    context:
      'Choosing the type system for Logit\'s reading experience. The app is primarily a writing and reading tool — decisions are dense text, sometimes 400–600 words. The previous prototype used a system sans-serif and felt like a form, not a journal.',
    decision:
      'Newsreader (Google Fonts / Fontsource) at 17px/28px line-height for body. Geist for all UI chrome — labels, metadata, buttons.',
    why:
      'Newsreader was designed for reading-optimised digital contexts. It has excellent optical sizing at body sizes, comfortable letter-spacing, and a warmth that sans-serif lacks for long-form. The serif/sans pairing creates a clear hierarchy between content and interface.',
    alternatives:
      'Lora (too literary, not analytical enough). Fraunces (too expressive). System serif stack (inconsistent cross-platform). All-Geist (clean but cold for a reflective tool).',
    tradeoffs:
      'Two font loads adds ~80KB. Newsreader has limited weights — no light variant, so UI contrast depends on size and colour rather than weight.',
    project: 'Logit',
    type: 'visual',
    confidence: 5,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 22,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 22,
  },
  {
    title: 'Confidence score 1–5 instead of qualitative labels',
    context:
      'Designing the metadata system for decision entries. Wanted a way to capture how certain the designer felt at decision time, to aid future retrospectives. Initial prototype used labels: "Tentative / Considered / Confident".',
    decision:
      'Use a numeric 1–5 scale, no labels, rendered as filled dots in the UI.',
    why:
      'Labels force premature categorisation and compress nuance. Numbers let people land between named states. Dots are faster to scan in a list than text. The lack of labels keeps the designer honest — they have to feel the number, not pick the closest word.',
    alternatives:
      'Three-point scale (simpler but too coarse). Five-point with labels. Emoji (too casual for a reflective tool). Remove confidence entirely.',
    tradeoffs:
      'Without labels, new users may not calibrate consistently. The scale is subjective and not comparable across different designers. Need to add tooltip/onboarding to explain.',
    project: 'Logit',
    type: 'ia',
    confidence: 3,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 18,
  },
  {
    title: 'IndexedDB (Dexie) over localStorage for all data persistence',
    context:
      'Logit is local-first with no backend. Needed to choose a persistence layer that would handle potentially hundreds of entries, each with rich structured data, without hitting storage limits or blocking the main thread.',
    decision:
      'Dexie.js wrapping IndexedDB. All entry data, including revisits array, stored as structured objects.',
    why:
      'localStorage has a 5MB cap and is synchronous — both dealbreakers for a data-heavy writing tool. IndexedDB is async, quota is much higher (origin-based, typically GBs), and Dexie provides a clean query API that makes range queries and filtering straightforward.',
    alternatives:
      'localStorage with JSON serialisation (simple but limited). OPFS (more control, but complex API, no good wrapper). SQLite via WASM (technically interesting but overkill for solo app, heavy bundle).',
    tradeoffs:
      'IndexedDB data doesn\'t survive "Clear site data" in DevTools. No out-of-box encryption. Export/import story needs to be built manually. Dexie adds ~30KB to bundle.',
    project: 'Logit',
    type: 'technical',
    confidence: 5,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 14,
  },
  {
    title: 'No autosave — explicit save with Cmd+S',
    context:
      'Designing the write/edit experience. Autosave is a default assumption in most modern tools. But Logit entries are decisions, not documents — they benefit from deliberate commitment rather than passive capture.',
    decision:
      'No autosave. Cmd+S saves. Unsaved state shown as a small indicator dot in the title bar. Navigation away prompts confirmation if unsaved.',
    why:
      'The friction of saving is intentional — it creates a moment of commitment that mirrors the nature of a decision. Autosave blurs the line between drafting and deciding. The indicator dot keeps users aware of state without anxiety.',
    alternatives:
      'Autosave every 30s (feels passive). Autosave on field blur (confusing — save when? during typing?). Draft system with explicit publish step (overengineered for v1).',
    tradeoffs:
      'Risk of accidental data loss if user closes tab without saving. Users conditioned by Notion/Figma may find explicit save jarring initially. Have to build the confirmation dialog.',
    project: 'Logit',
    type: 'interaction',
    confidence: 4,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 9,
  },
  {
    title: 'Rust/terracotta as the single accent colour',
    context:
      'Building out the colour system. Had been using a neutral palette (warm whites, warm greys, near-blacks) throughout. Needed one accent for interactive elements, the wordmark dot, confidence fills, and highlights.',
    decision:
      'Rust/terracotta — #B4623F light mode, #D88560 dark mode. Used sparingly: wordmark dot, links, active states, confidence dots, primary CTA.',
    why:
      'Rust reads as considered and editorial without the corporate associations of blue or the playfulness of orange. It pairs naturally with warm neutrals. Using one accent forces discipline — you can\'t hide poor hierarchy behind colour variety.',
    alternatives:
      'Warm blue (calm but generic for this space). Sage green (currently overcrowded in the "calm productivity" category). No accent / pure monochrome (would work but loses the warmth and brand legibility).',
    tradeoffs:
      'Rust can read as "startup brand colour" in certain contexts. Some accessibility considerations at smaller sizes — need to verify contrast on secondary surfaces.',
    project: 'Logit',
    type: 'visual',
    confidence: 5,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
    updatedAt: Date.now() - 1000 * 60 * 60 * 24 * 4,
  },
];

export async function seedIfEmpty() {
  await db.transaction('rw', db.entries, async () => {
    const count = await db.entries.count();
    if (count > 0) return;
    const entries: Entry[] = seedEntries.map((e) => ({ ...e, id: nanoid() }));
    await db.entries.bulkAdd(entries);
    console.log('[logit] seeded', entries.length, 'example entries');
  });
}
