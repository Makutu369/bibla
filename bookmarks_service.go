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
