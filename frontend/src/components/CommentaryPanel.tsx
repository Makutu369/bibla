import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, X, ChevronRight, ChevronDown } from 'lucide-react';
import { CommentaryService, BibleService } from '../../bindings/changeme';

interface CommentaryEntry {
  bookNumber: number;
  chapterFrom: number;
  verseFrom: number;
  chapterTo: number;
  verseTo: number;
  marker: string;
  text: string;
  source: string;
}

interface CommentaryPanelProps {
  translation: string;
  bookNumber: number;
  chapter: number;
  onNavigateToVerse: (bookNumber: number, chapter: number, verse?: number) => void;
  onClose: () => void;
}

const AVAILABLE_COMMENTARIES = ['ESV', 'GNTD', 'NLT07', 'TPT'];

function parseCommentaryText(html: string): { type: string; text: string; verseRef?: { bn: number; ch: number; v: number } }[] {
  const blocks: { type: string; text: string; verseRef?: { bn: number; ch: number; v: number } }[] = [];
  const lines = html.split(/<br\s*\/?>/i);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const verseMatch = trimmed.match(/<a href='B:(\d+)\s+(\d+):(\d+)'>[^<]*<\/a>/);
    if (verseMatch) {
      const bn = parseInt(verseMatch[1]);
      const ch = parseInt(verseMatch[2]);
      const v = parseInt(verseMatch[3]);
      const textMatch = trimmed.match(/<a href='[^']+'>([^<]*)<\/a>/);
      const text = textMatch?.[1]?.trim() || `${bn} ${ch}:${v}`;
      blocks.push({ type: 'verse', text, verseRef: { bn, ch, v } });
      continue;
    }

    const clean = trimmed
      .replace(/<b>([^<]+)<\/b>/g, '$1')
      .replace(/<i>([^<]+)<\/i>/g, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&#\d+;/g, '')
      .trim();

    if (!clean) continue;
    blocks.push({ type: 'text', text: clean });
  }

  return blocks;
}

export function CommentaryPanel({ translation, bookNumber, chapter, onNavigateToVerse, onClose }: CommentaryPanelProps) {
  const [commentaries, setCommentaries] = useState<CommentaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVerses, setExpandedVerses] = useState<Set<number>>(new Set());
  const [bookName, setBookName] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [result, name] = await Promise.all([
          CommentaryService.GetCommentaryForChapter(translation, bookNumber, chapter),
          BibleService.GetBookName(translation, bookNumber),
        ]);
        setCommentaries(result || []);
        setBookName(name);
        setExpandedVerses(new Set());
      } catch {
        setCommentaries([]);
        setBookName('');
      }
      setLoading(false);
    };
    load();
  }, [translation, bookNumber, chapter]);

  const toggleVerse = useCallback((verse: number) => {
    setExpandedVerses(prev => {
      const next = new Set(prev);
      if (next.has(verse)) next.delete(verse);
      else next.add(verse);
      return next;
    });
  }, []);

  const grouped = new Map<number, CommentaryEntry[]>();
  for (const c of commentaries) {
    const existing = grouped.get(c.verseFrom) || [];
    existing.push(c);
    grouped.set(c.verseFrom, existing);
  }

  const strippedTranslation = translation.replace(/\.sqlite3$/i, '').replace(/\.SQLite3$/i, '');
  const isAvailable = AVAILABLE_COMMENTARIES.some(t => t.toUpperCase() === strippedTranslation.toUpperCase());

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-fg-muted" />
          <span className="text-base font-bold text-fg">Commentary</span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4 pb-4">
        <span className="text-xs text-fg-muted">
          {bookName || '—'} {chapter}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-7 h-7 border-2 border-border border-t-fg-muted rounded-full animate-spin" />
          </div>
        )}

        {!loading && !isAvailable && (
          <div className="text-center py-16 text-sm text-fg-muted">
            <MessageSquare className="w-7 h-7 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-fg-secondary">No commentary for this translation</p>
            <p className="text-xs mt-1.5 opacity-60 leading-relaxed">
              Available for: {AVAILABLE_COMMENTARIES.join(', ')}
            </p>
          </div>
        )}

        {!loading && isAvailable && grouped.size === 0 && (
          <div className="text-center py-16 text-sm text-fg-muted">
            <MessageSquare className="w-7 h-7 mx-auto mb-3 opacity-20" />
            <p>No footnotes for this chapter</p>
          </div>
        )}

        {!loading && grouped.size > 0 && (
          <div className="space-y-0.5">
            {Array.from(grouped.entries()).map(([verse, entries]) => {
              const isExpanded = expandedVerses.has(verse);
              return (
                <motion.div
                  key={verse}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="group"
                >
                  <button
                    onClick={() => toggleVerse(verse)}
                    className="w-full flex items-center gap-2 py-2.5 px-2 -mx-2 rounded-lg hover:bg-surface-hover transition-colors text-left"
                  >
                    <button
                      onClick={e => { e.stopPropagation(); onNavigateToVerse(bookNumber, chapter, verse); }}
                      className="text-xs font-semibold text-accent hover:underline shrink-0"
                    >
                      v{verse}
                    </button>
                    <div className="flex-1 flex items-center gap-1 min-w-0 overflow-hidden">
                      {entries.map((e, i) => (
                        <span key={i} className="text-[10px] font-mono px-1 py-0.5 rounded bg-surface text-fg-muted truncate">
                          {e.marker}
                        </span>
                      ))}
                    </div>
                    {isExpanded
                      ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-fg-muted" />
                      : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-fg-muted" />
                    }
                  </button>

                  {isExpanded && (
                    <div className="px-2 pb-3 space-y-2">
                      {entries.map((entry, i) => {
                        const blocks = parseCommentaryText(entry.text);
                        return (
                          <div key={i} className="pl-2 border-l-2 border-accent/30">
                            <span className="text-[10px] font-mono font-semibold text-accent mb-1 block">
                              {entry.marker}
                            </span>
                            <div className="space-y-1">
                              {blocks.map((block, j) => {
                                if (block.type === 'verse' && block.verseRef) {
                                  return (
                                    <button
                                      key={j}
                                      onClick={() => onNavigateToVerse(block.verseRef!.bn, block.verseRef!.ch, block.verseRef!.v)}
                                      className="text-xs text-accent hover:underline inline"
                                    >
                                      {block.text}
                                    </button>
                                  );
                                }
                                return (
                                  <p key={j} className="text-xs text-fg-secondary leading-relaxed">
                                    {block.text}
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
