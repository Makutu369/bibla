import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { TranslationInfo } from '../types/bible';
import { BibleService } from '../../bindings/changeme';
import { cleanVerseText } from '../utils/text';

interface ComparePanelProps {
  bookNumber: number;
  chapter: number;
  verse: number;
  bookName: string;
  translations: TranslationInfo[];
  currentTranslation: string;
  onSelectTranslation: (fileName: string) => void;
  onClose: () => void;
}

interface VerseLine {
  translation: string;
  displayName: string;
  text: string;
}

export function ComparePanel({ bookNumber, chapter, verse, bookName, translations, currentTranslation, onSelectTranslation, onClose }: ComparePanelProps) {
  const [lines, setLines] = useState<VerseLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const results: VerseLine[] = [];
      for (const t of translations) {
        try {
          const verses = await BibleService.GetVerses(t.fileName, bookNumber, chapter);
          const v = verses?.find((x: { verse: number }) => x.verse === verse);
          if (v) {
            results.push({ translation: t.fileName, displayName: t.displayName, text: cleanVerseText(v.text) });
          }
        } catch {}
      }
      if (!cancelled) {
        setLines(results);
        setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [bookNumber, chapter, verse, translations]);

  return createPortal(
    <div className="fixed inset-0 z-[9998]">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="absolute top-[52px] right-0 bottom-0 w-[380px] bg-bg border-l border-border shadow-2xl flex flex-col"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <div className="text-sm font-medium text-fg">Compare</div>
            <div className="text-xs text-fg-muted">{bookName} {chapter}:{verse}</div>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5">
          {loading ? (
            <div className="text-sm text-fg-muted text-center py-8">Loading…</div>
          ) : lines.length === 0 ? (
            <div className="text-sm text-fg-muted text-center py-8">No translations available</div>
          ) : (
            lines.map((line, i) => (
              <motion.button
                key={line.translation}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                onClick={() => { onSelectTranslation(line.translation); onClose(); }}
                className={`w-full text-left py-4 transition-colors ${
                  i > 0 ? 'border-t border-border' : ''
                } ${line.translation === currentTranslation ? 'text-fg' : 'text-fg-secondary hover:text-fg'}`}>
                <div className="text-xs font-medium text-fg-muted mb-1">{line.displayName}</div>
                <div className="text-sm leading-relaxed">{line.text}</div>
              </motion.button>
            ))
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
