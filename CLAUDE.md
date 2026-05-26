# Logit — Claude context

## Stack
- React 18 + Vite + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`) — use inline styles for layout-critical rules; Tailwind for utilities
- Dexie.js + dexie-react-hooks (IndexedDB)
- react-hotkeys-hook, Fuse.js, nanoid
- Fonts: Newsreader (serif, body text) + Geist (sans, UI chrome) via @fontsource

## Architecture
- No backend, no auth — all data in IndexedDB via Dexie
- State-based router in App.tsx: `{ name: 'list' } | { name: 'detail', id }`
- `src/db/database.ts` — Dexie schema + Entry interface
- `src/db/seed.ts` — seeds 6 example entries on first run (transaction-guarded)
- `src/hooks/useEntries.ts` — `useLiveQuery` reactive hook
- `src/hooks/useTheme.ts` — light/dark/system, persisted to localStorage
- `src/lib/dates.ts` — groupLabel, relativeTime, groupEntries

## CSS conventions
- CSS variables for all colours: `--bg`, `--surface`, `--text`, `--secondary`, `--muted`, `--accent`, `--border`
- Theme tokens in `src/index.css`, applied via `[data-theme="light"|"dark"]` on `<html>`
- Serif body fields use `.logit-field` class (borderless + bottom hairline, accent on focus)
- Title inputs use `.logit-field.logit-field-title`
- Modal/toast animations defined as keyframes in `index.css`

## New libs
- `src/lib/search.ts` — Fuse.js instance, `searchEntries(entries, query)` returns ranked results
- `src/lib/export.ts` — `exportEntryMarkdown`, `exportEntriesMarkdown`, `exportEntriesJSON`, `importEntriesJSON`
- `src/lib/weeklyReview.ts` — `shouldShowWeeklyReview`, `markWeeklyReviewShown`, `computeWeeklyStats`

## New hooks
- `src/hooks/useSettings.ts` — Settings (bodyFont, weeklyReviewEnabled, revisitPromptsEnabled, revisitThreshold); applies `data-font` attr to `<html>`
- `src/hooks/useMobile.ts` — `useMobile(breakpoint)` MediaQueryList listener

## Components
- `EntryModal` — quick-capture modal; accepts `initialValues` for pre-filling (duplicate flow); `fullScreen` prop for mobile sheet
- `DetailView` — full reading/editing view; `isRevising` mode appends revisit record
- `ListView` + `LeftRail` — home screen with project/type filters
- `EntryRow` — list item; two-click delete; `isMobile` + `onLongPress` for mobile long-press (500ms)
- `LeftRail` — `isMobile` prop: renders native `<select>` dropdowns instead of full rail
- `WeeklyReview` — modal with stat blocks, mini bar chart SVG, low-confidence list
- `SettingsView` — full settings page: theme, body font, review toggles, export/import, danger zone
- `Toast` — fixed bottom-right, auto-dismisses

## Key behaviours
- Cmd+N opens EntryModal from anywhere; `initialValues` pre-fills for duplicate
- List → Detail preserves scroll position via `listScrollPos` ref; restores on back
- DetailView: 'e' = edit, 'd' = duplicate, Cmd+Delete = delete prompt, Esc = cancel/back
- Revisit card shows if entry.createdAt > 30 days and no revisit in last 30 days
- "Revise" sets `isRevising=true`; save appends `{ outcome: 'revised', note }` to entry.revisits
- "Still right" appends `{ outcome: 'confirmed' }` immediately without entering edit mode
- Cmd+N opens EntryModal from anywhere
- Cmd+Enter = save & close; Cmd+Shift+Enter = save & new
- Esc with dirty fields → inline discard prompt (no `window.confirm`)
- Delete in EntryRow is two-click (no `window.confirm`)
- Seed uses Dexie `rw` transaction to prevent StrictMode double-fire

## Do not
- Add `window.confirm`, `window.alert`, or `window.prompt` — use inline UI
- Use `window.confirm` for any destructive action
- Add a backend or auth layer
- Break the Entry interface schema in database.ts without migrating Dexie version
