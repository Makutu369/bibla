package main

import (
	"database/sql"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

type BookmarksService struct {
	dbPath string
}

func NewBookmarksService(dataDir string) (*BookmarksService, error) {
	os.MkdirAll(dataDir, 0755)
	dbPath := filepath.Join(dataDir, "bookmarks.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	db.Exec(`
		CREATE TABLE IF NOT EXISTS bookmarks (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			book_number INTEGER NOT NULL,
			chapter INTEGER NOT NULL,
			verse INTEGER NOT NULL,
			translation TEXT NOT NULL DEFAULT '',
			note TEXT DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	db.Exec(`
		CREATE TABLE IF NOT EXISTS highlights (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			book_number INTEGER NOT NULL,
			chapter INTEGER NOT NULL,
			verse INTEGER NOT NULL,
			color TEXT NOT NULL DEFAULT 'yellow',
			translation TEXT NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	db.Exec(`
		CREATE TABLE IF NOT EXISTS notes (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			book_number INTEGER NOT NULL,
			chapter INTEGER NOT NULL,
			verse INTEGER NOT NULL,
			content TEXT NOT NULL DEFAULT '',
			translation TEXT NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	db.Exec(`
		CREATE TABLE IF NOT EXISTS verse_lists (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			name TEXT NOT NULL,
			translation TEXT NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)
	db.Exec(`
		CREATE TABLE IF NOT EXISTS verse_list_items (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			list_id INTEGER NOT NULL,
			book_number INTEGER NOT NULL,
			chapter INTEGER NOT NULL,
			verse INTEGER NOT NULL,
			sort_order INTEGER NOT NULL DEFAULT 0,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (list_id) REFERENCES verse_lists(id) ON DELETE CASCADE
		)
	`)

	return &BookmarksService{dbPath: dbPath}, nil
}

func (s *BookmarksService) openDB() (*sql.DB, error) {
	return sql.Open("sqlite", s.dbPath)
}

func (s *BookmarksService) AddBookmark(bookmark Bookmark) (Bookmark, error) {
	db, err := s.openDB()
	if err != nil {
		return Bookmark{}, err
	}
	defer db.Close()

	now := time.Now().Format(time.RFC3339)
	result, err := db.Exec(
		"INSERT INTO bookmarks (book_number, chapter, verse, translation, note, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		bookmark.BookNumber, bookmark.Chapter, bookmark.Verse, bookmark.Translation, bookmark.Note, now,
	)
	if err != nil {
		return Bookmark{}, err
	}
	id, _ := result.LastInsertId()
	bookmark.ID = int(id)
	bookmark.CreatedAt = now
	return bookmark, nil
}

func (s *BookmarksService) RemoveBookmark(id int) error {
	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()
	_, err = db.Exec("DELETE FROM bookmarks WHERE id = ?", id)
	return err
}

func (s *BookmarksService) UpdateBookmarkNote(id int, note string) error {
	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()
	_, err = db.Exec("UPDATE bookmarks SET note = ? WHERE id = ?", note, id)
	return err
}



func (s *BookmarksService) GetBookmarks() []Bookmark {
	db, err := s.openDB()
	if err != nil {
		return nil
	}
	defer db.Close()

	rows, err := db.Query("SELECT id, book_number, chapter, verse, translation, note, created_at FROM bookmarks ORDER BY created_at DESC")
	if err != nil {
		return nil
	}
	defer rows.Close()

	var bookmarks []Bookmark
	for rows.Next() {
		var b Bookmark
		rows.Scan(&b.ID, &b.BookNumber, &b.Chapter, &b.Verse, &b.Translation, &b.Note, &b.CreatedAt)
		bookmarks = append(bookmarks, b)
	}
	return bookmarks
}

func (s *BookmarksService) AddHighlight(highlight Highlight) (Highlight, error) {
	db, err := s.openDB()
	if err != nil {
		return Highlight{}, err
	}
	defer db.Close()

	now := time.Now().Format(time.RFC3339)
	result, err := db.Exec(
		"INSERT INTO highlights (book_number, chapter, verse, color, translation, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		highlight.BookNumber, highlight.Chapter, highlight.Verse, highlight.Color, highlight.Translation, now,
	)
	if err != nil {
		return Highlight{}, err
	}
	id, _ := result.LastInsertId()
	highlight.ID = int(id)
	highlight.CreatedAt = now
	return highlight, nil
}

func (s *BookmarksService) RemoveHighlight(id int) error {
	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()
	_, err = db.Exec("DELETE FROM highlights WHERE id = ?", id)
	return err
}

func (s *BookmarksService) GetHighlights() []Highlight {
	db, err := s.openDB()
	if err != nil {
		return nil
	}
	defer db.Close()

	rows, err := db.Query("SELECT id, book_number, chapter, verse, color, translation, created_at FROM highlights ORDER BY created_at DESC")
	if err != nil {
		return nil
	}
	defer rows.Close()

	var highlights []Highlight
	for rows.Next() {
		var h Highlight
		rows.Scan(&h.ID, &h.BookNumber, &h.Chapter, &h.Verse, &h.Color, &h.Translation, &h.CreatedAt)
		highlights = append(highlights, h)
	}
	return highlights
}

func (s *BookmarksService) AddNote(note Note) (Note, error) {
	db, err := s.openDB()
	if err != nil {
		return Note{}, err
	}
	defer db.Close()

	now := time.Now().Format(time.RFC3339)
	result, err := db.Exec(
		"INSERT INTO notes (book_number, chapter, verse, content, translation, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		note.BookNumber, note.Chapter, note.Verse, note.Content, note.Translation, now,
	)
	if err != nil {
		return Note{}, err
	}
	id, _ := result.LastInsertId()
	note.ID = int(id)
	note.CreatedAt = now
	return note, nil
}

func (s *BookmarksService) RemoveNote(id int) error {
	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()
	_, err = db.Exec("DELETE FROM notes WHERE id = ?", id)
	return err
}

func (s *BookmarksService) UpdateNoteContent(id int, content string) error {
	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()
	_, err = db.Exec("UPDATE notes SET content = ? WHERE id = ?", content, id)
	return err
}

func (s *BookmarksService) GetNotes() []Note {
	db, err := s.openDB()
	if err != nil {
		return nil
	}
	defer db.Close()

	rows, err := db.Query("SELECT id, book_number, chapter, verse, content, translation, created_at FROM notes ORDER BY created_at DESC")
	if err != nil {
		return nil
	}
	defer rows.Close()

	var notes []Note
	for rows.Next() {
		var n Note
		rows.Scan(&n.ID, &n.BookNumber, &n.Chapter, &n.Verse, &n.Content, &n.Translation, &n.CreatedAt)
		notes = append(notes, n)
	}
	return notes
}

func (s *BookmarksService) GetNoteForVerse(bookNumber, chapter, verse int) *Note {
	db, err := s.openDB()
	if err != nil {
		return nil
	}
	defer db.Close()

	var n Note
	err = db.QueryRow(
		"SELECT id, book_number, chapter, verse, content, translation, created_at FROM notes WHERE book_number = ? AND chapter = ? AND verse = ? LIMIT 1",
		bookNumber, chapter, verse,
	).Scan(&n.ID, &n.BookNumber, &n.Chapter, &n.Verse, &n.Content, &n.Translation, &n.CreatedAt)
	if err != nil {
		return nil
	}
	return &n
}

func (s *BookmarksService) CreateVerseList(translation, name string) (VerseList, error) {
	db, err := s.openDB()
	if err != nil {
		return VerseList{}, err
	}
	defer db.Close()

	now := time.Now().Format(time.RFC3339)
	result, err := db.Exec(
		"INSERT INTO verse_lists (name, translation, created_at) VALUES (?, ?, ?)",
		name, translation, now,
	)
	if err != nil {
		return VerseList{}, err
	}
	id, _ := result.LastInsertId()
	return VerseList{ID: int(id), Name: name, Translation: translation, CreatedAt: now}, nil
}

func (s *BookmarksService) DeleteVerseList(id int) error {
	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()
	db.Exec("DELETE FROM verse_list_items WHERE list_id = ?", id)
	_, err = db.Exec("DELETE FROM verse_lists WHERE id = ?", id)
	return err
}

func (s *BookmarksService) GetVerseLists(translation string) []VerseList {
	db, err := s.openDB()
	if err != nil {
		return nil
	}
	defer db.Close()

	rows, err := db.Query("SELECT id, name, translation, created_at FROM verse_lists WHERE translation = ? ORDER BY created_at DESC", translation)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var lists []VerseList
	for rows.Next() {
		var l VerseList
		rows.Scan(&l.ID, &l.Name, &l.Translation, &l.CreatedAt)
		lists = append(lists, l)
	}
	return lists
}

func (s *BookmarksService) AddToVerseList(listID, bookNumber, chapter, verse int) (VerseListItem, error) {
	db, err := s.openDB()
	if err != nil {
		return VerseListItem{}, err
	}
	defer db.Close()

	var maxOrder int
	db.QueryRow("SELECT COALESCE(MAX(sort_order), 0) FROM verse_list_items WHERE list_id = ?", listID).Scan(&maxOrder)

	now := time.Now().Format(time.RFC3339)
	result, err := db.Exec(
		"INSERT INTO verse_list_items (list_id, book_number, chapter, verse, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)",
		listID, bookNumber, chapter, verse, maxOrder+1, now,
	)
	if err != nil {
		return VerseListItem{}, err
	}
	id, _ := result.LastInsertId()
	return VerseListItem{ID: int(id), ListID: listID, BookNumber: bookNumber, Chapter: chapter, Verse: verse, SortOrder: maxOrder + 1, CreatedAt: now}, nil
}

func (s *BookmarksService) RemoveFromVerseList(listID, itemID int) error {
	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()
	_, err = db.Exec("DELETE FROM verse_list_items WHERE id = ? AND list_id = ?", itemID, listID)
	return err
}

func (s *BookmarksService) GetVerseListItems(translation string, listID int) []VerseListItem {
	db, err := s.openDB()
	if err != nil {
		return nil
	}
	defer db.Close()

	rows, err := db.Query(
		"SELECT id, list_id, book_number, chapter, verse, sort_order, created_at FROM verse_list_items WHERE list_id = ? ORDER BY sort_order",
		listID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var items []VerseListItem
	for rows.Next() {
		var item VerseListItem
		rows.Scan(&item.ID, &item.ListID, &item.BookNumber, &item.Chapter, &item.Verse, &item.SortOrder, &item.CreatedAt)
		items = append(items, item)
	}
	return items
}
