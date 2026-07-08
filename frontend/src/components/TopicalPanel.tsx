import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, List, ArrowLeft, ChevronRight } from 'lucide-react';
import { TopicalService } from '../../bindings/changeme';
import { Input } from './ui/Input';

interface TopicalEntry {
  topic: string;
  definition: string;
}

interface TopicListItem {
  topic: string;
}

interface TopicalPanelProps {
  onClose: () => void;
  onNavigateToVerse?: (bookNumber: number, chapter: number, verse: number) => void;
  onWordLookup?: (topic: string) => void;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// Frontend caches
const letterCache = new Map<string, TopicListItem[]>();
const definitionCache = new Map<string, string>();
const searchCache = new Map<string, TopicalEntry[]>();
const MAX_CACHE = 200;

// Book number to name mapping for verse refs
const BOOK_MAP: Record<number, string> = {
  10: 'Gen', 20: 'Exo', 30: 'Lev', 40: 'Num', 50: 'Deu', 60: 'Jos', 70: 'Jdg',
  80: 'Rth', 90: '1Sa', 100: '2Sa', 110: '1Ki', 120: '2Ki', 130: '1Ch', 140: '2Ch',
  150: 'Ezr', 160: 'Neh', 190: 'Est', 220: 'Job', 230: 'Psa', 240: 'Pro', 250: 'Ecc',
  260: 'Son', 290: 'Isa', 300: 'Jer', 310: 'Lam', 330: 'Eze', 340: 'Dan', 350: 'Hos',
  360: 'Joe', 370: 'Amo', 380: 'Oba', 390: 'Jon', 400: 'Mic', 410: 'Nah', 420: 'Hab',
  430: 'Zep', 440: 'Hag', 450: 'Zec', 460: 'Mal', 470: 'Mat', 480: 'Mar', 490: 'Luk',
  500: 'Joh', 510: 'Act', 520: 'Rom', 530: '1Co', 540: '2Co', 550: 'Gal', 560: 'Eph',
  570: 'Phi', 580: 'Col', 590: '1Th', 600: '2Th', 610: '1Ti', 620: '2Ti', 630: 'Tit',
  640: 'Phm', 650: 'Heb', 660: 'Jas', 670: '1Pe', 680: '2Pe', 690: '1Jn', 700: '2Jn',
  710: '3Jn', 730: 'Rev',
};

function formatBookRef(bn: number, ch: number, v: number): string {
  const name = BOOK_MAP[bn] || `B${bn}`;
  return `${name} ${ch}:${v}`;
}

function parseVerseRefsFromDef(html: string): { bn: number; ch: number; v: number; text: string }[] {
  const refs: { bn: number; ch: number; v: number; text: string }[] = [];
  const re = /<a href='B:(\d+)\s+(\d+):(\d+)'>[^<]*<\/a>/g;
  let match;
  while ((match = re.exec(html)) !== null) {
    const bn = parseInt(match[1]);
    const ch = parseInt(match[2]);
    const v = parseInt(match[3]);
    const textMatch = html.substring(match.index, match.index + match[0].length).match(/>([^<]*)</);
    const text = textMatch?.[1]?.trim() || formatBookRef(bn, ch, v);
    refs.push({ bn, ch, v, text });
  }
  return refs;
}

function parseDefinitionBlocks(html: string): { type: string; text: string; indent: boolean; strong?: string; verseRef?: { bn: number; ch: number; v: number } }[] {
  const blocks: { type: string; text: string; indent: boolean; strong?: string; verseRef?: { bn: number; ch: number; v: number } }[] = [];

  // Split by <br> tags first
  const lines = html.split(/<br\s*\/?>/i);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Split each line by semicolons to handle multiple refs on one line
    // But keep semicolons that are inside tags
    const segments = splitBySemicolon(trimmed);

    for (const seg of segments) {
      const s = seg.trim();
      if (!s) continue;

      // Check for verse reference link
      const verseRefMatch = s.match(/<a href='B:(\d+)\s+(\d+):(\d+)'>[^<]*<\/a>/);
      if (verseRefMatch) {
        const bn = parseInt(verseRefMatch[1]);
        const ch = parseInt(verseRefMatch[2]);
        const v = parseInt(verseRefMatch[3]);
        const linkTextMatch = s.match(/<a href='[^']+'>([^<]*)<\/a>/);
        const refText = linkTextMatch?.[1]?.trim() || formatBookRef(bn, ch, v);
        blocks.push({ type: 'verse', text: refText, indent: false, verseRef: { bn, ch, v } });
        continue;
      }

      // Check for Strong's link
      const strongMatch = s.match(/<a href='S:([HG]\d+)'>[^<]*<\/a>/);
      if (strongMatch) {
        blocks.push({ type: 'strong', text: strongMatch[1], indent: false, strong: strongMatch[1] });
        continue;
      }

      // Check for cross-reference link (topic name)
      const crossRefMatch = s.match(/<a href='S:([^']+)'>([^<]+)<\/a>/);
      if (crossRefMatch) {
        blocks.push({ type: 'crossref', text: crossRefMatch[2], indent: false, strong: crossRefMatch[1] });
        continue;
      }

      // Clean HTML tags
      const clean = s
        .replace(/<b>([^<]+)<\/b>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&#\d+;/g, '')
        .trim();

      if (!clean) continue;

      // Detect sub-entry patterns
      if (clean.startsWith('- ')) {
        blocks.push({ type: 'sub-entry', text: clean.slice(2), indent: true });
      } else if (/^\d+\.\s/.test(clean)) {
        blocks.push({ type: 'numbered', text: clean, indent: true });
      } else if (clean.startsWith('See ')) {
        blocks.push({ type: 'crossref', text: clean, indent: false });
      } else {
        blocks.push({ type: 'text', text: clean, indent: false });
      }
    }
  }

  return blocks;
}

// Split a line by semicolons that are not inside HTML tags
function splitBySemicolon(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inTag = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '<') {
      inTag = true;
      current += ch;
    } else if (ch === '>') {
      inTag = false;
      current += ch;
    } else if (ch === ';' && !inTag) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) result.push(current);
  return result;
}

export function TopicalPanel({ onClose, onNavigateToVerse, onWordLookup }: TopicalPanelProps) {
  const [view, setView] = useState<'browse' | 'search' | 'detail'>('browse');
  const [query, setQuery] = useState('');
  const [selectedLetter, setSelectedLetter] = useState('A');
  const [topics, setTopics] = useState<TopicListItem[]>([]);
  const [searchResults, setSearchResults] = useState<TopicalEntry[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicalEntry | null>(null);
  const [alphabetIndex, setAlphabetIndex] = useState<Record<string, number>>({});
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const listRef = useRef<HTMLDivElement>(null);

  // Load alphabet index on mount
  useEffect(() => {
    TopicalService.GetAlphabetIndex().then(idx => {
      setAlphabetIndex((idx as Record<string, number>) || {});
      setInitialLoading(false);
    });
  }, []);

  // Load topics when letter changes (with cache)
  useEffect(() => {
    if (view === 'browse') {
      const cached = letterCache.get(selectedLetter);
      if (cached) {
        setTopics(cached);
        listRef.current?.scrollTo({ top: 0 });
        return;
      }
      setLoading(true);
      TopicalService.GetTopicsByLetter(selectedLetter).then(result => {
        const items = result || [];
        if (letterCache.size >= MAX_CACHE) {
          const firstKey = letterCache.keys().next().value;
          if (firstKey) letterCache.delete(firstKey);
        }
        letterCache.set(selectedLetter, items);
        setTopics(items);
        setLoading(false);
        listRef.current?.scrollTo({ top: 0 });
      });
    }
  }, [selectedLetter, view]);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setSearchResults([]); return; }
    const cacheKey = q.trim().toLowerCase();
    const cached = searchCache.get(cacheKey);
    if (cached) {
      setSearchResults(cached);
      setSearching(false);
      return;
    }
    setSearching(true);
    try {
      const r = await TopicalService.SearchTopics(q.trim());
      const results = r || [];
      if (searchCache.size >= MAX_CACHE) {
        const firstKey = searchCache.keys().next().value;
        if (firstKey) searchCache.delete(firstKey);
      }
      searchCache.set(cacheKey, results);
      setSearchResults(results);
    } catch { setSearchResults([]); }
    setSearching(false);
  }, []);

  const handleSearch = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) { setSearchResults([]); setView('browse'); return; }
    setView('search');
    debounceRef.current = setTimeout(() => doSearch(q), 300);
  }, [doSearch]);

  const handleTopicClick = useCallback(async (topic: string) => {
    // Check cache first
    const cached = definitionCache.get(topic);
    if (cached !== undefined) {
      setSelectedTopic({ topic, definition: cached });
      setView('detail');
      setExpanded(false);
      return;
    }
    setLoading(true);
    setExpanded(false);
    try {
      const def = await TopicalService.GetTopicDefinition(topic);
      const result = def || '';
      if (definitionCache.size >= MAX_CACHE) {
        const firstKey = definitionCache.keys().next().value;
        if (firstKey) definitionCache.delete(firstKey);
      }
      definitionCache.set(topic, result);
      setSelectedTopic({ topic, definition: result });
      setView('detail');
    } catch {
      setSelectedTopic({ topic, definition: '' });
      setView('detail');
    }
    setLoading(false);
  }, []);

  const handleCrossRef = useCallback((topicName: string) => {
    handleTopicClick(topicName);
  }, [handleTopicClick]);

  const handleStrongClick = useCallback((strongNum: string) => {
    onWordLookup?.(strongNum);
  }, [onWordLookup]);

  const handleVerseClick = useCallback((bn: number, ch: number, v: number) => {
    onNavigateToVerse?.(bn, ch, v);
  }, [onNavigateToVerse]);

  const handleBack = () => {
    if (query) {
      setView('search');
    } else {
      setView('browse');
    }
    setSelectedTopic(null);
  };

  const currentList = view === 'search' ? searchResults : topics.map(t => ({ topic: t.topic, definition: '' }));

  const detailBlocks = selectedTopic ? parseDefinitionBlocks(selectedTopic.definition) : [];
  const detailIsLong = selectedTopic ? selectedTopic.definition.length > 500 : false;
  const detailDisplayBlocks = detailIsLong && !expanded ? detailBlocks.slice(0, 30) : detailBlocks;

  const renderBlock = (block: ReturnType<typeof parseDefinitionBlocks>[number], i: number) => {
    if (block.type === 'strong') {
      return (
        <button key={i} onClick={() => handleStrongClick(block.text!)}
          className="text-xs font-mono text-fg hover:underline">
          {block.text}
        </button>
      );
    }
    if (block.type === 'crossref') {
      return (
        <button key={i} onClick={() => block.strong ? handleCrossRef(block.strong) : handleCrossRef(block.text.replace(/^See\s+/, ''))}
          className="text-xs text-fg hover:underline block text-left">
          {block.text}
        </button>
      );
    }
    if (block.type === 'verse') {
      return (
        <button key={i} onClick={() => block.verseRef && handleVerseClick(block.verseRef.bn, block.verseRef.ch, block.verseRef.v)}
          className="text-xs text-fg hover:underline inline">
          {block.text}
        </button>
      );
    }
    if (block.type === 'sub-entry') {
      return (
        <div key={i} className="pl-3 border-l border-border/50">
          <span className="text-xs text-fg-secondary leading-relaxed">— {block.text}</span>
        </div>
      );
    }
    if (block.type === 'numbered') {
      return (
        <div key={i} className="pl-3 border-l border-border/50">
          <span className="text-xs text-fg-secondary leading-relaxed">{block.text}</span>
        </div>
      );
    }
    return (
      <p key={i} className="text-xs text-fg-secondary leading-relaxed">{block.text}</p>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          {view === 'detail' ? (
            <button onClick={handleBack}
              className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <List className="w-4 h-4 text-fg-muted" />
          )}
          <span className="text-base font-bold text-fg">
            {view === 'detail' ? selectedTopic?.topic || 'Topic' : "Nave's Topical"}
          </span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search (always visible) */}
      <div className="px-3 pb-3">
        <div className="relative">
          <Input value={query} onChange={e => { setQuery(e.target.value); handleSearch(e.target.value); }}
            onKeyDown={e => {
              if (e.key === 'Enter' && query.trim()) {
                if (debounceRef.current) clearTimeout(debounceRef.current);
                doSearch(query);
              }
              if (e.key === 'Escape') {
                setQuery('');
                setView('browse');
                setSearchResults([]);
              }
            }}
            placeholder="Search topics…"
            disabled={initialLoading} />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-border border-t-fg-muted rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Letter tabs (browse mode only) */}
      {view === 'browse' && !query && (
        <div className="px-3 pb-2">
          <div className="flex flex-wrap gap-0.5">
            {LETTERS.map(L => {
              const count = alphabetIndex[L] || 0;
              return (
                <button key={L} onClick={() => setSelectedLetter(L)}
                  className={`min-w-[22px] h-6 px-1 rounded text-[10px] font-semibold transition-all ${
                    selectedLetter === L
                      ? 'bg-surface-active text-fg'
                      : count > 0
                        ? 'text-fg-muted hover:text-fg hover:bg-surface-hover'
                        : 'text-fg-muted/30 cursor-default'
                  }`}>
                  {L}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 pb-4">
        {/* Initial loading */}
        {initialLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-border border-t-fg-muted rounded-full animate-spin" />
            <span className="text-sm text-fg-muted">Loading topics…</span>
          </div>
        )}

        {/* Loading letter topics */}
        {!initialLoading && loading && view === 'browse' && (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-border border-t-fg-muted rounded-full animate-spin" />
            <span className="text-sm text-fg-muted">Loading…</span>
          </div>
        )}

        {/* Searching (with results showing) */}
        {!initialLoading && searching && searchResults.length > 0 && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-2">
            <div className="w-3 h-3 border-2 border-border border-t-fg-muted rounded-full animate-spin" />
            <span className="text-xs text-fg-muted">Searching…</span>
          </div>
        )}

        {/* Searching (no results yet) */}
        {!initialLoading && searching && searchResults.length === 0 && (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-border border-t-fg-muted rounded-full animate-spin" />
            <span className="text-sm text-fg-muted">Searching…</span>
          </div>
        )}

        {/* Browse/Search list */}
        {!initialLoading && !loading && !searching && view !== 'detail' && (
          <>
            {currentList.length === 0 && (
              <div className="text-center py-8 text-sm text-fg-muted">
                <List className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>{view === 'search' ? 'No topics found' : 'No topics in this letter'}</p>
              </div>
            )}
            {currentList.map((entry, i) => {
              const refs = view === 'search' && entry.definition ? parseVerseRefsFromDef(entry.definition) : [];
              return (
                <motion.div
                  key={`${entry.topic}-${i}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="py-2 px-2 rounded-lg hover:bg-surface-hover transition-colors group"
                >
                  <button
                    onClick={() => handleTopicClick(entry.topic)}
                    className="w-full flex items-center justify-between text-sm text-fg-secondary hover:text-fg transition-colors text-left"
                  >
                    <span>{entry.topic}</span>
                    <ChevronRight className="w-3 h-3 text-fg-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  {refs.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {refs.slice(0, 5).map((ref, j) => (
                        <button key={j}
                          onClick={(e) => { e.stopPropagation(); handleVerseClick(ref.bn, ref.ch, ref.v); }}
                          className="text-[10px] font-mono text-fg-muted hover:text-accent bg-surface/50 px-1.5 py-0.5 rounded transition-colors">
                          {ref.text}
                        </button>
                      ))}
                      {refs.length > 5 && <span className="text-[10px] text-fg-muted">+{refs.length - 5}</span>}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </>
        )}

        {/* Detail view */}
        {!initialLoading && !loading && view === 'detail' && selectedTopic && (
          <div className="py-2">
            <div className="space-y-1.5">
              {detailDisplayBlocks.map(renderBlock)}
            </div>
            {detailIsLong && !expanded && (
              <button onClick={() => setExpanded(true)}
                className="mt-4 w-full py-2 text-xs font-medium text-fg-muted bg-surface-hover rounded-lg hover:bg-surface-active transition-colors">
                Read full article
              </button>
            )}
          </div>
        )}

        {/* Detail loading */}
        {!initialLoading && loading && view === 'detail' && (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-8 h-8 border-2 border-border border-t-fg-muted rounded-full animate-spin" />
            <span className="text-sm text-fg-muted">Loading topic…</span>
          </div>
        )}
      </div>
    </div>
  );
}
