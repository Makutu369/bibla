import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { SearchResult } from '../types/bible';
import { BibleService } from '../../bindings/changeme';
import { cleanVerseText } from '../utils/text';
import { Input } from './ui/Input';

interface SearchBarProps {
  translation: string;
  onNavigate: (bookNumber: number, chapter: number, verse?: number) => void;
}

export function SearchBar({ translation, onNavigate }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
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

  return (
    <div ref={ref} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
        <Input ref={inputRef} type="text" value={query} onChange={e => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          placeholder="Search the Bible…"
          className="pl-9" />
      </div>

      {open && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-bg border border-border rounded-2xl shadow-2xl max-h-[320px] overflow-y-auto z-50">
          {results.slice(0, 20).map((r, i) => (
            <button key={i} onClick={() => { onNavigate(r.bookNumber, r.chapter, r.verse); setOpen(false); setQuery(''); }}
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
