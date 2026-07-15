import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ListPlus, X, Plus, Trash2, ChevronLeft, BookmarkPlus } from 'lucide-react';
import { BookmarksService, BibleService } from '../../bindings/changeme';
import { Input } from './ui/Input';

interface VerseList {
  id: number;
  name: string;
  createdAt: string;
}

interface VerseListItem {
  id: number;
  listId: number;
  bookNumber: number;
  chapter: number;
  verse: number;
  sortOrder: number;
  createdAt: string;
}

interface VerseListsPanelProps {
  translation: string;
  onNavigate: (bookNumber: number, chapter: number, verse?: number) => void;
  onClose: () => void;
}

export function VerseListsPanel({ translation, onNavigate, onClose }: VerseListsPanelProps) {
  const [lists, setLists] = useState<VerseList[]>([]);
  const [selectedList, setSelectedList] = useState<VerseList | null>(null);
  const [listItems, setListItems] = useState<VerseListItem[]>([]);
  const [newName, setNewName] = useState('');
  const [bookNames, setBookNames] = useState<Record<number, string>>({});
  const [verseTexts, setVerseTexts] = useState<Record<string, string>>({});
  const [listCounts, setListCounts] = useState<Record<number, number>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  const loadLists = useCallback(async () => {
    try {
      const result = await BookmarksService.GetVerseLists(translation);
      setLists(result || []);
    } catch {}
  }, [translation]);

  useEffect(() => { loadLists(); }, [loadLists]);

  // Load item counts for all lists
  useEffect(() => {
    const loadCounts = async () => {
      const counts: Record<number, number> = {};
      await Promise.all(lists.map(async (list) => {
        try {
          const items = await BookmarksService.GetVerseListItems(translation, list.id);
          counts[list.id] = items?.length || 0;
        } catch { counts[list.id] = 0; }
      }));
      setListCounts(counts);
    };
    if (lists.length > 0) loadCounts();
  }, [lists, translation]);

  useEffect(() => {
    if (!selectedList) { setListItems([]); return; }
    const load = async () => {
      try {
        const items = await BookmarksService.GetVerseListItems(translation, selectedList.id);
        setListItems(items || []);
      } catch {}
    };
    load();
  }, [selectedList, translation]);

  useEffect(() => {
    const loadNames = async () => {
      const nums = [...new Set(listItems.map(i => i.bookNumber))];
      const names: Record<number, string> = {};
      for (const n of nums) {
        try { names[n] = await BibleService.GetBookName(translation, n); } catch {}
      }
      setBookNames(names);
    };
    if (listItems.length > 0) loadNames();
  }, [listItems, translation]);

  useEffect(() => {
    const loadTexts = async () => {
      const texts: Record<string, string> = {};
      await Promise.all(listItems.map(async (item) => {
        try {
          const v = await BibleService.GetVerse(translation, item.bookNumber, item.chapter, item.verse);
          if (v) {
            texts[`${item.bookNumber}-${item.chapter}-${item.verse}`] =
              v.text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
          }
        } catch {}
      }));
      setVerseTexts(texts);
    };
    if (listItems.length > 0) loadTexts();
  }, [listItems, translation]);

  const handleCreate = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      await BookmarksService.CreateVerseList(translation, newName.trim());
      setNewName('');
      loadLists();
    } catch {}
  }, [newName, loadLists, translation]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await BookmarksService.DeleteVerseList(id);
      if (selectedList?.id === id) setSelectedList(null);
      loadLists();
    } catch {}
  }, [selectedList, loadLists]);

  const handleRemoveItem = useCallback(async (itemId: number) => {
    if (!selectedList) return;
    try {
      await BookmarksService.RemoveFromVerseList(selectedList.id, itemId);
      setListItems(prev => prev.filter(i => i.id !== itemId));
    } catch {}
  }, [selectedList]);

  // List detail view
  if (selectedList) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-1 px-4 pt-5 pb-3">
          <button onClick={() => setSelectedList(null)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-base font-bold text-fg truncate">{selectedList.name}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {listItems.length === 0 ? (
            <div className="text-center py-16 text-sm text-fg-muted">
              <BookmarkPlus className="w-7 h-7 mx-auto mb-3 opacity-20" />
              <p>No verses yet</p>
              <p className="text-xs mt-1 opacity-60">Use the list icon in the verse toolbar</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {listItems.map((item, i) => {
                const key = `${item.bookNumber}-${item.chapter}-${item.verse}`;
                const text = verseTexts[key] || '';
                const bookName = bookNames[item.bookNumber] || '…';

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="group"
                  >
                    <button
                      onClick={() => onNavigate(item.bookNumber, item.chapter, item.verse)}
                      className="w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-surface-hover transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-fg tracking-tight">
                          {bookName}
                        </span>
                        <span className="text-[11px] text-fg-muted tabular-nums">
                          {item.chapter}:{item.verse}
                        </span>
                        <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                          <span
                            onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}
                            className="inline-flex w-4 h-4 items-center justify-center rounded text-fg-muted hover:text-red-400 cursor-pointer"
                            title="Remove">
                            <Trash2 className="w-3 h-3" />
                          </span>
                        </span>
                      </div>
                      {text && (
                        <p className="text-[11px] text-fg-secondary/70 leading-relaxed line-clamp-2 ml-0 mt-0.5">
                          {text.length > 120 ? text.slice(0, 120) + '…' : text}
                        </p>
                      )}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Lists overview
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <ListPlus className="w-4 h-4 text-fg-muted" />
          <span className="text-base font-bold text-fg">Verse Lists</span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4 pb-4">
        <div className="flex gap-1.5">
          <Input
            ref={inputRef}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="New list…"
            className="flex-1"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="px-3 h-8 flex items-center justify-center gap-1 text-xs font-medium bg-surface-active text-fg rounded-lg hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors">
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {lists.length === 0 ? (
          <div className="text-center py-16 text-sm text-fg-muted">
            <ListPlus className="w-7 h-7 mx-auto mb-3 opacity-20" />
            <p>No lists yet</p>
            <p className="text-xs mt-1 opacity-60">Create one above to save verses</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {lists.map((list, i) => {
              const count = listCounts[list.id] ?? '–';
              return (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="group"
                >
                  <button
                    onClick={() => setSelectedList(list)}
                    className="w-full text-left py-2.5 px-2 -mx-2 rounded-lg hover:bg-surface-hover transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-fg">
                        {list.name}
                      </span>
                      <span className="text-[11px] text-fg-muted tabular-nums">
                        {count}
                      </span>
                      <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <span
                          onClick={(e) => { e.stopPropagation(); handleDelete(list.id); }}
                          className="inline-flex w-4 h-4 items-center justify-center rounded text-fg-muted hover:text-red-400 cursor-pointer"
                          title="Delete list">
                          <Trash2 className="w-3 h-3" />
                        </span>
                      </span>
                    </div>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
