import { useState, useEffect, useCallback } from 'react';
import { VerseList } from '../types/bible';
import { BookmarksService } from '../../bindings/changeme';

export function useVerseLists(translation: string) {
  const [lists, setLists] = useState<VerseList[]>([]);

  const loadLists = useCallback(async () => {
    try {
      const result = await BookmarksService.GetVerseLists(translation);
      setLists(result || []);
    } catch {}
  }, [translation]);

  useEffect(() => { loadLists(); }, [loadLists]);

  const addToList = useCallback(async (listId: number, bookNumber: number, chapter: number, verse: number) => {
    try {
      await BookmarksService.AddToVerseList(listId, bookNumber, chapter, verse);
      return true;
    } catch {
      return false;
    }
  }, []);

  const createList = useCallback(async (name: string) => {
    try {
      const list = await BookmarksService.CreateVerseList(translation, name);
      setLists(prev => [list, ...prev]);
      return list;
    } catch {
      return null;
    }
  }, [translation]);

  return { lists, addToList, createList, reload: loadLists };
}
