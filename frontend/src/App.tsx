import { useState, useCallback, useEffect, useRef } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar, SidebarTab } from './components/Sidebar';
import { Reader } from './components/Reader';
import { SearchBar } from './components/SearchBar';
import { TranslationPicker } from './components/TranslationPicker';
import { VerseOfDay } from './components/VerseOfDay';
import { useBible } from './hooks/useBible';
import { useTheme } from './hooks/useTheme';
import { useHighlights } from './hooks/useHighlights';
import { useBookmarks } from './hooks/useBookmarks';
import { useNotes } from './hooks/useNotes';
import { useVerseLists } from './hooks/useVerseLists';

const TRANSLATION_SETTINGS_KEY = 'bibla-translation-settings';

interface TranslationSettings {
  [translation: string]: {
    fontSize: number;
    readerWidth: number;
  };
}

function loadTranslationSettings(): TranslationSettings {
  try {
    const raw = localStorage.getItem(TRANSLATION_SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveTranslationSettings(settings: TranslationSettings) {
  localStorage.setItem(TRANSLATION_SETTINGS_KEY, JSON.stringify(settings));
}

interface HistoryEntry {
  bookNumber: number;
  chapter: number;
}

function App() {
  const bible = useBible();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePanel, setActivePanel] = useState<SidebarTab | null>(null);
  const theme = useTheme();
  const hl = useHighlights(bible.currentTranslation);
  const bm = useBookmarks(bible.currentTranslation);
  const nt = useNotes(bible.currentTranslation);
  const vl = useVerseLists(bible.currentTranslation);
  const [parallelMode, setParallelMode] = useState(false);
  const [parallelTranslation, setParallelTranslation] = useState('');
  const [dictSearch, setDictSearch] = useState('');

  // Font size (per-translation)
  const [fontSize, setFontSize] = useState(() => 19);

  // Reader width (per-translation)
  const [readerWidth, setReaderWidth] = useState(() => 720);

  // Update font size when translation changes
  useEffect(() => {
    if (bible.currentTranslation) {
      const settings = loadTranslationSettings();
      const ts = settings[bible.currentTranslation];
      if (ts) {
        setFontSize(ts.fontSize);
        setReaderWidth(ts.readerWidth);
      } else {
        setFontSize(19);
        setReaderWidth(720);
      }
    }
  }, [bible.currentTranslation]);

  // Persist per-translation settings
  useEffect(() => {
    if (bible.currentTranslation) {
      const settings = loadTranslationSettings();
      settings[bible.currentTranslation] = { fontSize, readerWidth };
      saveTranslationSettings(settings);
    }
  }, [fontSize, readerWidth, bible.currentTranslation]);

  // Focus mode
  const [focusMode, setFocusMode] = useState(false);

  // Navigation history
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const ignoreHistory = useRef(false);

  // Push to history when navigation changes
  useEffect(() => {
    if (!bible.currentBook || ignoreHistory.current) {
      ignoreHistory.current = false;
      return;
    }
    const entry: HistoryEntry = { bookNumber: bible.currentBook.bookNumber, chapter: bible.currentChapter };
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      const last = trimmed[trimmed.length - 1];
      if (last && last.bookNumber === entry.bookNumber && last.chapter === entry.chapter) return prev;
      return [...trimmed, entry].slice(-100);
    });
    setHistoryIndex(prev => {
      const trimmed = history.slice(0, prev + 1);
      return trimmed.length;
    });
  }, [bible.currentBook, bible.currentChapter]);

  useEffect(() => {
    if (bible.translations.length > 1 && !parallelTranslation) {
      const other = bible.translations.find(t => t.fileName !== bible.currentTranslation);
      if (other) setParallelTranslation(other.fileName);
    }
  }, [bible.translations, bible.currentTranslation, parallelTranslation]);

  const [scrollToVerse, setScrollToVerse] = useState<{ bn: number; ch: number; v: number } | null>(null);

  const nav = useCallback((bn: number, ch: number, v?: number) => {
    const book = bible.books.find(b => b.bookNumber === bn);
    if (book) {
      bible.selectBook(book);
      bible.selectChapter(ch);
      if (v) setScrollToVerse({ bn, ch, v });
    }
  }, [bible.books, bible.selectBook, bible.selectChapter]);

  const handleToggleBookmark = useCallback(async (bn: number, ch: number, v: number) => {
    const existing = bm.isBookmarked(bn, ch, v);
    if (existing) {
      await bm.removeBookmark(existing.id);
    } else {
      await bm.addBookmark(bn, ch, v);
    }
  }, [bm]);

  const handleToggleNote = useCallback(async (bn: number, ch: number, v: number) => {
    const existing = nt.getNoteForVerse(bn, ch, v);
    if (existing) {
      await nt.removeNote(existing.id);
    } else {
      await nt.addNote(bn, ch, v);
    }
  }, [nt]);

  const handleWordLookup = useCallback((topic: string) => {
    setDictSearch(topic);
    setActivePanel('dictionary');
  }, []);

  const handleClearDictSearch = useCallback(() => {
    setDictSearch('');
  }, []);

  // Navigate to verse from topical verse refs
  const navigateToVerse = useCallback((bn: number, ch: number, v?: number) => {
    ignoreHistory.current = true;
    nav(bn, ch, v);
  }, [nav]);

  // Keyboard shortcuts
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ctrl/Cmd + \ : toggle sidebar
      if (e.key === '\\' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSidebarOpen(p => !p);
        return;
      }

      // F11 or Ctrl/Cmd + Shift + F : toggle focus mode
      if (e.key === 'F11' || (e.key === 'f' && e.shiftKey && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        setFocusMode(p => !p);
        return;
      }

      // ESC : exit focus mode
      if (e.key === 'Escape' && focusMode) {
        e.preventDefault();
        setFocusMode(false);
        return;
      }

      // Ctrl/Cmd + = / + : increase font size
      if ((e.key === '=' || e.key === '+') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setFontSize(prev => Math.min(prev + 1, 28));
        return;
      }

      // Ctrl/Cmd + - : decrease font size
      if (e.key === '-' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setFontSize(prev => Math.max(prev - 1, 12));
        return;
      }

      // Ctrl/Cmd + 0 : reset font size
      if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setFontSize(19);
        return;
      }

      // Ctrl/Cmd + Left : back in history
      if (e.key === 'ArrowLeft' && (e.metaKey || e.ctrlKey) && !isInput) {
        e.preventDefault();
        if (historyIndex > 0) {
          const prev = history[historyIndex - 1];
          ignoreHistory.current = true;
          nav(prev.bookNumber, prev.chapter);
          setHistoryIndex(prev => prev - 1);
        }
        return;
      }

      // Ctrl/Cmd + Right : forward in history
      if (e.key === 'ArrowRight' && (e.metaKey || e.ctrlKey) && !isInput) {
        e.preventDefault();
        if (historyIndex < history.length - 1) {
          const next = history[historyIndex + 1];
          ignoreHistory.current = true;
          nav(next.bookNumber, next.chapter);
          setHistoryIndex(prev => prev + 1);
        }
        return;
      }

      // Arrow keys for chapter navigation (when not in input)
      if (!isInput && bible.currentBook) {
        if (e.key === 'ArrowLeft' && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          bible.goToPrevChapter();
          return;
        }
        if (e.key === 'ArrowRight' && !e.metaKey && !e.ctrlKey) {
          e.preventDefault();
          bible.goToNextChapter();
          return;
        }
        // Page Up / Page Down for scrolling
        if (e.key === 'PageDown') {
          e.preventDefault();
          const reader = document.querySelector('.flex-1.overflow-y-auto');
          if (reader) reader.scrollBy({ top: reader.clientHeight * 0.8, behavior: 'smooth' });
          return;
        }
        if (e.key === 'PageUp') {
          e.preventDefault();
          const reader = document.querySelector('.flex-1.overflow-y-auto');
          if (reader) reader.scrollBy({ top: -reader.clientHeight * 0.8, behavior: 'smooth' });
          return;
        }
        // Home / End
        if (e.key === 'Home') {
          e.preventDefault();
          const reader = document.querySelector('.flex-1.overflow-y-auto');
          if (reader) reader.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
        if (e.key === 'End') {
          e.preventDefault();
          const reader = document.querySelector('.flex-1.overflow-y-auto');
          if (reader) reader.scrollTo({ top: reader.scrollHeight, behavior: 'smooth' });
          return;
        }
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [focusMode, history, historyIndex, nav, bible]);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {sidebarOpen && !focusMode && (
        <div className="w-[380px] flex-shrink-0 border-r border-border">
          <Sidebar
            books={bible.books}
            currentBook={bible.currentBook}
            currentChapter={bible.currentChapter}
            chapters={bible.chapters}
            onSelectBook={bible.selectBook}
            onSelectChapter={bible.selectChapter}
            onNavigate={nav}
            translation={bible.currentTranslation}
            onClosePanel={() => setActivePanel(null)}
            activePanel={activePanel}
            setActivePanel={setActivePanel}
            dictSearch={dictSearch}
            onClearDictSearch={handleClearDictSearch}
            noteCount={nt.notes.length}
            onNavigateToVerse={navigateToVerse}
            onWordLookup={handleWordLookup}
            fontSize={fontSize}
            onSetFontSize={setFontSize}
            theme={theme.theme}
            onSetTheme={theme.setTheme}
            readerWidth={readerWidth}
            onSetReaderWidth={setReaderWidth}
            currentBookNumber={bible.currentBook?.bookNumber || 10}
            currentChapterNum={bible.currentChapter}
          />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {!focusMode && (
          <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
            <button onClick={() => setSidebarOpen(!sidebarOpen)}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors"
              title="Show or hide sidebar">
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex-1">
              <SearchBar translation={bible.currentTranslation} onNavigate={nav} />
            </div>
            <TranslationPicker translations={bible.translations} currentTranslation={bible.currentTranslation} onSelect={bible.setCurrentTranslation} />
            <button onClick={theme.cycle}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors"
              title={`Theme: ${theme.label}`}>
              <theme.Icon className="w-4 h-4" />
            </button>
          </header>
        )}

        {!bible.currentBook && !focusMode && (
          <VerseOfDay currentTranslation={bible.currentTranslation} onNavigate={nav} />
        )}

        <div className="flex-1 overflow-hidden">
          <Reader
            verses={bible.verses}
            currentBook={bible.currentBook}
            currentChapter={bible.currentChapter}
            loading={bible.loading}
            highlights={hl.highlights}
            translations={bible.translations}
            currentTranslation={bible.currentTranslation}
            onSelectTranslation={bible.setCurrentTranslation}
            onToggleHighlight={hl.toggleHighlight}
            getHighlight={hl.getHighlight}
            onPrevChapter={bible.goToPrevChapter}
            onNextChapter={bible.goToNextChapter}
            canGoPrev={bible.chapters.indexOf(bible.currentChapter) > 0 || bible.books.findIndex(b => b.bookNumber === bible.currentBook?.bookNumber) > 0}
            canGoNext={bible.chapters.indexOf(bible.currentChapter) < bible.chapters.length - 1 || bible.books.findIndex(b => b.bookNumber === bible.currentBook?.bookNumber) < bible.books.length - 1}
            isBookmarked={bm.isBookmarked}
            onToggleBookmark={handleToggleBookmark}
            parallelMode={parallelMode}
            onToggleParallel={() => setParallelMode(p => !p)}
            parallelTranslation={parallelTranslation}
            onSetParallelTranslation={setParallelTranslation}
            onWordLookup={handleWordLookup}
            fontSize={fontSize}
            readerWidth={readerWidth}
            noteForVerse={nt.getNoteForVerse}
            onToggleNote={handleToggleNote}
            focusMode={focusMode}
            onExitFocus={() => setFocusMode(false)}
            onNavigateToVerse={navigateToVerse}
            scrollToVerse={scrollToVerse}
            onClearScrollToVerse={() => setScrollToVerse(null)}
            verseLists={vl.lists}
            onAddToVerseList={vl.addToList}
            onCreateVerseList={vl.createList}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
