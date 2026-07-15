import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, Circle, ArrowRight, X } from 'lucide-react';
import { useReadingPlan } from '../hooks/useReadingPlan';
import { BibleService } from '../../bindings/changeme';
import { useState, useEffect } from 'react';

interface ReadingPlanPanelProps {
  onNavigate: (bookNumber: number, chapter: number, verse?: number) => void;
  onClose: () => void;
}

export function ReadingPlanPanel({ onNavigate, onClose }: ReadingPlanPanelProps) {
  const { plan, markDone, unmarkDone, isDone, getTodayReadings, getCompletionPercent, activatePlan } = useReadingPlan();
  const [bookNames, setBookNames] = useState<Record<number, string>>({});

  const todayReadings = getTodayReadings();
  const completedCount = todayReadings.filter(r => isDone(r.bookNumber, r.chapter)).length;
  const totalCount = todayReadings.length;

  useEffect(() => {
    const loadNames = async () => {
      const nums = [...new Set(todayReadings.map(r => r.bookNumber))];
      const names: Record<number, string> = {};
      for (const n of nums) {
        try { names[n] = await BibleService.GetBookName('KJV', n); } catch {}
      }
      setBookNames(names);
    };
    if (todayReadings.length > 0) loadNames();
  }, [todayReadings]);

  if (!plan) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-fg-muted" />
            <span className="text-base font-bold text-fg">Reading Plan</span>
          </div>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
            <span className="text-lg leading-none"><X className="w-3.5 h-3.5" /></span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30 text-fg-muted" />
            <p className="text-sm text-fg-muted mb-4">No reading plan active</p>
            <button
              onClick={activatePlan}
              className="px-4 py-2 text-sm font-medium bg-surface-active text-fg rounded-full hover:bg-surface-hover transition-colors">
              Start Bible in a Year
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-fg-muted" />
          <span className="text-base font-bold text-fg">Reading Plan</span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
            <span className="text-lg leading-none"><X className="w-3.5 h-3.5" /></span>
          </button>
        </div>

      <div className="px-3 pb-3">
        <div className="p-3 rounded-full bg-surface border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-fg-muted">Today's Progress</span>
            <span className="text-xs font-bold text-fg">{completedCount}/{totalCount}</span>
          </div>
          <div className="w-full h-1.5 bg-surface-active rounded-full overflow-hidden">
            <div
              className="h-full bg-fg-muted rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }} />
          </div>
          <div className="text-xs text-fg-muted mt-2">
            {plan.name} · {getCompletionPercent()}% complete
          </div>
        </div>
      </div>

      <div className="px-3 pb-2">
        <span className="text-xs font-medium text-fg-muted px-1">Today's Readings</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {todayReadings.length === 0 ? (
          <div className="text-center py-8 text-sm text-fg-muted">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-green-400 opacity-60" />
            <p>All caught up!</p>
          </div>
        ) : (
          todayReadings.map((r, i) => {
            const done = isDone(r.bookNumber, r.chapter);
            return (
              <motion.div
                key={`${r.bookNumber}-${r.chapter}`}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-2 py-2 border-b border-border/30 last:border-0 group"
              >
                <button
                  onClick={() => done ? unmarkDone(r.bookNumber, r.chapter) : markDone(r.bookNumber, r.chapter)}
                  className="flex-shrink-0 transition-colors"
                >
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <Circle className="w-4 h-4 text-fg-muted hover:text-fg" />
                  )}
                </button>
                <button
                  onClick={() => onNavigate(r.bookNumber, r.chapter)}
                  className={`flex-1 text-left text-sm transition-colors ${done ? 'text-fg-muted line-through' : 'text-fg-secondary hover:text-fg'}`}
                >
                  {bookNames[r.bookNumber] || 'Book'} {r.chapter}
                </button>
                <ArrowRight className="w-3 h-3 text-fg-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
