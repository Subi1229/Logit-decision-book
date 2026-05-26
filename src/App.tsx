import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { TopBar } from './components/TopBar';
import { ListView } from './components/ListView';
import { DetailView } from './components/DetailView';
import { EntryModal } from './components/EntryModal';
import { SettingsView } from './components/SettingsView';
import { WeeklyReview } from './components/WeeklyReview';
import { Toast } from './components/Toast';
import { Sidebar } from './components/Sidebar';
import { HomeScreen } from './components/HomeScreen';
import type { BrowseFilter } from './components/Sidebar';
import { useTheme } from './hooks/useTheme';
import { useSettings } from './hooks/useSettings';
import { useMobile } from './hooks/useMobile';
import { useEntries } from './hooks/useEntries';
import { seedIfEmpty } from './db/seed';
import { shouldShowWeeklyReview, markWeeklyReviewShown, computeWeeklyStats } from './lib/weeklyReview';
import type { Entry } from './db/database';

type View = 'list' | 'settings' | { id: string };


export default function App() {
  const { theme, setTheme, cycle }     = useTheme();
  const { settings, update: updateSettings } = useSettings();
  const isMobile                       = useMobile();
  const entries                        = useEntries() ?? [];
  const [view, setView]                = useState<View>('list');
  const [modalOpen, setModalOpen]      = useState(false);
  const [modalInitial, setModalInitial] = useState<Partial<Entry> | undefined>();
  const [weeklyOpen, setWeeklyOpen]    = useState(false);
  const [toast, setToast]              = useState<string | null>(null);
  const [searchQuery, setSearchQuery]  = useState('');
  const [browseFilter, setBrowseFilter] = useState<BrowseFilter>('all');
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [activeType, setActiveType]    = useState<string | null>(null);
  const listScrollPos                  = useRef(0);
  const searchRef                      = useRef<HTMLInputElement>(null);

  useEffect(() => { seedIfEmpty(); }, []);

  useEffect(() => {
    if (shouldShowWeeklyReview(settings.weeklyReviewEnabled)) {
      setWeeklyOpen(true);
      markWeeklyReviewShown();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = useCallback((msg: string) => setToast(msg), []);

  const openModal = useCallback((initial?: Partial<Entry>) => {
    setModalInitial(initial);
    setModalOpen(true);
  }, []);
  const closeModal = useCallback(() => { setModalOpen(false); setModalInitial(undefined); }, []);

  function goToDetail(id: string) {
    listScrollPos.current = window.scrollY;
    setView({ id });
    setSearchQuery('');
    if (isMobile) window.scrollTo(0, 0);
  }
  function goToList() {
    setView('list');
    if (isMobile) requestAnimationFrame(() => window.scrollTo(0, listScrollPos.current));
  }

  useHotkeys('mod+n', e => { e.preventDefault(); openModal(); }, { enableOnFormTags: false });
  useHotkeys('mod+k', e => { e.preventDefault(); searchRef.current?.focus(); searchRef.current?.select(); }, { enableOnFormTags: false });

  const currentEntry = typeof view === 'object' ? entries.find(e => e.id === view.id) : null;

  const existingProjects = useMemo(
    () => [...new Set(entries.map(e => e.project).filter(Boolean) as string[])].sort(),
    [entries],
  );

  const duplicateEntry = (e: Entry) => openModal({
    title: e.title + ' (copy)',
    context: e.context, decision: e.decision, why: e.why,
    alternatives: e.alternatives, tradeoffs: e.tradeoffs,
    project: e.project, type: e.type, confidence: e.confidence,
  });

  const weeklyStats = useMemo(() => computeWeeklyStats(entries), [entries]);

  /* ── Desktop two-panel layout ─────────────────────────────── */
  if (!isMobile) {
    return (
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
        {/* Sidebar — always visible on desktop */}
        {view !== 'settings' && typeof view !== 'object' && (
          <Sidebar
            entries={entries}
            browseFilter={browseFilter}
            activeProject={activeProject}
            activeType={activeType}
            revisitThreshold={settings.revisitThreshold}
            onBrowse={setBrowseFilter}
            onProject={setActiveProject}
            onType={setActiveType}
            onOpenSettings={() => setView('settings')}
          />
        )}

        {/* Main panel */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {view === 'list' && (
            <HomeScreen
              entries={entries}
              browseFilter={browseFilter}
              activeProject={activeProject}
              activeType={activeType}
              revisitThreshold={settings.revisitThreshold}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onOpen={goToDetail}
              onNewEntry={() => openModal()}
              onOpenWeeklyReview={() => setWeeklyOpen(true)}
              onCycleTheme={cycle}
              onOpenSettings={() => setView('settings')}
              theme={theme}
              onBrowse={setBrowseFilter}
              onProject={setActiveProject}
              onType={setActiveType}
            />
          )}

          {typeof view === 'object' && currentEntry && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
              <DetailView
                entry={currentEntry}
                allEntries={entries}
                onBack={goToList}
                onOpen={goToDetail}
                onDuplicate={duplicateEntry}
                onDeleted={goToList}
                onToast={showToast}
                revisitPromptsEnabled={settings.revisitPromptsEnabled}
                revisitThreshold={settings.revisitThreshold}
                isMobile={false}
              />
            </div>
          )}

          {typeof view === 'object' && !currentEntry && entries.length > 0 && (
            <div style={{ padding: '32px 40px' }}>
              <button onClick={goToList} style={{
                background: 'none', border: 'none', fontFamily: 'var(--font-sans)',
                fontSize: 13, color: 'var(--accent)', cursor: 'pointer', padding: 0,
              }}>← All entries</button>
            </div>
          )}

          {view === 'settings' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
              <SettingsView
                settings={settings}
                onUpdate={updateSettings}
                theme={theme}
                onThemeChange={setTheme}
                onBack={goToList}
                onOpenWeeklyReview={() => setWeeklyOpen(true)}
                onToast={showToast}
              />
            </div>
          )}
        </div>

        <EntryModal
          open={modalOpen}
          existingProjects={existingProjects}
          initialValues={modalInitial}
          fullScreen={false}
          onClose={closeModal}
          onSaved={showToast}
        />

        {weeklyOpen && (
          <WeeklyReview
            stats={weeklyStats}
            onClose={() => setWeeklyOpen(false)}
            onOpenEntry={id => { setWeeklyOpen(false); goToDetail(id); }}
          />
        )}

        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </div>
    );
  }

  /* ── Mobile layout (original TopBar + ListView) ───────────── */
  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)' }}>
      <TopBar
        theme={theme}
        onCycleTheme={cycle}
        onNewEntry={() => openModal()}
        onOpenSettings={() => setView('settings')}
        searchQuery={searchQuery}
        onSearchChange={q => { setSearchQuery(q); if (view !== 'list') goToList(); }}
        searchRef={searchRef}
        isMobile={isMobile}
      />

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>
        {view === 'list' && (
          <ListView
            entries={entries}
            onOpen={goToDetail}
            searchQuery={searchQuery}
            isMobile={isMobile}
            onLongPressEntry={isMobile ? (e) => openModal({
              title: e.title, context: e.context, decision: e.decision, why: e.why,
              alternatives: e.alternatives, tradeoffs: e.tradeoffs,
              project: e.project, type: e.type, confidence: e.confidence,
            }) : undefined}
          />
        )}

        {typeof view === 'object' && currentEntry && (
          <DetailView
            entry={currentEntry}
            allEntries={entries}
            onBack={goToList}
            onOpen={goToDetail}
            onDuplicate={duplicateEntry}
            onDeleted={goToList}
            onToast={showToast}
            revisitPromptsEnabled={settings.revisitPromptsEnabled}
            revisitThreshold={settings.revisitThreshold}
            isMobile={isMobile}
          />
        )}

        {typeof view === 'object' && !currentEntry && entries.length > 0 && (
          <button onClick={goToList} style={{
            background: 'none', border: 'none', fontFamily: 'var(--font-sans)',
            fontSize: 13, color: 'var(--accent)', cursor: 'pointer', padding: 0,
          }}>← All entries</button>
        )}

        {view === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdate={updateSettings}
            theme={theme}
            onThemeChange={setTheme}
            onBack={goToList}
            onOpenWeeklyReview={() => setWeeklyOpen(true)}
            onToast={showToast}
          />
        )}
      </main>

      {isMobile && view === 'list' && (
        <button className="logit-fab" onClick={() => openModal()} aria-label="New entry">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M11 3v16M3 11h16" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}

      <EntryModal
        open={modalOpen}
        existingProjects={existingProjects}
        initialValues={modalInitial}
        fullScreen={isMobile}
        onClose={closeModal}
        onSaved={showToast}
      />

      {weeklyOpen && (
        <WeeklyReview
          stats={weeklyStats}
          onClose={() => setWeeklyOpen(false)}
          onOpenEntry={id => { setWeeklyOpen(false); goToDetail(id); }}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
