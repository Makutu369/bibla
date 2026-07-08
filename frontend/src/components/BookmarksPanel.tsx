import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Bookmark, StickyNote, Trash2 } from 'lucide-react';
import { useBookmarks } from '../hooks/useBookmarks';
import { BibleService } from '../../bindings/changeme';
import { Input } from './ui/Input';

interface BookmarksPanelProps {
  translation: string;
  onNavigate: (bookNumber: number, chapter: number, verse?: number) => void;
  onClose: () => void;
}

export function BookmarksPanel({ translation, onNavigate, onClose }: BookmarksPanelProps) {
  const { bookmarks, removeBookmark, updateNote } = useBookmarks(translation);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');
  const [bookNames, setBookNames] = useState<Record<number, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadNames = async () => {
      const nums = [...new Set(bookmarks.map(b => b.bookNumber))];
      const names: Record<number, string> = {};
      for (const n of nums) {
        try { names[n] = await BibleService.GetBookName(translation, n); } catch {}
      }
      setBookNames(names);
    };
    if (bookmarks.length > 0) loadNames();
  }, [bookmarks, translation]);

  useEffect(() => {
    if (editingId !== null) inputRef.current?.focus();
  }, [editingId]);

  const saveNote = useCallback(async (id: number) => {
    await updateNote(id, noteText);
    setEditingId(null);
  }, [noteText, updateNote]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-fg-muted" />
          <span className="text-base font-bold text-fg">Bookmarks</span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {bookmarks.length === 0 ? (
          <div className="text-center py-12 text-sm text-fg-muted">
            <Bookmark className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No bookmarks yet</p>
            <p className="text-xs mt-1">Tap a verse and use the bookmark icon</p>
          </div>
        ) : (
          bookmarks.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="px-3 py-2.5 rounded-full hover:bg-surface-hover transition-colors group"
            >
              <button
                onClick={() => onNavigate(b.bookNumber, b.chapter, b.verse)}
                className="w-full text-left"
              >
                <span className="text-xs font-medium text-fg-muted">
                  {bookNames[b.bookNumber] || 'Unknown'} {b.chapter}:{b.verse}
                </span>
              </button>

              {editingId === b.id ? (
                <div className="mt-1.5 flex gap-1">
                  <Input ref={inputRef} value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveNote(b.id); if (e.key === 'Escape') setEditingId(null); }}
                    className="flex-1"
                    placeholder="Add a note…" />
                  <button onClick={() => saveNote(b.id)}
                    className="px-2 h-7 text-[10px] font-medium bg-surface-active text-fg rounded-lg">Save</button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1">
                  {b.note && <span className="text-xs text-fg-muted italic truncate flex-1">{b.note}</span>}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(b.id); setNoteText(b.note); }}
                      className="w-6 h-6 flex items-center justify-center rounded text-fg-muted hover:text-fg hover:bg-surface-active transition-colors"
                      title="Edit note">
                      <StickyNote className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeBookmark(b.id); }}
                      className="w-6 h-6 flex items-center justify-center rounded text-fg-muted hover:text-red-400 hover:bg-surface-active transition-colors"
                      title="Remove bookmark">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
