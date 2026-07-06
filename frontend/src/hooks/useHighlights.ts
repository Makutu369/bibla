import { useState, useEffect, useCallback } from 'react';
import { Highlight } from '../types/bible';
import { BookmarksService } from '../../bindings/changeme';

export function useHighlights(translation: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  useEffect(() => { loadHighlights(); }, [translation]);

  const loadHighlights = async () => {
    try {
      const result = await BookmarksService.GetHighlights();
      setHighlights(result || []);
    } catch {}
  };

  const addHighlight = useCallback(async (bookNumber: number, chapter: number, verse: number, color: string) => {
    try {
      const h = await BookmarksService.AddHighlight({
        id: 0, bookNumber, chapter, verse, color, translation, createdAt: '',
      });
      setHighlights(prev => [h, ...prev]);
    } catch {}
  }, [translation]);

  const removeHighlight = useCallback(async (id: number) => {
    try {
      await BookmarksService.RemoveHighlight(id);
      setHighlights(prev => prev.filter(h => h.id !== id));
    } catch {}
  }, []);

  const toggleHighlight = useCallback(async (bookNumber: number, chapter: number, verse: number, color: string) => {
    const existing = highlights.find(h => h.bookNumber === bookNumber && h.chapter === chapter && h.verse === verse);
    if (existing) {
      if (existing.color === color) {
        await removeHighlight(existing.id);
      } else {
        await removeHighlight(existing.id);
        await addHighlight(bookNumber, chapter, verse, color);
      }
    } else {
      await addHighlight(bookNumber, chapter, verse, color);
    }
  }, [highlights, addHighlight, removeHighlight]);

  const getHighlight = useCallback((bookNumber: number, chapter: number, verse: number) => {
    return highlights.find(h => h.bookNumber === bookNumber && h.chapter === chapter && h.verse === verse);
  }, [highlights]);

  return { highlights, addHighlight, removeHighlight, toggleHighlight, getHighlight };
}
