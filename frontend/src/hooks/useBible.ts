import { useState, useEffect, useCallback } from 'react';
import { Book, Verse, TranslationInfo } from '../types/bible';
import { BibleService } from '../../bindings/changeme';

export function useBible() {
  const [translations, setTranslations] = useState<TranslationInfo[]>([]);
  const [currentTranslation, setCurrentTranslation] = useState('');
  const [books, setBooks] = useState<Book[]>([]);
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [currentChapter, setCurrentChapter] = useState(1);
  const [chapters, setChapters] = useState<number[]>([]);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTranslations();
  }, []);

  useEffect(() => {
    if (currentTranslation) {
      loadBooks();
    }
  }, [currentTranslation]);

  useEffect(() => {
    if (currentBook) {
      loadChapters();
    }
  }, [currentBook, currentTranslation]);

  useEffect(() => {
    if (currentBook && currentChapter) {
      loadVerses();
    }
  }, [currentBook, currentChapter, currentTranslation]);

  const loadTranslations = async () => {
    try {
      const result = await BibleService.GetTranslations();
      setTranslations(result);
      if (result && result.length > 0) {
        setCurrentTranslation(result[0].fileName);
      }
    } catch (err) {
      console.error('Failed to load translations:', err);
    }
  };

  const loadBooks = async () => {
    try {
      setLoading(true);
      const result = await BibleService.GetBooks(currentTranslation);
      setBooks(result);
      if (result && result.length > 0 && !currentBook) {
        setCurrentBook(result[0]);
      }
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChapters = async () => {
    if (!currentBook) return;
    try {
      const result = await BibleService.GetChapters(currentTranslation, currentBook.bookNumber);
      setChapters(result);
      if (result && result.length > 0 && !result.includes(currentChapter)) {
        setCurrentChapter(result[0]);
      }
    } catch (err) {
      console.error('Failed to load chapters:', err);
    }
  };

  const loadVerses = async () => {
    if (!currentBook) return;
    try {
      setLoading(true);
      const result = await BibleService.GetVerses(currentTranslation, currentBook.bookNumber, currentChapter);
      setVerses(result);
    } catch (err) {
      console.error('Failed to load verses:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectBook = useCallback((book: Book) => {
    setCurrentBook(book);
    setCurrentChapter(1);
  }, []);

  const selectChapter = useCallback((chapter: number) => {
    setCurrentChapter(chapter);
  }, []);

  const goToNextChapter = useCallback(() => {
    const idx = chapters.indexOf(currentChapter);
    if (idx < chapters.length - 1 && currentBook) {
      setCurrentChapter(chapters[idx + 1]);
    } else if (currentBook) {
      const bookIdx = books.findIndex(b => b.bookNumber === currentBook.bookNumber);
      if (bookIdx < books.length - 1) {
        setCurrentBook(books[bookIdx + 1]);
      }
    }
  }, [chapters, currentChapter, currentBook, books]);

  const goToPrevChapter = useCallback(() => {
    const idx = chapters.indexOf(currentChapter);
    if (idx > 0 && currentBook) {
      setCurrentChapter(chapters[idx - 1]);
    } else if (currentBook) {
      const bookIdx = books.findIndex(b => b.bookNumber === currentBook.bookNumber);
      if (bookIdx > 0) {
        const prevBook = books[bookIdx - 1];
        setCurrentBook(prevBook);
        setCurrentChapter(prevBook.chapterCount);
      }
    }
  }, [chapters, currentChapter, currentBook, books]);

  return {
    translations,
    currentTranslation,
    setCurrentTranslation,
    books,
    currentBook,
    selectBook,
    currentChapter,
    selectChapter,
    chapters,
    verses,
    loading,
    goToNextChapter,
    goToPrevChapter,
  };
}
