import { useState, useCallback, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Reader } from './components/Reader';
import { SearchBar } from './components/SearchBar';
import { TranslationPicker } from './components/TranslationPicker';
import { useBible } from './hooks/useBible';
import { useTheme } from './hooks/useTheme';
import { useHighlights } from './hooks/useHighlights';

function App() {
  const bible = useBible();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const theme = useTheme();
  const hl = useHighlights(bible.currentTranslation);

  const nav = useCallback((bn: number, ch: number) => {
    const book = bible.books.find(b => b.bookNumber === bn);
    if (book) { bible.selectBook(book); bible.selectChapter(ch); }
  }, [bible.books, bible.selectBook, bible.selectChapter]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === '\\' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setSidebarOpen(p => !p); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className="flex h-screen bg-bg overflow-hidden">
      {sidebarOpen && (
        <div className="w-[280px] flex-shrink-0 border-r border-border">
          <Sidebar
            books={bible.books}
            currentBook={bible.currentBook}
            currentChapter={bible.currentChapter}
            chapters={bible.chapters}
            onSelectBook={bible.selectBook}
            onSelectChapter={bible.selectChapter}
          />
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border flex-shrink-0">
          <button onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors"
            title="Toggle sidebar (⌘\)">
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
          />
        </div>
      </div>
    </div>
  );
}

export default App;
