import { useState, useRef, useEffect } from 'react';
import { Search, Clock } from 'lucide-react';
import { SearchResult } from '../types/bible';
import { BibleService } from '../../bindings/changeme';
import { cleanVerseText } from '../utils/text';
import { Input } from './ui/Input';

const SEARCH_HISTORY_KEY = 'bibla-search-history';
const MAX_HISTORY = 8;

interface SearchBarProps {
  translation: string;
  onNavigate: (bookNumber: number, chapter: number, verse?: number) => void;
}

function getSearchHistory(): string[] {
  try {
    const raw = localStorage.getItem(SEARCH_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSearchHistory(query: string) {
  const history = getSearchHistory().filter(h => h !== query);
  history.unshift(query);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function clearSearchHistory() {
  localStorage.removeItem(SEARCH_HISTORY_KEY);
}

export function SearchBar({ translation, onNavigate }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true); setHistory(getSearchHistory()); }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setResults(await BibleService.Search(translation, query) || []); setOpen(true); } catch {}
      setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, translation]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleNavigate = (bn: number, ch: number, v: number) => {
    if (query.trim()) saveSearchHistory(query.trim());
    onNavigate(bn, ch, v);
    setOpen(false);
    setQuery('');
  };

  const handleHistoryClick = (q: string) => {
    setQuery(q);
    inputRef.current?.focus();
  };

  const showHistory = open && !query.trim() && history.length > 0 && results.length === 0;

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
        <Input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
          onFocus={() => { setOpen(true); setHistory(getSearchHistory()); }}
          placeholder="Search the Bible…"
          className="pl-9" />
      </div>

      {showHistory && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-bg border border-border rounded-2xl shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 pt-3 pb-1">
            <span className="text-[11px] font-medium text-fg-muted">Recent searches</span>
            <button onClick={() => { clearSearchHistory(); setHistory([]); }}
              className="text-[10px] text-fg-muted hover:text-fg transition-colors">
              Clear
            </button>
          </div>
          {history.map((h, i) => (
            <button key={i} onClick={() => handleHistoryClick(h)}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-surface-hover text-sm transition-colors border-b border-border/50 last:border-0">
              <Clock className="w-3 h-3 text-fg-muted flex-shrink-0" />
              <span className="text-fg-secondary text-xs">{h}</span>
            </button>
          ))}
        </div>
      )}

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-bg border border-border rounded-2xl shadow-2xl max-h-[320px] overflow-y-auto z-50">
          {results.slice(0, 20).map((r, i) => (
            <button key={i} onClick={() => handleNavigate(r.bookNumber, r.chapter, r.verse)}
              className="w-full text-left px-4 py-2.5 hover:bg-surface-hover text-sm transition-colors border-b border-border/50 last:border-0 first:rounded-t-2xl last:rounded-b-2xl">
              <span className="text-fg-muted font-mono text-xs">{r.bookName} {r.chapter}:{r.verse}</span>
              <p className="text-fg-secondary mt-0.5 line-clamp-2 text-xs leading-relaxed">{cleanVerseText(r.text)}</p>
            </button>
          ))}
        </div>
      )}

      {open && query && results.length === 0 && !searching && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-bg border border-border rounded-2xl p-4 text-center text-xs text-fg-muted z-50">
          No results found
        </div>
      )}
    </div>
  );
}
