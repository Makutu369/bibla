import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Highlighter, X, Trash2 } from 'lucide-react';
import { useHighlights } from '../hooks/useHighlights';
import { BibleService } from '../../bindings/changeme';

const COLORS = [
  { key: 'yellow', dot: '#facc15' },
  { key: 'green', dot: '#22c55e' },
  { key: 'orange', dot: '#f97316' },
  { key: 'pink', dot: '#ec4899' },
  { key: 'purple', dot: '#a855f7' },
];

interface HighlightsPanelProps {
  translation: string;
  onNavigate: (bookNumber: number, chapter: number, verse?: number) => void;
  onClose: () => void;
}

export function HighlightsPanel({ translation, onNavigate, onClose }: HighlightsPanelProps) {
  const { highlights, removeHighlight } = useHighlights(translation);
  const [colorFilter, setColorFilter] = useState('');
  const [bookNames, setBookNames] = useState<Record<number, string>>({});
  const [verseTexts, setVerseTexts] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadNames = async () => {
      const nums = [...new Set(highlights.map(h => h.bookNumber))];
      const names: Record<number, string> = {};
      for (const n of nums) {
        try { names[n] = await BibleService.GetBookName(translation, n); } catch {}
      }
      setBookNames(names);
    };
    if (highlights.length > 0) loadNames();
  }, [highlights, translation]);

  useEffect(() => {
    const loadTexts = async () => {
      const texts: Record<string, string> = {};
      await Promise.all(highlights.map(async (h) => {
        try {
          const v = await BibleService.GetVerse(translation, h.bookNumber, h.chapter, h.verse);
          if (v) {
            const cleaned = v.text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
            texts[`${h.bookNumber}-${h.chapter}-${h.verse}`] = cleaned;
          }
        } catch {}
      }));
      setVerseTexts(texts);
    };
    if (highlights.length > 0) loadTexts();
  }, [highlights, translation]);

  const filtered = colorFilter
    ? highlights.filter(h => h.color === colorFilter)
    : highlights;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Highlighter className="w-4 h-4 text-fg-muted" />
          <span className="text-base font-bold text-fg">Highlights</span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Color dots filter */}
      {highlights.length > 0 && (
        <div className="px-4 pb-4 flex items-center gap-2">
          <button
            onClick={() => setColorFilter('')}
            className={`w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center ${
              !colorFilter
                ? 'border-accent scale-110'
                : 'border-fg-muted/30 hover:border-fg-muted/60'
            }`}
            title="All colors">
            <span className="w-2 h-2 rounded-full bg-fg-muted/50" />
          </button>
          {COLORS.map(c => {
            const active = colorFilter === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setColorFilter(active ? '' : c.key)}
                className={`w-5 h-5 rounded-full transition-all ${
                  active ? `ring-2 ring-offset-1 ring-offset-bg scale-110 ring-${c.key}` : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c.dot }}
                title={c.key}
              />
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-fg-muted">
            <Highlighter className="w-7 h-7 mx-auto mb-3 opacity-20" />
            <p>{colorFilter ? 'No highlights with this color' : 'No highlights yet'}</p>
            <p className="text-xs mt-1 opacity-60">Tap a verse and use the color dots</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((h, i) => {
              const vk = `${h.bookNumber}-${h.chapter}-${h.verse}`;
              const text = verseTexts[vk] || '';
              const bookName = bookNames[h.bookNumber] || '…';
              const colorDot = COLORS.find(c => c.key === h.color)?.dot || '#facc15';

              return (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="group"
                >
                  <button
                    onClick={() => onNavigate(h.bookNumber, h.chapter, h.verse)}
                    className="w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorDot }} />
                      <span className="text-xs font-semibold text-fg tracking-tight">
                        {bookName}
                      </span>
                      <span className="text-[11px] text-fg-muted tabular-nums">
                        {h.chapter}:{h.verse}
                      </span>
                      <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <span
                          onClick={(e) => { e.stopPropagation(); removeHighlight(h.id); }}
                          className="inline-flex w-4 h-4 items-center justify-center rounded text-fg-muted hover:text-red-400 cursor-pointer"
                          title="Remove">
                          <Trash2 className="w-3 h-3" />
                        </span>
                      </span>
                    </div>
                    {text && (
                      <p className="text-[11px] text-fg-secondary/70 leading-relaxed line-clamp-2 ml-3.5">
                        {text.length > 120 ? text.slice(0, 120) + '…' : text}
                      </p>
                    )}
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
