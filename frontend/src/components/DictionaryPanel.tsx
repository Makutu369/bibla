import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { DictionaryEntry } from '../types/dictionary';
import { DictionaryService } from '../../bindings/changeme';
import { Input } from './ui/Input';

interface DictionaryPanelProps {
  onClose: () => void;
  initialSearch?: string;
  onClearSearch?: () => void;
}

const searchCache = new Map<string, DictionaryEntry[]>();
const MAX_CACHE_SIZE = 100;

function cacheResult(key: string, value: DictionaryEntry[]) {
  if (searchCache.size >= MAX_CACHE_SIZE) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(key, value);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x200E;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function DictionaryPanel({ onClose, initialSearch, onClearSearch }: DictionaryPanelProps) {
  const [query, setQuery] = useState(initialSearch || '');
  const [results, setResults] = useState<DictionaryEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedCognates, setExpandedCognates] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [dictionaries, setDictionaries] = useState<string[]>([]);
  const [currentDict, setCurrentDict] = useState<string>('');

  const dictNames: Record<string, string> = {
    'SECE': "Strong's",
    'NUBD': "Nelson's",
  };

  const getDictDisplayName = (name: string) => dictNames[name] || name;

  useEffect(() => {
    const loadDictionaries = async () => {
      try {
        const dicts = await DictionaryService.GetDictionaries();
        setDictionaries(dicts);
        const current = await DictionaryService.GetCurrentDictionary();
        setCurrentDict(current);
      } catch {}
      setInitialLoading(false);
    };
    loadDictionaries();
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setHasSearched(false); return; }

    const cacheKey = `${currentDict}:${q.trim().toLowerCase()}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      setResults(cached);
      setHasSearched(true);
      setSearching(false);
      return;
    }

    setSearching(true);
    setHasSearched(true);
    try {
      const trimmed = q.trim();
      const isStrongs = /^[HG]\d+$/i.test(trimmed);
      const isPartialStrongs = /^[HG]\d{0,3}$/i.test(trimmed);
      const hasSpaces = trimmed.includes(' ');

      let r: DictionaryEntry[] = [];

      if (isStrongs) {
        r = await DictionaryService.LookupTopic(trimmed) || [];
        if (r.length > 0) {
          const cognates = await DictionaryService.LookupCognates(trimmed) || [];
          if (cognates.length > 0) {
            r = r.map(entry => ({ ...entry, cognates }));
          }
        }
      } else if (isPartialStrongs && trimmed.length >= 2) {
        r = await DictionaryService.LookupTopicPrefix(trimmed) || [];
      } else if (hasSpaces) {
        r = await DictionaryService.SearchPhrase(trimmed) || [];
      } else {
        r = await DictionaryService.LookupWord(trimmed) || [];
      }

      cacheResult(cacheKey, r);
      setResults(r);
    } catch { setResults([]); }
    setSearching(false);
  }, [currentDict]);

  const handleDictChange = useCallback(async (dictName: string) => {
    await DictionaryService.SetDictionary(dictName);
    setCurrentDict(dictName);
    searchCache.clear();
    setResults([]);
    setHasSearched(false);
    if (query.trim()) {
      doSearch(query);
    }
  }, [query, doSearch]);

  useEffect(() => {
    if (initialSearch) {
      setQuery(initialSearch);
      doSearch(initialSearch);
    }
  }, [initialSearch]);

  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setResults([]); setHasSearched(false); return; }
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  }, [doSearch]);

  const handleTopicClick = useCallback(async (topic: string) => {
    setQuery(topic);
    doSearch(topic);
    onClearSearch?.();
  }, [doSearch, onClearSearch]);

  const toggleCognates = useCallback((topic: string) => {
    setExpandedCognates(prev => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-fg-muted" />
          <span className="text-base font-bold text-fg">Dictionary</span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {dictionaries.length > 1 && (
        <div className="px-4 pb-3 flex gap-1.5">
          {dictionaries.map(dict => (
            <button
              key={dict}
              onClick={() => handleDictChange(dict)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                currentDict === dict
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-transparent text-fg-muted hover:text-fg hover:bg-surface-hover'
              }`}>
              {getDictDisplayName(dict)}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 pb-3">
        <div className="relative">
          <Input value={query} onChange={e => { setQuery(e.target.value); search(e.target.value); }}
            onKeyDown={e => { if (e.key === 'Enter' && query.trim()) { if (debounceRef.current) clearTimeout(debounceRef.current); doSearch(query); } }}
            placeholder="Search word or Strong's number…"
            disabled={initialLoading} />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-border border-t-fg-muted rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {initialLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-7 h-7 border-2 border-border border-t-fg-muted rounded-full animate-spin" />
          </div>
        )}

        {!initialLoading && hasSearched && results.length === 0 && !searching && (
          <div className="text-center py-16 text-sm text-fg-muted">
            <BookOpen className="w-7 h-7 mx-auto mb-3 opacity-20" />
            <p>No entries found</p>
          </div>
        )}

        {!initialLoading && results.map((entry, i) => (
          <motion.div
            key={`${entry.topic}-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: Math.min(i * 0.02, 0.2) }}
            className="py-3 first:pt-0"
          >
            {/* Header: topic + lexeme + transliteration */}
            <div className="flex items-baseline gap-2 flex-wrap">
              {entry.topic && (
                <button onClick={() => handleTopicClick(entry.topic)}
                  className="text-xs font-mono font-semibold text-accent hover:underline">
                  {entry.topic}
                </button>
              )}
              {entry.lexeme && (
                <span className="text-sm font-medium text-fg">{entry.lexeme}</span>
              )}
              {entry.transliteration && (
                <span className="text-[11px] text-fg-muted italic">({entry.transliteration})</span>
              )}
            </div>

            {/* Short definition */}
            {entry.shortDef && (
              <p className="text-xs text-fg-secondary mt-1 leading-relaxed">{entry.shortDef}</p>
            )}

            {/* Full definition */}
            {entry.definition && (
              <p className="text-[11px] text-fg-muted mt-1.5 leading-relaxed">{stripHtml(entry.definition)}</p>
            )}

            {/* Cognates */}
            {entry.cognates && entry.cognates.length > 0 && (
              <div className="mt-2">
                <button onClick={() => toggleCognates(entry.topic)}
                  className="flex items-center gap-1 text-[10px] font-medium text-fg-muted hover:text-fg transition-colors">
                  {expandedCognates.has(entry.topic)
                    ? <ChevronUp className="w-3 h-3" />
                    : <ChevronDown className="w-3 h-3" />
                  }
                  Cognates ({entry.cognates.length})
                </button>
                {expandedCognates.has(entry.topic) && (
                  <div className="mt-1.5 space-y-1">
                    {entry.cognates.map((cog, j) => (
                      <button key={j}
                        onClick={() => handleTopicClick(cog.topic)}
                        className="w-full text-left flex items-baseline gap-2 py-1 px-2 -mx-2 rounded-lg hover:bg-surface-hover transition-colors">
                        <span className="text-[11px] font-mono font-medium text-accent shrink-0">{cog.topic}</span>
                        {cog.shortDef && (
                          <span className="text-[11px] text-fg-muted truncate">{cog.shortDef}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Separator */}
            {i < results.length - 1 && <div className="mt-3 border-t border-border/40" />}
          </motion.div>
        ))}

        {!initialLoading && !hasSearched && (
          <div className="text-center py-16 text-sm text-fg-muted">
            <BookOpen className="w-7 h-7 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-fg-secondary">Look up words or Strong's numbers</p>
            <p className="text-xs mt-1.5 opacity-60">e.g. "grace", "H1234", "logos"</p>
          </div>
        )}
      </div>
    </div>
  );
}
