import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen } from 'lucide-react';
import { DictionaryEntry } from '../types/dictionary';
import { DictionaryService } from '../../bindings/changeme';

interface DictionaryPanelProps {
  onClose: () => void;
  initialSearch?: string;
  onClearSearch?: () => void;
}

export function DictionaryPanel({ onClose, initialSearch, onClearSearch }: DictionaryPanelProps) {
  const [query, setQuery] = useState(initialSearch || '');
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setHasSearched(false); return; }
    setSearching(true);
    setHasSearched(true);
    try {
      const trimmed = q.trim();
      // Strong's numbers (e.g. H1234, G5678) use exact topic lookup
      const isStrongs = /^[HG]\d+$/i.test(trimmed);
      const r = isStrongs
        ? await DictionaryService.LookupTopic(trimmed)
        : await DictionaryService.LookupWord(trimmed);
      setResults(r || []);
    } catch { setResults([]); }
    setSearching(false);
  }, []);

  // Auto-search when initialSearch changes (from Strong's click)
  useEffect(() => {
    if (initialSearch) {
      setQuery(initialSearch);
      doSearch(initialSearch);
    }
  }, [initialSearch]);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setHasSearched(false); return; }
    debounceRef.current = setTimeout(() => doSearch(q), 250);
  }, [doSearch]);

  const handleTopicClick = useCallback(async (topic: string) => {
    setQuery(topic);
    doSearch(topic);
    onClearSearch?.();
  }, [doSearch, onClearSearch]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-accent" />
          <span className="text-base font-bold text-fg">Dictionary</span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-3 pb-3">
        <input value={query} onChange={e => { setQuery(e.target.value); search(e.target.value); }}
          onKeyDown={e => { if (e.key === 'Enter' && query.trim()) { if (debounceRef.current) clearTimeout(debounceRef.current); doSearch(query); } }}
          placeholder="Search word or Strong's number…"
          className="w-full h-9 px-3 text-sm bg-transparent border border-border rounded-full text-fg placeholder:text-fg-muted outline-none focus:border-border-focus transition-colors" />
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {searching && (
          <div className="text-center py-8 text-sm text-fg-muted">Searching…</div>
        )}

        {!searching && hasSearched && results.length === 0 && (
          <div className="text-center py-8 text-sm text-fg-muted">
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No entries found</p>
          </div>
        )}

        {!searching && results.map((entry, i) => (
          <motion.div
            key={`${entry.topic}-${i}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="py-3 border-b border-border/50 last:border-0"
          >
            <div className="flex items-baseline gap-2 flex-wrap">
              {entry.topic && (
                <button onClick={() => handleTopicClick(entry.topic)}
                  className="text-xs font-mono text-accent hover:underline">{entry.topic}</button>
              )}
              {entry.lexeme && <span className="text-sm font-medium text-fg">{entry.lexeme}</span>}
              {entry.transliteration && <span className="text-xs text-fg-muted italic">({entry.transliteration})</span>}
              {entry.pronunciation && <span className="text-xs text-fg-muted">{entry.pronunciation}</span>}
            </div>
            <p className="text-sm text-fg-secondary mt-1">{entry.shortDef}</p>
            {entry.definition && (
              <p className="text-xs text-fg-muted mt-1 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: entry.definition
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim()
                    .slice(0, 300)
                }} />
            )}
          </motion.div>
        ))}

        {!hasSearched && (
          <div className="text-center py-12 text-sm text-fg-muted">
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>Look up words, names, or Strong's numbers</p>
            <p className="text-xs mt-1">e.g. "grace", "H1234", "logos"</p>
          </div>
        )}
      </div>
    </div>
  );
}
