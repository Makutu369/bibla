package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	_ "modernc.org/sqlite"
)

type BibleService struct {
	biblesDir string
}

func NewBibleService(biblesDir string) *BibleService {
	return &BibleService{biblesDir: biblesDir}
}

func (b *BibleService) openDB(translation string) (*sql.DB, error) {
	dbPath := filepath.Join(b.biblesDir, translation)
	db, err := sql.Open("sqlite", dbPath+"?mode=ro")
	if err != nil {
		return nil, err
	}
	return db, nil
}

func (b *BibleService) defaultTranslation() string {
	entries, err := os.ReadDir(b.biblesDir)
	if err != nil || len(entries) == 0 {
		return ""
	}
	for _, e := range entries {
		if strings.HasSuffix(e.Name(), ".SQLite3") || strings.HasSuffix(e.Name(), ".sqlite3") {
			return e.Name()
		}
	}
	return ""
}

func (b *BibleService) GetTranslations() []TranslationInfo {
	entries, err := os.ReadDir(b.biblesDir)
	if err != nil {
		return nil
	}
	var translations []TranslationInfo
	for _, e := range entries {
		if !e.IsDir() && (strings.HasSuffix(e.Name(), ".SQLite3") || strings.HasSuffix(e.Name(), ".sqlite3")) {
			db, err := b.openDB(e.Name())
			if err != nil {
				continue
			}
			var desc string
			db.QueryRow("SELECT value FROM info WHERE name='description'").Scan(&desc)
			db.Close()
			if desc == "" {
				desc = e.Name()
			}
			translations = append(translations, TranslationInfo{
				Name:        e.Name(),
				DisplayName: desc,
				FileName:    e.Name(),
			})
		}
	}
	return translations
}

func (b *BibleService) GetBooks(translation string) []Book {
	if translation == "" {
		translation = b.defaultTranslation()
	}
	db, err := b.openDB(translation)
	if err != nil {
		return nil
	}
	defer db.Close()

	rows, err := db.Query(`
		SELECT b.book_number, b.short_name, b.long_name, b.book_color,
			(SELECT COUNT(DISTINCT chapter) FROM verses v WHERE v.book_number = b.book_number) as chapter_count
		FROM books b
		ORDER BY b.book_number
	`)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var books []Book
	for rows.Next() {
		var book Book
		rows.Scan(&book.BookNumber, &book.ShortName, &book.LongName, &book.Color, &book.ChapterCount)
		books = append(books, book)
	}
	return books
}

func (b *BibleService) GetChapters(translation string, bookNumber int) []int {
	if translation == "" {
		translation = b.defaultTranslation()
	}
	db, err := b.openDB(translation)
	if err != nil {
		return nil
	}
	defer db.Close()

	rows, err := db.Query("SELECT DISTINCT chapter FROM verses WHERE book_number = ? ORDER BY chapter", bookNumber)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var chapters []int
	for rows.Next() {
		var ch int
		rows.Scan(&ch)
		chapters = append(chapters, ch)
	}
	return chapters
}

func (b *BibleService) GetVerses(translation string, bookNumber int, chapter int) []Verse {
	if translation == "" {
		translation = b.defaultTranslation()
	}
	db, err := b.openDB(translation)
	if err != nil {
		return nil
	}
	defer db.Close()

	rows, err := db.Query(
		"SELECT book_number, chapter, verse, text FROM verses WHERE book_number = ? AND chapter = ? ORDER BY verse",
		bookNumber, chapter,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var verses []Verse
	for rows.Next() {
		var v Verse
		rows.Scan(&v.BookNumber, &v.Chapter, &v.Verse, &v.Text)
		verses = append(verses, v)
	}
	return verses
}

func (b *BibleService) Search(translation string, query string) []SearchResult {
	if translation == "" {
		translation = b.defaultTranslation()
	}
	if query == "" {
		return nil
	}
	db, err := b.openDB(translation)
	if err != nil {
		return nil
	}
	defer db.Close()

	searchQuery := "%" + strings.ReplaceAll(query, "'", "''") + "%"
	rows, err := db.Query(`
		SELECT v.book_number, v.chapter, v.verse, v.text, b.long_name
		FROM verses v
		JOIN books b ON b.book_number = v.book_number
		WHERE v.text LIKE ?
		ORDER BY v.book_number, v.chapter, v.verse
		LIMIT 100
	`, searchQuery)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var results []SearchResult
	for rows.Next() {
		var r SearchResult
		rows.Scan(&r.BookNumber, &r.Chapter, &r.Verse, &r.Text, &r.BookName)
		results = append(results, r)
	}
	return results
}

func (b *BibleService) GetInfo(translation string) map[string]string {
	if translation == "" {
		translation = b.defaultTranslation()
	}
	db, err := b.openDB(translation)
	if err != nil {
		return nil
	}
	defer db.Close()

	rows, err := db.Query("SELECT name, value FROM info")
	if err != nil {
		return nil
	}
	defer rows.Close()

	info := make(map[string]string)
	for rows.Next() {
		var name, value string
		rows.Scan(&name, &value)
		info[name] = value
	}
	return info
}

func (b *BibleService) GetBookName(translation string, bookNumber int) string {
	if translation == "" {
		translation = b.defaultTranslation()
	}
	db, err := b.openDB(translation)
	if err != nil {
		return fmt.Sprintf("Book %d", bookNumber)
	}
	defer db.Close()

	var name string
	db.QueryRow("SELECT long_name FROM books WHERE book_number = ?", bookNumber).Scan(&name)
	if name == "" {
		return fmt.Sprintf("Book %d", bookNumber)
	}
	return name
}
