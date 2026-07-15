import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Bookmark, BookOpen, Calendar, StickyNote, Library, List, Settings, Map, Highlighter, ListPlus, MessageSquare } from 'lucide-react';
import { Book } from '../types/bible';
import { getBookTestament } from '../utils/text';
import { BookmarksPanel } from './BookmarksPanel';
import { DictionaryPanel } from './DictionaryPanel';
import { ReadingPlanPanel } from './ReadingPlanPanel';
import { NotesPanel } from './NotesPanel';
import { TopicalPanel } from './TopicalPanel';
import { SettingsPanel } from './SettingsPanel';
import { MapsPanel } from './MapsPanel';
import { HighlightsPanel } from './HighlightsPanel';
import { VerseListsPanel } from './VerseListsPanel';
import { CommentaryPanel } from './CommentaryPanel';
import { Input } from './ui/Input';

export type SidebarTab = 'books' | 'bookmarks' | 'dictionary' | 'plan' | 'notes' | 'topical' | 'settings' | 'maps' | 'highlights' | 'verselists' | 'commentary';

interface SidebarProps {
  books: Book[];
  currentBook: Book | null;
  currentChapter: number;
  chapters: number[];
  onSelectBook: (book: Book) => void;
  onSelectChapter: (chapter: number) => void;
  onNavigate: (bookNumber: number, chapter: number, verse?: number) => void;
  translation: string;
  onClosePanel: () => void;
  activePanel: SidebarTab | null;
  setActivePanel: (tab: SidebarTab | null) => void;
  dictSearch: string;
  onClearDictSearch: () => void;
  noteCount: number;
  onNavigateToVerse?: (bookNumber: number, chapter: number, verse?: number) => void;
  onWordLookup?: (topic: string) => void;
  fontSize: number;
  onSetFontSize: (size: number) => void;
  readerWidth: number;
  onSetReaderWidth: (width: number) => void;
  currentBookNumber: number;
  currentChapterNum: number;
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
      <div className="px-3 pt-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-muted" />
          <Input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search books…"
            className="pl-9" />
        </div>
      </div>

      <div className="px-3 pb-3 flex gap-1 bg-surface/50 mx-2 rounded-xl p-1">
        {(['ot', 'nt'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setSearch(''); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              tab === t
                            ? 'bg-surface-active text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg hover:bg-surface-hover'
            }`}>
            {t === 'ot' ? 'Old' : 'New'}
          </button>
        ))}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-2">
        {filtered.map(book => {
          const active = currentBook?.bookNumber === book.bookNumber;
          return (
            <div key={book.bookNumber}>
              <button ref={active ? activeRef : undefined}
                onClick={() => onSelectBook(book)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                  active
                    ? 'text-fg bg-surface-hover font-medium'
                    : 'text-fg-secondary hover:text-fg hover:bg-surface-hover'
                }`}>
                <span className="flex items-center gap-2">
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-fg-muted" />}
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
                ? 'bg-surface-active text-fg shadow-sm'
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

const NAV_ITEMS: { id: SidebarTab; icon: typeof Bookmark; label: string }[] = [
  { id: 'bookmarks', icon: Bookmark, label: 'Bookmarks' },
  { id: 'highlights', icon: Highlighter, label: 'Highlights' },
  { id: 'notes', icon: StickyNote, label: 'Notes' },
  { id: 'verselists', icon: ListPlus, label: 'Verse Lists' },
  { id: 'commentary', icon: MessageSquare, label: 'Commentary' },
  { id: 'dictionary', icon: BookOpen, label: 'Dictionary' },
  { id: 'topical', icon: List, label: "Nave's" },
  { id: 'maps', icon: Map, label: 'Maps' },
  { id: 'plan', icon: Calendar, label: 'Plan' },
];

export function Sidebar({ books, currentBook, currentChapter, chapters, onSelectBook, onSelectChapter, onNavigate, translation, onClosePanel, activePanel, setActivePanel, dictSearch, onClearDictSearch, noteCount, onNavigateToVerse, onWordLookup, fontSize, onSetFontSize, readerWidth, onSetReaderWidth, currentBookNumber, currentChapterNum }: SidebarProps) {
  const panel = activePanel;

  const handlePanelSelect = (p: SidebarTab) => {
    if (activePanel === p) {
      setActivePanel(null);
    } else {
      setActivePanel(p);
    }
  };

  const renderRightPanel = () => {
    if (panel === 'bookmarks') {
      return <BookmarksPanel translation={translation} onNavigate={(bn, ch, v) => { onNavigate(bn, ch, v); setActivePanel(null); }} onClose={() => setActivePanel(null)} />;
    }
    if (panel === 'highlights') {
      return <HighlightsPanel translation={translation} onNavigate={(bn, ch, v) => { onNavigate(bn, ch, v); setActivePanel(null); }} onClose={() => setActivePanel(null)} />;
    }
    if (panel === 'dictionary') {
      return <DictionaryPanel onClose={() => setActivePanel(null)} initialSearch={dictSearch} onClearSearch={onClearDictSearch} />;
    }
    if (panel === 'plan') {
      return <ReadingPlanPanel onNavigate={(bn, ch, v) => { onNavigate(bn, ch, v); setActivePanel(null); }} onClose={() => setActivePanel(null)} />;
    }
    if (panel === 'notes') {
      return <NotesPanel translation={translation} onNavigate={(bn, ch, v) => { onNavigate(bn, ch, v); setActivePanel(null); }} onClose={() => setActivePanel(null)} />;
    }
    if (panel === 'topical') {
      return <TopicalPanel onClose={() => setActivePanel(null)} onNavigateToVerse={onNavigateToVerse} onWordLookup={onWordLookup} />;
    }
    if (panel === 'maps') {
      return <MapsPanel onVerseClick={(bn, ch, v) => { onNavigate(bn, ch, v); setActivePanel(null); }} onClose={() => setActivePanel(null)} />;
    }
    if (panel === 'verselists') {
      return <VerseListsPanel translation={translation} onNavigate={(bn, ch, v) => { onNavigate(bn, ch, v); setActivePanel(null); }} onClose={() => setActivePanel(null)} />;
    }
    if (panel === 'commentary') {
      return <CommentaryPanel translation={translation} bookNumber={currentBookNumber} chapter={currentChapterNum} onNavigateToVerse={(bn, ch, v) => { onNavigate(bn, ch, v); setActivePanel(null); }} onClose={() => setActivePanel(null)} />;
    }
    if (panel === 'settings') {
      return <SettingsPanel onClose={() => setActivePanel(null)} fontSize={fontSize} onSetFontSize={onSetFontSize} readerWidth={readerWidth} onSetReaderWidth={onSetReaderWidth} />;
    }
    return null;
  };

  return (
    <div className="flex h-full select-none" style={{ backgroundColor: 'var(--sidebar-bg, var(--bg))' }}>
      {/* Icon strip */}
      <div className="w-[52px] flex-shrink-0 flex flex-col items-center py-4 border-r border-border bg-bg/50">
        {/* Book list icon (top) */}
        <button
          onClick={() => setActivePanel(null)}
          className={`w-10 h-10 flex items-center justify-center rounded-full transition-all mb-1 ${
            panel === null
              ? 'bg-surface-active text-fg shadow-sm'
              : 'text-fg-muted hover:text-fg hover:bg-surface-hover'
          }`}
          title="Books">
          <Library className="w-[18px] h-[18px]" />
        </button>

        {/* Separator */}
        <div className="w-5 h-px bg-border my-2" />

        {/* Panel icons */}
        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map(item => {
            const isActive = panel === item.id;
            const hasBadge = item.id === 'notes' && noteCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => handlePanelSelect(item.id)}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all relative ${
                  isActive
                    ? 'bg-surface-active text-fg shadow-sm'
                    : 'text-fg-muted hover:text-fg hover:bg-surface-hover'
                }`}
                title={item.label}>
                <item.icon className="w-[18px] h-[18px]" />
                {hasBadge && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent border-2 border-bg" />
                )}
              </button>
            );
          })}
        </div>

        {/* Settings icon (bottom) */}
        <div className="mt-auto">
          <div className="w-5 h-px bg-border my-2" />
          <button
            onClick={() => handlePanelSelect('settings')}
            className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
              panel === 'settings'
                ? 'bg-surface-active text-fg shadow-sm'
                : 'text-fg-muted hover:text-fg hover:bg-surface-hover'
            }`}
            title="Settings">
            <Settings className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>

      {/* Right content area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {panel === null ? (
          <>
            <BooksList
              books={books}
              currentBook={currentBook}
              currentChapter={currentChapter}
              chapters={chapters}
              onSelectBook={onSelectBook}
              onSelectChapter={onSelectChapter}
            />
          </>
        ) : (
          <div className="flex-1 overflow-hidden">
            {renderRightPanel()}
          </div>
        )}
      </div>
    </div>
  );
}
