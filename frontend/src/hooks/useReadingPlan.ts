import { useState, useEffect, useCallback } from 'react';
import { PlanProgress } from '../types/plan';
import { ReadingPlanService } from '../../bindings/changeme';
import type { ReadingPlanJSON } from '../../bindings/changeme/models';
import { BIBLE_READING_PLAN } from '../utils/readingPlanData';

export function useReadingPlan() {
  const [plan, setPlan] = useState<ReadingPlanJSON | null>(null);
  const [progress, setProgress] = useState<PlanProgress[]>([]);

  useEffect(() => {
    loadPlan();
  }, []);

  const loadPlan = async () => {
    try {
      const plans = await ReadingPlanService.GetAllPlans();
      if (plans && plans.length > 0) {
        setPlan(plans[0]);
        const p = await ReadingPlanService.GetProgress(plans[0].id);
        setProgress((p || []) as unknown as PlanProgress[]);
      }
    } catch {}
  };

  const activatePlan = useCallback(async () => {
    try {
      await ReadingPlanService.SavePlan(BIBLE_READING_PLAN as unknown as ReadingPlanJSON);
      setPlan(BIBLE_READING_PLAN as unknown as ReadingPlanJSON);
      const p = await ReadingPlanService.GetProgress(BIBLE_READING_PLAN.id);
      setProgress((p || []) as unknown as PlanProgress[]);
    } catch {}
  }, []);

  const markDone = useCallback(async (bookNumber: number, chapter: number) => {
    if (!plan) return;
    try {
      await ReadingPlanService.MarkChapter(plan.id, bookNumber, chapter);
      const p = await ReadingPlanService.GetProgress(plan.id);
      setProgress((p || []) as unknown as PlanProgress[]);
    } catch {}
  }, [plan]);

  const unmarkDone = useCallback(async (bookNumber: number, chapter: number) => {
    if (!plan) return;
    try {
      await ReadingPlanService.UnmarkChapter(plan.id, bookNumber, chapter);
      const p = await ReadingPlanService.GetProgress(plan.id);
      setProgress((p || []) as unknown as PlanProgress[]);
    } catch {}
  }, [plan]);

  const isDone = useCallback((bookNumber: number, chapter: number) => {
    return progress.some(p => p.bookNumber === bookNumber && p.chapter === chapter);
  }, [progress]);

  const getTodayReadings = useCallback((): { bookNumber: number; chapter: number }[] => {
    if (!plan || !plan.days || plan.days.length === 0) return [];
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const dayIndex = (dayOfYear - 1) % plan.days.length;
    const day = plan.days[dayIndex];
    if (!day || !day.readings) return [];
    return day.readings.map((r: any) => ({ bookNumber: r.bookNumber, chapter: r.chapter }));
  }, [plan]);

  const getCompletionPercent = useCallback(() => {
    if (!plan || !plan.days) return 0;
    const totalChapters = plan.days.reduce((sum: number, d: any) => sum + (d.readings?.length || 0), 0);
    if (totalChapters === 0) return 0;
    return Math.round((progress.length / totalChapters) * 100);
  }, [plan, progress]);

  return { plan, progress, activatePlan, markDone, unmarkDone, isDone, getTodayReadings, getCompletionPercent, reload: loadPlan };
}
