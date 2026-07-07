import { useState, useEffect, useCallback } from 'react';
import { Bookmark } from '../types/bible';
import { BookmarksService } from '../../bindings/changeme';

export function useBookmarks(translation: string) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);

  useEffect(() => { loadBookmarks(); }, []);

  const loadBookmarks = async () => {
    try {
      const result = await BookmarksService.GetBookmarks();
      setBookmarks(result || []);
    } catch {}
  };

  const addBookmark = useCallback(async (bookNumber: number, chapter: number, verse: number) => {
    try {
      const b = await BookmarksService.AddBookmark({
        id: 0, bookNumber, chapter, verse, translation, note: '', createdAt: '',
      });
      setBookmarks(prev => [b, ...prev]);
    } catch {}
  }, [translation]);

  const removeBookmark = useCallback(async (id: number) => {
    try {
      await BookmarksService.RemoveBookmark(id);
      setBookmarks(prev => prev.filter(b => b.id !== id));
    } catch {}
  }, []);

  const updateNote = useCallback(async (id: number, note: string) => {
    try {
      await BookmarksService.UpdateBookmarkNote(id, note);
      setBookmarks(prev => prev.map(b => b.id === id ? { ...b, note } : b));
    } catch {}
  }, []);

  const isBookmarked = useCallback((bookNumber: number, chapter: number, verse: number) => {
    return bookmarks.find(b => b.bookNumber === bookNumber && b.chapter === chapter && b.verse === verse);
  }, [bookmarks]);

  return { bookmarks, addBookmark, removeBookmark, updateNote, isBookmarked, reload: loadBookmarks };
}
