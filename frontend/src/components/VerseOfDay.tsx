import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';
import { BibleService } from '../../bindings/changeme';
import { cleanVerseText } from '../utils/text';

interface VerseOfDayProps {
  currentTranslation: string;
  onNavigate: (bookNumber: number, chapter: number) => void;
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
  [320, 11, 28],   // Matthew 11:28
  [350, 3, 16],    // John 3:16
  [560, 21, 4],    // Revelation 21:4
  [170, 23, 1],    // Psalm 23:1
  [200, 40, 31],   // Isaiah 40:31
  [340, 15, 13],   // Luke 15:13
  [180, 3, 5],     // Proverbs 3:5
  [370, 8, 28],    // Romans 8:28
  [410, 2, 10],    // Ephesians 2:10
  [490, 11, 1],    // Hebrews 11:1
  [530, 4, 18],    // 1 John 4:18
  [170, 119, 105], // Psalm 119:105
  [200, 41, 10],   // Isaiah 41:10
  [320, 5, 14],    // Matthew 5:14
  [10, 1, 1],      // Genesis 1:1
  [180, 3, 6],     // Proverbs 3:6
  [360, 1, 1],     // Acts 1:1
  [380, 13, 4],    // 1 Cor 13:4
  [170, 46, 10],   // Psalm 46:10
  [200, 53, 5],    // Isaiah 53:5
  [340, 6, 35],    // Luke 6:35
  [400, 5, 22],    // Galatians 5:22
  [180, 16, 3],    // Proverbs 16:3
  [170, 37, 4],    // Psalm 37:4
  [350, 14, 27],   // John 14:27
  [150, 11, 5],    // Nehemiah 1:5
  [320, 6, 33],    // Matthew 6:33
  [170, 56, 3],    // Psalm 56:3
  [200, 30, 18],   // Isaiah 30:18
  [440, 4, 13],    // Philippians 4:13
  [350, 10, 10],   // John 10:10
  [160, 3, 23],    // Job 3:23 -- actually Job 1:22 or Ecclesiastes
  [190, 3, 1],     // Ecclesiastes 3:1
  [350, 8, 32],    // John 8:32
  [320, 19, 26],   // Matthew 19:26
  [180, 4, 25],    // Proverbs 4:25
  [170, 91, 11],   // Psalm 91:11
  [340, 1, 37],    // Luke 1:37
  [330, 14, 6],    // Mark 14:6
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
            <Sparkles className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[10px] font-medium text-fg-muted uppercase tracking-wider mb-1">Verse of the Day</div>
              <p className="text-sm text-fg-secondary leading-relaxed font-serif italic">
                "{verse.text}"
              </p>
              <button
                onClick={() => onNavigate(verse.bookNumber, verse.chapter)}
                className="text-xs text-accent hover:underline mt-1.5 inline-block"
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
