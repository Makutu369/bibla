import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Bookmark, BookOpen, Calendar } from 'lucide-react';
import { Book } from '../types/bible';
import { getBookTestament } from '../utils/text';
import { BookmarksPanel } from './BookmarksPanel';
import { DictionaryPanel } from './DictionaryPanel';
import { ReadingPlanPanel } from './ReadingPlanPanel';

export type SidebarTab = 'books' | 'bookmarks' | 'dictionary' | 'plan';

interface SidebarProps {
  books: Book[];
  currentBook: Book | null;
  currentChapter: number;
  chapters: number[];
  onSelectBook: (book: Book) => void;
  onSelectChapter: (chapter: number) => void;
  onNavigate: (bookNumber: number, chapter: number) => void;
  translation: string;
  onClosePanel: () => void;
  activePanel: SidebarTab | null;
  setActivePanel: (tab: SidebarTab | null) => void;
  dictSearch: string;
  onClearDictSearch: () => void;
}

function BooksList({ books, currentBook, currentChapter, chapters, onSelectBook, onSelectChapter }: {
  books: Book[];
  currentBook: Book | null;
  currentChapter: number;
  chapters: number[];
  onSelectBook: (book: Book) => void;
  onSelectChapter: (chapter: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'ot' | 'nt'>('ot');
  const listRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  const otBooks = books.filter(b => getBookTestament(b.bookNumber) === 'ot');
  const ntBooks = books.filter(b => getBookTestament(b.bookNumber) === 'nt');
  const activeBooks = tab === 'ot' ? otBooks : ntBooks;

  const filtered = useMemo(() => {
    if (!search.trim()) return activeBooks;
    const q = search.toLowerCase();
    return activeBooks.filter(b => b.longName.toLowerCase().includes(q) || b.shortName.toLowerCase().includes(q));
  }, [activeBooks, search]);

  useEffect(() => {
    if (currentBook) {
      const t = getBookTestament(currentBook.bookNumber);
      if (t !== tab) setTab(t);
    }
  }, [currentBook]);

  useEffect(() => {
    if (activeRef.current && listRef.current) {
      const c = listRef.current;
      const e = activeRef.current;
      if (e.offsetTop < c.scrollTop || e.offsetTop + e.offsetHeight > c.scrollTop + c.clientHeight) {
        e.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentBook]);

  return (
    <>
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search books…"
            className="w-full h-9 pl-9 pr-3 text-sm bg-surface border border-border rounded-full text-fg placeholder:text-fg-muted outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all" />
        </div>
      </div>

      <div className="px-4 pb-3 flex gap-1 bg-surface/50 mx-3 rounded-full p-1">
        {(['ot', 'nt'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setSearch(''); }}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition-all ${
              tab === t
                ? 'bg-accent text-white shadow-sm'
                : 'text-fg-muted hover:text-fg hover:bg-surface-hover'
            }`}>
            {t === 'ot' ? 'OT' : 'NT'}
          </button>
        ))}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3">
        {filtered.map(book => {
          const active = currentBook?.bookNumber === book.bookNumber;
          return (
            <div key={book.bookNumber}>
              <button ref={active ? activeRef : undefined}
                onClick={() => onSelectBook(book)}
                className={`w-full text-left px-3 py-2 rounded-full text-sm transition-all ${
                  active
                    ? 'text-accent bg-accent-dim font-medium'
                    : 'text-fg-secondary hover:text-fg hover:bg-surface-hover'
                }`}>
                <span className="flex items-center gap-2">
                  {active && <span className="accent-dot" />}
                  {book.longName}
                </span>
              </button>
              {active && (
                <div className="px-2 py-2 mb-1">
                  <div className="flex flex-wrap gap-1">
                    {chapters.map(ch => (
                      <button key={ch} onClick={() => onSelectChapter(ch)}
                        className={`w-9 h-9 rounded-full text-xs font-semibold transition-all ${
                          currentChapter === ch
                            ? 'bg-accent text-white shadow-sm'
                            : 'text-fg-muted hover:text-fg hover:bg-surface-hover'
                        }`}>
                        {ch}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function Sidebar({ books, currentBook, currentChapter, chapters, onSelectBook, onSelectChapter, onNavigate, translation, onClosePanel, activePanel, setActivePanel, dictSearch, onClearDictSearch }: SidebarProps) {
  const panel = activePanel;
  const panelType = activePanel as string | null;

  const handlePanelSelect = (p: SidebarTab) => {
    if (activePanel === p) {
      setActivePanel(null);
    } else {
      setActivePanel(p);
    }
  };

  if (panel === 'bookmarks') {
    return (
      <div className="flex flex-col h-full select-none">
        <BookmarksPanel translation={translation} onNavigate={(bn, ch) => { onNavigate(bn, ch); setActivePanel(null); }} onClose={() => setActivePanel(null)} />
      </div>
    );
  }

  if (panel === 'dictionary') {
    return (
      <div className="flex flex-col h-full select-none">
        <DictionaryPanel onClose={() => setActivePanel(null)} initialSearch={dictSearch} onClearSearch={onClearDictSearch} />
      </div>
    );
  }

  if (panel === 'plan') {
    return (
      <div className="flex flex-col h-full select-none">
        <ReadingPlanPanel onNavigate={(bn, ch) => { onNavigate(bn, ch); setActivePanel(null); }} onClose={() => setActivePanel(null)} />
      </div>
    );
  }

  const isPanel = (p: string) => panelType === p;

  return (
    <div className="flex flex-col h-full select-none bg-bg">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-fg tracking-tight">Bibla</span>
        </div>
      </div>

      <BooksList
        books={books}
        currentBook={currentBook}
        currentChapter={currentChapter}
        chapters={chapters}
        onSelectBook={onSelectBook}
        onSelectChapter={onSelectChapter}
      />

      {/* Bottom action bar */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex gap-1.5">
          {([
            { id: 'bookmarks' as SidebarTab, icon: Bookmark, label: 'Bookmarks' },
            { id: 'dictionary' as SidebarTab, icon: BookOpen, label: 'Dictionary' },
            { id: 'plan' as SidebarTab, icon: Calendar, label: 'Plan' },
          ]).map(item => (
            <button key={item.id} onClick={() => handlePanelSelect(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-full text-[11px] font-medium transition-all ${
                isPanel(item.id)
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-fg-muted hover:text-fg hover:bg-surface-hover'
              }`}>
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
