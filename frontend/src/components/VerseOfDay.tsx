import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { BibleService } from '../../bindings/changeme';
import { cleanVerseText } from '../utils/text';

interface VerseOfDayProps {
  currentTranslation: string;
  onNavigate: (bookNumber: number, chapter: number, verse?: number) => void;
}

// Deterministic hash from date string
function dateHash(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const ch = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Famous verses: [bookNumber, chapter, verse]
const FAVORITE_VERSES: [number, number, number][] = [
  [470, 11, 28],   // Matthew 11:28
  [500, 3, 16],    // John 3:16
  [730, 21, 4],    // Revelation 21:4
  [170, 23, 1],    // Psalm 23:1
  [200, 40, 31],   // Isaiah 40:31
  [490, 15, 13],   // Luke 15:13
  [240, 3, 5],     // Proverbs 3:5
  [520, 8, 28],    // Romans 8:28
  [560, 2, 10],    // Ephesians 2:10
  [650, 11, 1],    // Hebrews 11:1
  [690, 4, 18],    // 1 John 4:18
  [170, 119, 105], // Psalm 119:105
  [200, 41, 10],   // Isaiah 41:10
  [470, 5, 14],    // Matthew 5:14
  [10, 1, 1],      // Genesis 1:1
  [240, 3, 6],     // Proverbs 3:6
  [510, 1, 1],     // Acts 1:1
  [530, 13, 4],    // 1 Corinthians 13:4
  [170, 46, 10],   // Psalm 46:10
  [200, 53, 5],    // Isaiah 53:5
  [490, 6, 35],    // Luke 6:35
  [550, 5, 22],    // Galatians 5:22
  [240, 16, 3],    // Proverbs 16:3
  [170, 37, 4],    // Psalm 37:4
  [500, 14, 27],   // John 14:27
  [160, 1, 5],     // Nehemiah 1:5
  [470, 6, 33],    // Matthew 6:33
  [170, 56, 3],    // Psalm 56:3
  [200, 30, 18],   // Isaiah 30:18
  [570, 4, 13],    // Philippians 4:13
  [500, 10, 10],   // John 10:10
  [220, 1, 22],    // Job 1:22
  [190, 3, 1],     // Ecclesiastes 3:1
  [500, 8, 32],    // John 8:32
  [470, 19, 26],   // Matthew 19:26
  [240, 4, 25],    // Proverbs 4:25
  [170, 91, 11],   // Psalm 91:11
  [490, 1, 37],    // Luke 1:37
  [480, 14, 6],    // Mark 14:6
  [170, 139, 14],  // Psalm 139:14
];

export function VerseOfDay({ currentTranslation, onNavigate }: VerseOfDayProps) {
  const [verse, setVerse] = useState<{ text: string; bookNumber: number; chapter: number; verse: number } | null>(null);
  const [bookName, setBookName] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedDate = localStorage.getItem('bibla-vod-dismissed');
    const today = new Date().toISOString().split('T')[0];
    if (dismissedDate === today) { setDismissed(true); return; }

    const load = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const hash = dateHash(todayStr);
      const [bn, ch, v] = FAVORITE_VERSES[hash % FAVORITE_VERSES.length];
      try {
        const verses = await BibleService.GetVerses(currentTranslation, bn, ch);
        const found = verses?.find((x: { verse: number }) => x.verse === v);
        if (found) {
          setVerse({ text: cleanVerseText(found.text), bookNumber: bn, chapter: ch, verse: v });
          const name = await BibleService.GetBookName(currentTranslation, bn);
          setBookName(name);
        }
      } catch {}
    };
    if (currentTranslation) load();
  }, [currentTranslation]);

  const dismiss = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('bibla-vod-dismissed', today);
    setDismissed(true);
  };

  if (dismissed || !verse) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="mx-4 mb-3 p-4 rounded-2xl bg-surface border border-border"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-fg-muted mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[10px] font-medium text-fg-muted uppercase tracking-wider mb-1">Verse of the Day</div>
              <p className="text-sm text-fg-secondary leading-relaxed font-serif italic">
                "{verse.text}"
              </p>
              <button
                onClick={() => onNavigate(verse.bookNumber, verse.chapter, verse.verse)}
                className="text-xs text-fg hover:underline mt-1.5 inline-block"
              >
                {bookName} {verse.chapter}:{verse.verse}
              </button>
            </div>
          </div>
          <button onClick={dismiss}
            className="w-5 h-5 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors flex-shrink-0">
            <X className="w-3 h-3" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
