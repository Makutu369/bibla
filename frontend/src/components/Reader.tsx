import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, ArrowLeftRight, X, Bookmark, BookmarkCheck, Copy, Check, Columns2, BookOpen } from 'lucide-react';
import { Verse, Highlight, TranslationInfo, Bookmark as BookmarkType } from '../types/bible';
import { parseVerseWords, cleanVerseText, getBookTestament } from '../utils/text';
import { BibleService } from '../../bindings/changeme';
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
  isBookmarked: (bn: number, ch: number, v: number) => BookmarkType | undefined;
  onToggleBookmark: (bn: number, ch: number, v: number) => void;
  parallelMode: boolean;
  onToggleParallel: () => void;
  parallelTranslation: string;
  onSetParallelTranslation: (t: string) => void;
  onWordLookup: (topic: string) => void;
}

const HL_COLORS = [
  { name: 'yellow', bg: 'bg-yellow-400/30', ring: 'ring-yellow-400/40', dot: '#facc15' },
  { name: 'green', bg: 'bg-emerald-400/30', ring: 'ring-emerald-400/40', dot: '#22c55e' },
  { name: 'blue', bg: 'bg-blue-400/30', ring: 'ring-blue-400/40', dot: '#3b82f6' },
  { name: 'pink', bg: 'bg-pink-400/30', ring: 'ring-pink-400/40', dot: '#ec4899' },
  { name: 'purple', bg: 'bg-violet-400/30', ring: 'ring-violet-400/40', dot: '#a855f7' },
] as const;

function VerseContent({ verse, currentBook, getHighlightFn }: {
  verse: Verse;
  currentBook: { longName: string; bookNumber: number } | null;
  getHighlightFn?: (word: string, strongNumber: string | null) => void;
}) {
  const words = parseVerseWords(verse.text);
  return (
    <>
      <sup className="verse-num">{verse.verse}</sup>
      {words.map((w, i) =>
        w.strongNumber ? (
          <span key={i}
            onClick={(e) => { e.stopPropagation(); getHighlightFn?.(w.text, w.strongNumber); }}
            className="cursor-pointer hover:text-accent transition-colors duration-150"
            title={`Strong's ${currentBook && getBookTestament(currentBook.bookNumber) === 'nt' ? 'G' : 'H'}${w.strongNumber}`}>
            {w.text}
          </span>
        ) : (
          <span key={i}>{w.text}</span>
        )
      )}
      {' '}
    </>
  );
}

export function Reader({ verses, currentBook, currentChapter, loading, highlights, translations, currentTranslation, onSelectTranslation, onToggleHighlight, getHighlight, onPrevChapter, onNextChapter, canGoPrev, canGoNext, isBookmarked, onToggleBookmark, parallelMode, onToggleParallel, parallelTranslation, onSetParallelTranslation, onWordLookup }: ReaderProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeVerse, setActiveVerse] = useState<string | null>(null);
  const [compareVerse, setCompareVerse] = useState<{ bn: number; ch: number; v: number } | null>(null);
  const [copiedVerse, setCopiedVerse] = useState<string | null>(null);
  const [parallelVerses, setParallelVerses] = useState<Verse[]>([]);

  useEffect(() => {
    ref.current?.scrollTo({ top: 0, behavior: 'instant' });
    setActiveVerse(null);
  }, [currentBook, currentChapter]);

  useEffect(() => {
    if (!parallelMode || !currentBook || parallelTranslation === currentTranslation) {
      setParallelVerses([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const v = await BibleService.GetVerses(parallelTranslation, currentBook.bookNumber, currentChapter);
        if (!cancelled) setParallelVerses(v || []);
      } catch {}
    };
    load();
    return () => { cancelled = true; };
  }, [parallelMode, currentBook, currentChapter, parallelTranslation, currentTranslation]);

  const handleWordClick = async (word: string, strongNumber: string | null) => {
    if (!strongNumber) return;
    const prefix = currentBook && getBookTestament(currentBook.bookNumber) === 'nt' ? 'G' : 'H';
    onWordLookup(`${prefix}${strongNumber}`);
  };

  const handleCopy = async (verse: Verse) => {
    const text = cleanVerseText(verse.text);
    const ref = `${currentBook?.longName} ${verse.chapter}:${verse.verse}`;
    try {
      await navigator.clipboard.writeText(`${ref}\n${text}`);
      setCopiedVerse(`${verse.bookNumber}-${verse.chapter}-${verse.verse}`);
      setTimeout(() => setCopiedVerse(null), 1500);
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <span className="text-sm text-fg-muted">Loading…</span>
        </div>
      </div>
    );
  }

  if (!currentBook || verses.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-fg-muted">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-surface flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-fg-muted" />
          </div>
          <div className="text-fg-secondary text-lg font-medium">No text selected</div>
          <div>Choose a book from the sidebar to start reading</div>
        </div>
      </div>
    );
  }

  const paragraphs: Verse[][] = [];
  verses.forEach((verse, i) => {
    if (i === 0 || verse.verse === 1) paragraphs.push([verse]);
    else paragraphs[paragraphs.length - 1].push(verse);
  });

  const parallelParagraphs: Verse[][] = [];
  if (parallelMode && parallelVerses.length > 0) {
    parallelVerses.forEach((verse, i) => {
      if (i === 0 || verse.verse === 1) parallelParagraphs.push([verse]);
      else parallelParagraphs[parallelParagraphs.length - 1].push(verse);
    });
  }

  const otherTranslations = translations.filter(t => t.fileName !== currentTranslation);

  return (
    <div className="flex flex-col h-full">
      {/* Chapter header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border flex-shrink-0 bg-bg/80 backdrop-blur-sm">
        <div>
          <h2 className="text-base font-semibold text-fg">{currentBook.longName}</h2>
          <p className="text-xs text-fg-muted">Chapter {currentChapter}</p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={onToggleParallel}
            whileTap={{ scale: 0.92 }}
            className={`w-9 h-9 flex items-center justify-center rounded-full border transition-all duration-200 ${
              parallelMode
                ? 'border-accent bg-accent text-white shadow-sm'
                : 'border-border text-fg-muted hover:text-fg hover:bg-surface-hover hover:border-border-focus'
            }`}
            title="Parallel reading">
            <Columns2 className="w-4 h-4" />
          </motion.button>
          {parallelMode && (
            <select
              value={parallelTranslation}
              onChange={e => onSetParallelTranslation(e.target.value)}
              className="appearance-none h-9 px-3 pr-7 text-[12px] font-medium bg-surface border border-border rounded-full text-fg-secondary outline-none focus:border-accent cursor-pointer transition-all">
              {otherTranslations.map(t => (
                <option key={t.fileName} value={t.fileName}>{t.displayName}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-0.5 bg-surface rounded-full border border-border p-0.5">
            <motion.button onClick={onPrevChapter} disabled={!canGoPrev}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover disabled:opacity-20 disabled:pointer-events-none transition-all">
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <span className="text-xs text-fg-muted tabular-nums min-w-[20px] text-center font-medium">{currentChapter}</span>
            <motion.button onClick={onNextChapter} disabled={!canGoNext}
              whileTap={{ scale: 0.9 }}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover disabled:opacity-20 disabled:pointer-events-none transition-all">
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Reading area */}
      <div ref={ref} className="flex-1 overflow-y-auto"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('.verse-span')) {
            setActiveVerse(null);
          }
        }}>
        <div className="flex gap-0 h-full">
          {/* Main column */}
          <div className={`mx-auto px-6 py-12 ${parallelMode ? 'flex-1 border-r border-border' : 'w-full max-w-reader'}`}>
            <div className="reader-text">
              {paragraphs.map((para, pIdx) => (
                <p key={pIdx} className={`mb-6 ${pIdx === 0 ? 'drop-cap' : ''}`}>
                  {para.map(verse => {
                    const key = `${verse.bookNumber}-${verse.chapter}-${verse.verse}`;
                    const hl = getHighlight(verse.bookNumber, verse.chapter, verse.verse);
                    const bm = isBookmarked(verse.bookNumber, verse.chapter, verse.verse);
                    const isActive = activeVerse === key;
                    const justCopied = copiedVerse === key;

                    return (
                      <span key={key}
                        className={`verse-span relative inline cursor-pointer rounded-sm transition-colors duration-150 ${hl ? `hl-${hl.color}` : ''} ${isActive ? 'bg-accent-dim' : 'hover:bg-surface-hover/50'}`}
                        onClick={(e) => { e.stopPropagation(); setActiveVerse(isActive ? null : key); }}>

                        <AnimatePresence>
                          {isActive && (
                            <motion.span
                              className="verse-toolbar"
                              initial={{ opacity: 0, scale: 0.92, y: 6 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.92, y: 6 }}
                              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                              onClick={e => e.stopPropagation()}>
                              <span className="inline-flex items-center gap-0.5 bg-bg border border-border rounded-2xl p-1.5 shadow-panel">
                                {/* Highlight colors */}
                                {HL_COLORS.map(c => (
                                  <motion.button key={c.name}
                                    onClick={() => { onToggleHighlight(verse.bookNumber, verse.chapter, verse.verse, c.name); setActiveVerse(null); }}
                                    whileTap={{ scale: 0.8 }}
                                    className="w-6 h-6 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                    title={c.name}>
                                    <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: c.dot }} />
                                  </motion.button>
                                ))}
                                {hl && (
                                  <motion.button
                                    onClick={() => { onToggleHighlight(verse.bookNumber, verse.chapter, verse.verse, hl.color); setActiveVerse(null); }}
                                    whileTap={{ scale: 0.85 }}
                                    className="w-6 h-6 rounded-full flex items-center justify-center text-fg-muted hover:text-fg hover:bg-surface-hover transition-all"
                                    title="Remove highlight">
                                    <X className="w-3 h-3" />
                                  </motion.button>
                                )}

                                <span className="w-px h-5 bg-border mx-1" />

                                {/* Bookmark */}
                                <motion.button
                                  onClick={() => { onToggleBookmark(verse.bookNumber, verse.chapter, verse.verse); setActiveVerse(null); }}
                                  whileTap={{ scale: 0.85 }}
                                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                                    bm ? 'text-accent bg-accent-dim' : 'text-fg-muted hover:text-fg hover:bg-surface-hover'
                                  }`}
                                  title={bm ? 'Remove bookmark' : 'Bookmark'}>
                                  {bm ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                                </motion.button>

                                {/* Copy */}
                                <motion.button
                                  onClick={() => { handleCopy(verse); setActiveVerse(null); }}
                                  whileTap={{ scale: 0.85 }}
                                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-all ${
                                    justCopied ? 'text-green-500 bg-green-500/10' : 'text-fg-muted hover:text-fg hover:bg-surface-hover'
                                  }`}
                                  title="Copy verse">
                                  {justCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </motion.button>

                                <span className="w-px h-5 bg-border mx-1" />

                                {/* Compare */}
                                <motion.button
                                  onClick={() => { setCompareVerse({ bn: verse.bookNumber, ch: verse.chapter, v: verse.verse }); setActiveVerse(null); }}
                                  whileTap={{ scale: 0.95 }}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-fg-muted hover:text-accent hover:bg-accent-dim text-[11px] font-medium transition-all"
                                  title="Compare translations">
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                  <span>Compare</span>
                                </motion.button>
                              </span>
                            </motion.span>
                          )}
                        </AnimatePresence>

                        <VerseContent verse={verse} currentBook={currentBook} getHighlightFn={handleWordClick} />
                      </span>
                    );
                  })}
                </p>
              ))}
            </div>

            {/* Bottom navigation */}
            {(canGoPrev || canGoNext) && (
              <div className="flex justify-between mt-16 text-sm">
                <motion.button onClick={onPrevChapter} disabled={!canGoPrev}
                  whileTap={{ x: -3 }}
                  className="flex items-center gap-2 text-fg-muted hover:text-accent disabled:opacity-20 disabled:pointer-events-none transition-colors duration-200 group">
                  <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                  Previous
                </motion.button>
                <motion.button onClick={onNextChapter} disabled={!canGoNext}
                  whileTap={{ x: 3 }}
                  className="flex items-center gap-2 text-fg-muted hover:text-accent disabled:opacity-20 disabled:pointer-events-none transition-colors duration-200 group">
                  Next
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </motion.button>
              </div>
            )}
          </div>

          {/* Parallel column */}
          {parallelMode && parallelVerses.length > 0 && (
            <div className="flex-1 px-6 py-12">
              <div className="reader-text" style={{ opacity: 0.75 }}>
                {parallelParagraphs.map((para, pIdx) => (
                  <p key={pIdx} className={`mb-6 ${pIdx === 0 ? 'drop-cap' : ''}`}>
                    {para.map(verse => (
                      <span key={`${verse.bookNumber}-${verse.chapter}-${verse.verse}`} className="inline rounded-sm">
                        <VerseContent verse={verse} currentBook={currentBook} />
                      </span>
                    ))}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Compare Panel */}
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
    </div>
  );
}

