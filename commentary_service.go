package main

import (
	"database/sql"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"

	_ "modernc.org/sqlite"
)

type CommentaryEntry struct {
	BookNumber  int    `json:"bookNumber"`
	ChapterFrom int    `json:"chapterFrom"`
	VerseFrom   int    `json:"verseFrom"`
	ChapterTo   int    `json:"chapterTo"`
	VerseTo     int    `json:"verseTo"`
	Marker      string `json:"marker"`
	Text        string `json:"text"`
	Source      string `json:"source"`
}

type CommentaryInfo struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	FileName    string `json:"fileName"`
}

type CommentaryService struct {
	mu      sync.RWMutex
	loaded  bool
	biblesDir string
	// translation filename -> db path
	dbPaths map[string]string
	// translation -> verse key -> []CommentaryEntry
	index map[string]map[string][]CommentaryEntry
	// translation -> list of commentaries (always the same for now, one per translation)
	infos map[string][]CommentaryInfo
}

func NewCommentaryService(biblesDir string) *CommentaryService {
	commentaryDir := filepath.Join(biblesDir, "commentaries")
	entries, err := os.ReadDir(commentaryDir)
	if err != nil {
		return &CommentaryService{dbPaths: make(map[string]string), biblesDir: biblesDir}
	}

	dbPaths := make(map[string]string)
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".SQLite3") {
			dbPaths[e.Name()] = filepath.Join(commentaryDir, e.Name())
		}
	}

	return &CommentaryService{dbPaths: dbPaths, biblesDir: biblesDir}
}

func (s *CommentaryService) ensureLoaded() {
	s.mu.RLock()
	if s.loaded {
		s.mu.RUnlock()
		return
	}
	s.mu.RUnlock()

	s.mu.Lock()
	defer s.mu.Unlock()

	if s.loaded {
		return
	}

	s.index = make(map[string]map[string][]CommentaryEntry)
	s.infos = make(map[string][]CommentaryInfo)

	for name, dbPath := range s.dbPaths {
		db, err := sql.Open("sqlite", dbPath+"?mode=ro")
		if err != nil {
			continue
		}

		var displayName string
		db.QueryRow("SELECT value FROM info WHERE name='description'").Scan(&displayName)
		if displayName == "" {
			displayName = name
		}

		info := CommentaryInfo{
			Name:        name,
			DisplayName: displayName,
			FileName:    name,
		}

		verseIndex := make(map[string][]CommentaryEntry)

		rows, err := db.Query("SELECT book_number, chapter_number_from, verse_number_from, chapter_number_to, verse_number_to, marker, text FROM commentaries")
		if err != nil {
			db.Close()
			continue
		}

		for rows.Next() {
			var c CommentaryEntry
			var chTo, vTo sql.NullInt64
			rows.Scan(&c.BookNumber, &c.ChapterFrom, &c.VerseFrom, &chTo, &vTo, &c.Marker, &c.Text)
			if chTo.Valid {
				c.ChapterTo = int(chTo.Int64)
			}
			if vTo.Valid {
				c.VerseTo = int(vTo.Int64)
			}
			c.Source = displayName

			key := verseKeyFromInts(c.BookNumber, c.ChapterFrom, c.VerseFrom)
			verseIndex[key] = append(verseIndex[key], c)
		}
		rows.Close()
		db.Close()

		// The commentary filename like "ESV.commentaries.SQLite3" corresponds to "ESV.SQLite3"
		translationName := strings.Split(name, ".")[0]
		s.index[translationName] = verseIndex
		s.infos[translationName] = []CommentaryInfo{info}
	}

	s.loaded = true
}

func verseKeyFromInts(book, chapter, verse int) string {
	return strings.Join([]string{
		strings.Repeat("0", 4-len(strconv.Itoa(book))) + strconv.Itoa(book),
		strings.Repeat("0", 3-len(strconv.Itoa(chapter))) + strconv.Itoa(chapter),
		strings.Repeat("0", 3-len(strconv.Itoa(verse))) + strconv.Itoa(verse),
	}, "_")
}

func (s *CommentaryService) GetAvailableCommentaries(translation string) []CommentaryInfo {
	s.ensureLoaded()
	s.mu.RLock()
	defer s.mu.RUnlock()

	// Strip .SQLite3 suffix if present
	translation = strings.TrimSuffix(translation, ".SQLite3")
	translation = strings.TrimSuffix(translation, ".sqlite3")

	return s.infos[translation]
}

func (s *CommentaryService) GetCommentaryForVerse(translation string, bookNumber, chapter, verse int) []CommentaryEntry {
	s.ensureLoaded()
	s.mu.RLock()
	defer s.mu.RUnlock()

	translation = strings.TrimSuffix(translation, ".SQLite3")
	translation = strings.TrimSuffix(translation, ".sqlite3")

	verseIndex, ok := s.index[translation]
	if !ok {
		return nil
	}

	key := verseKeyFromInts(bookNumber, chapter, verse)
	return verseIndex[key]
}

func (s *CommentaryService) GetCommentaryForChapter(translation string, bookNumber, chapter int) []CommentaryEntry {
	s.ensureLoaded()
	s.mu.RLock()
	defer s.mu.RUnlock()

	translation = strings.TrimSuffix(translation, ".SQLite3")
	translation = strings.TrimSuffix(translation, ".sqlite3")

	verseIndex, ok := s.index[translation]
	if !ok {
		return nil
	}

	var results []CommentaryEntry
	for _, entries := range verseIndex {
		for _, e := range entries {
			if e.BookNumber == bookNumber && e.ChapterFrom == chapter {
				results = append(results, e)
			}
		}
	}

	sort.Slice(results, func(i, j int) bool {
		if results[i].VerseFrom != results[j].VerseFrom {
			return results[i].VerseFrom < results[j].VerseFrom
		}
		return results[i].Marker < results[j].Marker
	})

	return results
}

func (s *CommentaryService) Preload() {
	s.ensureLoaded()
}
