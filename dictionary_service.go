package main

import (
	"database/sql"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	_ "modernc.org/sqlite"
)

type DictionaryEntry struct {
	Topic          string `json:"topic"`
	ShortDef       string `json:"shortDef"`
	Lexeme         string `json:"lexeme"`
	Transliteration string `json:"transliteration"`
	Pronunciation  string `json:"pronunciation"`
	Definition     string `json:"definition"`
}

type DictionaryService struct {
	mu      sync.RWMutex
	loaded  bool
	entries map[string][]DictionaryEntry // topic -> entries
	wordMap map[string][]string          // lowercase word -> list of topics
	dbPath  string
}

func NewDictionaryService(biblesDir string) *DictionaryService {
	dictDir := filepath.Join(biblesDir, "dictionary")
	entries, err := os.ReadDir(dictDir)
	if err != nil {
		return &DictionaryService{dbPath: ""}
	}
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".SQLite3") {
			return &DictionaryService{dbPath: filepath.Join(dictDir, e.Name())}
		}
	}
	return &DictionaryService{dbPath: ""}
}

func (d *DictionaryService) ensureLoaded() {
	d.mu.RLock()
	if d.loaded {
		d.mu.RUnlock()
		return
	}
	d.mu.RUnlock()

	d.mu.Lock()
	defer d.mu.Unlock()

	if d.loaded {
		return
	}

	if d.dbPath == "" {
		d.loaded = true
		return
	}

	db, err := sql.Open("sqlite", d.dbPath+"?mode=ro")
	if err != nil {
		d.loaded = true
		return
	}
	defer db.Close()

	d.entries = make(map[string][]DictionaryEntry)
	d.wordMap = make(map[string][]string)

	rows, err := db.Query("SELECT topic, definition, lexeme, transliteration, pronunciation, short_definition FROM dictionary")
	if err != nil {
		d.loaded = true
		return
	}
	defer rows.Close()

	for rows.Next() {
		var e DictionaryEntry
		rows.Scan(&e.Topic, &e.Definition, &e.Lexeme, &e.Transliteration, &e.Pronunciation, &e.ShortDef)

		e.Topic = strings.TrimPrefix(e.Topic, "\ufeff")
		e.Topic = strings.TrimSpace(e.Topic)

		d.entries[e.Topic] = append(d.entries[e.Topic], e)

		if e.ShortDef != "" {
			words := strings.Fields(strings.ToLower(e.ShortDef))
			seen := make(map[string]bool)
			for _, w := range words {
				w = cleanWord(w)
				if w != "" && len(w) > 1 && !seen[w] {
					d.wordMap[w] = append(d.wordMap[w], e.Topic)
					seen[w] = true
				}
			}
		}
	}

	d.loaded = true
}

func (d *DictionaryService) LookupWord(word string) []DictionaryEntry {
	d.ensureLoaded()
	d.mu.RLock()
	defer d.mu.RUnlock()

	if d.wordMap == nil {
		return nil
	}

	word = strings.ToLower(strings.TrimSpace(word))
	word = cleanWord(word)
	if word == "" || len(word) < 2 {
		return nil
	}

	topics, ok := d.wordMap[word]
	if !ok || len(topics) == 0 {
		return nil
	}

	var results []DictionaryEntry
	seen := make(map[string]bool)
	for _, topic := range topics {
		for _, e := range d.entries[topic] {
			if !seen[e.Topic] {
				results = append(results, e)
				seen[e.Topic] = true
			}
		}
	}
	return results
}

func (d *DictionaryService) LookupTopic(topic string) []DictionaryEntry {
	d.ensureLoaded()
	d.mu.RLock()
	defer d.mu.RUnlock()

	if d.entries == nil {
		return nil
	}

	topic = strings.TrimPrefix(topic, "\ufeff")
	topic = strings.TrimSpace(topic)
	return d.entries[topic]
}

var nonAlpha = regexp.MustCompile(`[^a-z0-9']`)

func cleanWord(w string) string {
	w = nonAlpha.ReplaceAllString(w, "")
	w = strings.Trim(w, "'")
	return w
}

func stripHTML(html string) string {
	re := regexp.MustCompile(`<[^>]*>`)
	result := re.ReplaceAllString(html, "")
	result = strings.ReplaceAll(result, "&#x200E;", "")
	result = strings.ReplaceAll(result, "\n", " ")
	spaceRe := regexp.MustCompile(`\s+`)
	result = spaceRe.ReplaceAllString(result, " ")
	return strings.TrimSpace(result)
}

func (d *DictionaryService) GetDefinition(topic string) string {
	entries := d.LookupTopic(topic)
	if len(entries) == 0 {
		return ""
	}
	return stripHTML(entries[0].Definition)
}

func (d *DictionaryService) WordCount() int {
	d.ensureLoaded()
	d.mu.RLock()
	defer d.mu.RUnlock()
	return len(d.wordMap)
}

func (d *DictionaryService) EntryCount() int {
	d.ensureLoaded()
	d.mu.RLock()
	defer d.mu.RUnlock()
	return len(d.entries)
}
