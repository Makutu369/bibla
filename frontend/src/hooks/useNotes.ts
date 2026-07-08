import { useState, useEffect, useCallback } from 'react';
import { Note } from '../types/bible';
import { BookmarksService } from '../../bindings/changeme';

export function useNotes(translation: string) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => { loadNotes(); }, []);

  const loadNotes = async () => {
    try {
      const result = await BookmarksService.GetNotes();
      setNotes(result || []);
    } catch {}
  };

  const addNote = useCallback(async (bookNumber: number, chapter: number, verse: number, content: string = '') => {
    try {
      const n = await BookmarksService.AddNote({
        id: 0, bookNumber, chapter, verse, content, translation, createdAt: '',
      });
      setNotes(prev => [n, ...prev]);
      return n;
    } catch {}
  }, [translation]);

  const removeNote = useCallback(async (id: number) => {
    try {
      await BookmarksService.RemoveNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
    } catch {}
  }, []);

  const updateNoteContent = useCallback(async (id: number, content: string) => {
    try {
      await BookmarksService.UpdateNoteContent(id, content);
      setNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n));
    } catch {}
  }, []);

  const getNoteForVerse = useCallback((bookNumber: number, chapter: number, verse: number) => {
    return notes.find(n => n.bookNumber === bookNumber && n.chapter === chapter && n.verse === verse);
  }, [notes]);

  return { notes, addNote, removeNote, updateNoteContent, getNoteForVerse, reload: loadNotes };
}
