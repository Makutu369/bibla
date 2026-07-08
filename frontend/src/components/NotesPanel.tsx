import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, StickyNote, Trash2, Pencil } from 'lucide-react';
import { useNotes } from '../hooks/useNotes';
import { BibleService } from '../../bindings/changeme';

interface NotesPanelProps {
  translation: string;
  onNavigate: (bookNumber: number, chapter: number, verse?: number) => void;
  onClose: () => void;
}

export function NotesPanel({ translation, onNavigate, onClose }: NotesPanelProps) {
  const { notes, removeNote, updateNoteContent } = useNotes(translation);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [contentText, setContentText] = useState('');
  const [bookNames, setBookNames] = useState<Record<number, string>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadNames = async () => {
      const nums = [...new Set(notes.map(n => n.bookNumber))];
      const names: Record<number, string> = {};
      for (const n of nums) {
        try { names[n] = await BibleService.GetBookName(translation, n); } catch {}
      }
      setBookNames(names);
    };
    if (notes.length > 0) loadNames();
  }, [notes, translation]);

  useEffect(() => {
    if (editingId !== null) textareaRef.current?.focus();
  }, [editingId]);

  const saveContent = useCallback(async (id: number) => {
    await updateNoteContent(id, contentText);
    setEditingId(null);
  }, [contentText, updateNoteContent]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-fg-muted" />
          <span className="text-base font-bold text-fg">Notes</span>
          <span className="text-xs text-fg-muted">({notes.length})</span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {notes.length === 0 ? (
          <div className="text-center py-12 text-sm text-fg-muted">
            <StickyNote className="w-8 h-8 mx-auto mb-3 opacity-30" />
            <p>No notes yet</p>
            <p className="text-xs mt-1">Tap a verse and use the note icon</p>
          </div>
        ) : (
          notes.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="px-3 py-2.5 rounded-xl hover:bg-surface-hover transition-colors group"
            >
              <button
                onClick={() => onNavigate(n.bookNumber, n.chapter, n.verse)}
                className="w-full text-left"
              >
                <span className="text-xs font-medium text-fg-muted">
                  {bookNames[n.bookNumber] || 'Unknown'} {n.chapter}:{n.verse}
                </span>
              </button>

              {editingId === n.id ? (
                <div className="mt-1.5 flex flex-col gap-1.5">
                  <textarea ref={textareaRef} value={contentText}
                    onChange={e => setContentText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') setEditingId(null); }}
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm bg-transparent border border-border rounded-full text-fg placeholder:text-fg-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none transition-all duration-200"
                    placeholder="Write your note…" />
                  <div className="flex gap-1">
                    <button onClick={() => saveContent(n.id)}
                      className="px-2 h-6 text-[10px] font-medium bg-surface-active text-fg rounded-lg">Save</button>
                    <button onClick={() => setEditingId(null)}
                      className="px-2 h-6 text-[10px] font-medium text-fg-muted hover:text-fg rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="mt-1">
                  {n.content && (
                    <p className="text-xs text-fg-secondary leading-relaxed line-clamp-3">{n.content}</p>
                  )}
                  <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity mt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingId(n.id); setContentText(n.content); }}
                      className="w-6 h-6 flex items-center justify-center rounded text-fg-muted hover:text-fg hover:bg-surface-active transition-colors"
                      title="Edit note">
                      <Pencil className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeNote(n.id); }}
                      className="w-6 h-6 flex items-center justify-center rounded text-fg-muted hover:text-red-400 hover:bg-surface-active transition-colors"
                      title="Delete note">
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
