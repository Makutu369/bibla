import { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, ArrowLeftRight, X } from 'lucide-react';
import { Verse, Highlight, TranslationInfo } from '../types/bible';
import { DictionaryEntry } from '../types/dictionary';
import { parseVerseWords, getBookTestament } from '../utils/text';
import { DictionaryService } from '../../bindings/changeme';
import { ComparePanel } from './ComparePanel';

interface ReaderProps {
  verses: Verse[];
  currentBook: { longName: string; shortName: string; bookNumber: number } | null;
  currentChapter: number;
  loading: boolean;
  highlights: Highlight[];
  translations: TranslationInfo[];
  currentTranslation: string;
  onSelectTranslation: (fileName: string) => void;
  onToggleHighlight: (bn: number, ch: number, v: number, color: string) => void;
  getHighlight: (bn: number, ch: number, v: number) => Highlight | undefined;
  onPrevChapter: () => void;
  onNextChapter: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

const HL_COLORS = [
  { name: 'yellow', cls: 'bg-yellow-400/30', border: 'border-yellow-400/40' },
  { name: 'green', cls: 'bg-emerald-400/30', border: 'border-emerald-400/40' },
  { name: 'blue', cls: 'bg-blue-400/30', border: 'border-blue-400/40' },
  { name: 'pink', cls: 'bg-pink-400/30', border: 'border-pink-400/40' },
  { name: 'purple', cls: 'bg-violet-400/30', border: 'border-violet-400/40' },
] as const;

export function Reader({ verses, currentBook, currentChapter, loading, highlights, translations, currentTranslation, onSelectTranslation, onToggleHighlight, getHighlight, onPrevChapter, onNextChapter, canGoPrev, canGoNext }: ReaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeVerse, setActiveVerse] = useState<string | null>(null);
  const [compareVerse, setCompareVerse] = useState<{ bn: number; ch: number; v: number } | null>(null);
  const [dictWord, setDictWord] = useState('');
  const [dictEntries, setDictEntries] = useState<DictionaryEntry[]>([]);
  const [dictLoading, setDictLoading] = useState(false);

  useEffect(() => {
    ref.current?.scrollTo({ top: 0, behavior: 'instant' });
    setActiveVerse(null);
  }, [currentBook, currentChapter]);

  const handleWordClick = async (word: string, strongNumber: string | null) => {
    if (!strongNumber) return;
    const prefix = currentBook && getBookTestament(currentBook.bookNumber) === 'nt' ? 'G' : 'H';
    setDictLoading(true);
    setDictWord(`${prefix}${strongNumber}`);
    try {
      const results = await DictionaryService.LookupTopic(`${prefix}${strongNumber}`);
      setDictEntries(results || []);
    } catch {
      setDictEntries([]);
    } finally {
      setDictLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-sm text-fg-muted">Loading…</div>;
  }

  if (!currentBook || verses.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-fg-muted">
        <div className="text-center space-y-3">
          <div className="text-fg-secondary text-lg font-medium">No text selected</div>
          <div>Choose a book from the sidebar</div>
        </div>
      </div>
    );
  }

  const paragraphs: Verse[][] = [];
  verses.forEach((verse, i) => {
    if (i === 0 || verse.verse === 1) paragraphs.push([verse]);
    else paragraphs[paragraphs.length - 1].push(verse);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0">
        <span className="text-base text-fg font-medium">{currentBook.longName} {currentChapter}</span>
        <div className="flex items-center gap-1">
          <motion.button onClick={onPrevChapter} disabled={!canGoPrev}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-fg-muted hover:text-fg hover:bg-surface-hover disabled:opacity-20 disabled:pointer-events-none transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <span className="text-xs text-fg-muted tabular-nums min-w-[20px] text-center">{currentChapter}</span>
          <motion.button onClick={onNextChapter} disabled={!canGoNext}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-fg-muted hover:text-fg hover:bg-surface-hover disabled:opacity-20 disabled:pointer-events-none transition-colors">
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      <div ref={ref} className="flex-1 overflow-y-auto"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('.verse-span')) {
            setActiveVerse(null);
          }
        }}>
        <div className="max-w-reader mx-auto px-6 py-12">
          <div className="reader-text">
            {paragraphs.map((para, pIdx) => (
              <p key={pIdx} className={`mb-6 ${pIdx === 0 ? 'drop-cap' : ''}`}>
                {para.map(verse => {
                  const words = parseVerseWords(verse.text);
                  const key = `${verse.bookNumber}-${verse.chapter}-${verse.verse}`;
                  const hl = getHighlight(verse.bookNumber, verse.chapter, verse.verse);
                  const isActive = activeVerse === key;

                  return (
                    <span key={key}
                      className={`verse-span relative inline cursor-pointer rounded-sm ${hl ? `hl-${hl.color}` : ''} ${isActive ? 'bg-surface-active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setActiveVerse(isActive ? null : key); }}>

                      <AnimatePresence>
                        {isActive && (
                          <motion.span
                            className="verse-toolbar"
                            initial={{ opacity: 0, scale: 0.9, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 4 }}
                            transition={{ duration: 0.12, ease: 'easeOut' }}
                            onClick={e => e.stopPropagation()}>
                            <span className="inline-flex items-center gap-1 bg-bg border border-border rounded-full p-1 shadow-xl">
                              {HL_COLORS.map(c => (
                                <motion.button key={c.name}
                                  onClick={() => { onToggleHighlight(verse.bookNumber, verse.chapter, verse.verse, c.name); setActiveVerse(null); }}
                                  whileTap={{ scale: 0.85 }}
                                  className={`w-5 h-5 rounded-full ${c.cls} border ${c.border} transition-transform hover:scale-110`}
                                  title={c.name} />
                              ))}
                              {hl && (
                                <motion.button
                                  onClick={() => { onToggleHighlight(verse.bookNumber, verse.chapter, verse.verse, hl.color); setActiveVerse(null); }}
                                  whileTap={{ scale: 0.85 }}
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-fg-muted hover:text-fg text-[10px] transition-transform hover:scale-110"
                                  title="Remove highlight">
                                  <X className="w-3 h-3" />
                                </motion.button>
                              )}
                              <span className="w-px h-4 bg-border" />
                              <motion.button
                                onClick={() => { setCompareVerse({ bn: verse.bookNumber, ch: verse.chapter, v: verse.verse }); setActiveVerse(null); }}
                                whileTap={{ scale: 0.95 }}
                                className={`flex items-center gap-1 px-2 py-1 rounded-full text-fg-muted hover:text-fg-secondary hover:bg-surface-hover text-[11px] transition-all duration-150 ${isActive ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
                                title="Compare translations">
                                <ArrowLeftRight className="w-3.5 h-3.5" />
                                <span>Compare</span>
                              </motion.button>
                            </span>
                          </motion.span>
                        )}
                      </AnimatePresence>

                      <sup className="verse-num">{verse.verse}</sup>
                      {words.map((w, i) =>
                        w.strongNumber ? (
                          <span key={i}
                            onClick={(e) => { e.stopPropagation(); handleWordClick(w.text, w.strongNumber); }}
                            className="cursor-pointer hover:text-accent transition-colors"
                            title={`Strong's ${currentBook && getBookTestament(currentBook.bookNumber) === 'nt' ? 'G' : 'H'}${w.strongNumber}`}>
                            {w.text}
                          </span>
                        ) : (
                          <span key={i}>{w.text}</span>
                        )
                      )}
                      {' '}
                    </span>
                  );
                })}
              </p>
            ))}
          </div>

          {(canGoPrev || canGoNext) && (
            <div className="flex justify-between mt-16 text-sm">
              <motion.button onClick={onPrevChapter} disabled={!canGoPrev}
                whileTap={{ x: -3 }}
                className="flex items-center gap-1.5 text-fg-muted hover:text-fg disabled:opacity-20 disabled:pointer-events-none transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" />
                Previous
              </motion.button>
              <motion.button onClick={onNextChapter} disabled={!canGoNext}
                whileTap={{ x: 3 }}
                className="flex items-center gap-1.5 text-fg-muted hover:text-fg disabled:opacity-20 disabled:pointer-events-none transition-colors">
                Next
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {compareVerse && (
          <ComparePanel
            bookNumber={compareVerse.bn}
            chapter={compareVerse.ch}
            verse={compareVerse.v}
            bookName={currentBook.longName}
            translations={translations}
            currentTranslation={currentTranslation}
            onSelectTranslation={onSelectTranslation}
            onClose={() => setCompareVerse(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {dictWord && createPortal(
          <motion.div
            key="dict-popup"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] w-[400px] max-h-[300px] bg-bg border border-border rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <span className="text-sm font-medium text-fg">{dictWord}{dictLoading && ' …'}</span>
              <button onClick={() => { setDictEntries([]); setDictWord(''); }}
                className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[250px]">
              {dictEntries.length === 0 ? (
                <p className="text-sm text-fg-muted">No entries found.</p>
              ) : (
                dictEntries.map((entry, i) => (
                  <div key={i} className="mb-3 last:mb-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-mono text-fg-muted">{entry.topic}</span>
                      {entry.lexeme && <span className="text-sm text-fg">{entry.lexeme}</span>}
                      {entry.transliteration && <span className="text-xs text-fg-muted italic">({entry.transliteration})</span>}
                    </div>
                    <p className="text-sm text-fg-secondary mt-0.5">{entry.shortDef}</p>
                    {entry.definition && (
                      <p className="text-xs text-fg-muted mt-0.5 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: entry.definition.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200) }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </div>
  );
}
