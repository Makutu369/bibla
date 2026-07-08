export interface Book {
  bookNumber: number;
  shortName: string;
  longName: string;
  color: string;
  chapterCount: number;
}

export interface Verse {
  bookNumber: number;
  chapter: number;
  verse: number;
  text: string;
}

export interface SearchResult {
  bookNumber: number;
  chapter: number;
  verse: number;
  text: string;
  bookName: string;
}

export interface TranslationInfo {
  name: string;
  displayName: string;
  fileName: string;
}

export interface Bookmark {
  id: number;
  bookNumber: number;
  chapter: number;
  verse: number;
  translation: string;
  note: string;
  createdAt: string;
}

export interface Highlight {
  id: number;
  bookNumber: number;
  chapter: number;
  verse: number;
  color: string;
  translation: string;
  createdAt: string;
}

export interface Note {
  id: number;
  bookNumber: number;
  chapter: number;
  verse: number;
  content: string;
  translation: string;
  createdAt: string;
}

export const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: 'yellow', hex: '#facc15' },
  { name: 'Green', value: 'green', hex: '#22c55e' },
  { name: 'Orange', value: 'orange', hex: '#f97316' },
  { name: 'Pink', value: 'pink', hex: '#ec4899' },
];

export const OT_BOOKS = Array.from({ length: 46 }, (_, i) => (i + 1) * 10);
export const NT_BOOKS = Array.from({ length: 27 }, (_, i) => (i + 47) * 10);
