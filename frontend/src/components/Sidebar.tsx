import { useState, useMemo, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Book } from '../types/bible';
import { getBookTestament } from '../utils/text';

interface SidebarProps {
  books: Book[];
  currentBook: Book | null;
  currentChapter: number;
  chapters: number[];
  onSelectBook: (book: Book) => void;
  onSelectChapter: (chapter: number) => void;
}

export function Sidebar({ books, currentBook, currentChapter, chapters, onSelectBook, onSelectChapter }: SidebarProps) {
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
    <div className="flex flex-col h-full select-none">
      <div className="px-4 pt-5 pb-4">
        <span className="text-base font-bold text-fg">Bibla</span>
      </div>

      <div className="px-3 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search books…"
            className="w-full h-9 pl-8 pr-3 text-sm bg-transparent border border-border rounded-full text-fg placeholder:text-fg-muted outline-none focus:border-border-focus transition-colors" />
        </div>
      </div>

      <div className="px-3 pb-3 flex gap-1.5">
        {(['ot', 'nt'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setSearch(''); }}
            className={`flex-1 py-1.5 rounded-full text-xs font-medium transition-colors ${
              tab === t ? 'bg-surface-active text-fg' : 'text-fg-muted hover:text-fg-secondary hover:bg-surface-hover'
            }`}>
            {t === 'ot' ? 'Old Testament' : 'New Testament'}
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
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                  active ? 'text-fg bg-accent-dim' : 'text-fg-secondary hover:text-fg hover:bg-surface-hover'
                }`}>
                {book.longName}
              </button>
              {active && (
                <div className="px-3 py-2 flex flex-wrap gap-1.5">
                  {chapters.map(ch => (
                    <button key={ch} onClick={() => onSelectChapter(ch)}
                      className={`w-9 h-9 rounded-full text-xs font-medium transition-colors ${
                        currentChapter === ch
                          ? 'bg-accent text-bg'
                          : 'text-fg-muted hover:text-fg hover:bg-surface-hover'
                      }`}>
                      {ch}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
