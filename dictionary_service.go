package main

import (
	"database/sql"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"sync"

	_ "modernc.org/sqlite"
)

type DictionaryEntry struct {
	Topic           string             `json:"topic"`
	ShortDef        string             `json:"shortDef"`
	Lexeme          string             `json:"lexeme"`
	Transliteration string             `json:"transliteration"`
	Pronunciation   string             `json:"pronunciation"`
	Definition      string             `json:"definition"`
	Cognates        []DictionaryEntry  `json:"cognates"`
}

type dictionaryData struct {
	entries    map[string][]DictionaryEntry // topic -> entries
	wordMap    map[string][]string          // lowercase word -> list of topics
	cognateMap map[string][]string          // strong_number -> list of cognate strong_numbers
}

type DictionaryService struct {
	mu          sync.RWMutex
	loaded      bool
	databases   map[string]string      // name -> dbPath
	currentDict string                 // active dictionary name
	data        map[string]*dictionaryData // name -> loaded data
}

func NewDictionaryService(biblesDir string) *DictionaryService {
	dictDir := filepath.Join(biblesDir, "dictionary")
	entries, err := os.ReadDir(dictDir)
	if err != nil {
		return &DictionaryService{databases: make(map[string]string)}
	}

	databases := make(map[string]string)
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".SQLite3") {
			name := strings.TrimSuffix(e.Name(), ".dictionary.SQLite3")
			databases[name] = filepath.Join(dictDir, e.Name())
		}
	}

	// Default to SECE if available, otherwise use first available
	currentDict := ""
	if _, ok := databases["SECE"]; ok {
		currentDict = "SECE"
	} else if len(databases) > 0 {
		for name := range databases {
			currentDict = name
			break
		}
	}

	return &DictionaryService{
		databases:   databases,
		currentDict: currentDict,
		data:        make(map[string]*dictionaryData),
	}
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

	// Load all dictionaries
	for name, dbPath := range d.databases {
		d.loadDictionary(name, dbPath)
	}

	d.loaded = true
}

func (d *DictionaryService) loadDictionary(name, dbPath string) {
	db, err := sql.Open("sqlite", dbPath+"?mode=ro")
	if err != nil {
		return
	}
	defer db.Close()

	data := &dictionaryData{
		entries:    make(map[string][]DictionaryEntry),
		wordMap:    make(map[string][]string),
		cognateMap: make(map[string][]string),
	}

	// Try loading with all columns first (SECE format)
	rows, err := db.Query("SELECT topic, definition, lexeme, transliteration, pronunciation, short_definition FROM dictionary")
	if err != nil {
		// Fallback to basic columns (NUBD format)
		rows, err = db.Query("SELECT topic, definition, '', '', '', '' FROM dictionary")
		if err != nil {
			return
		}
	}
	defer rows.Close()

	for rows.Next() {
		var e DictionaryEntry
		rows.Scan(&e.Topic, &e.Definition, &e.Lexeme, &e.Transliteration, &e.Pronunciation, &e.ShortDef)

		e.Topic = strings.TrimPrefix(e.Topic, "\ufeff")
		e.Topic = strings.TrimSpace(e.Topic)

		data.entries[e.Topic] = append(data.entries[e.Topic], e)

		// Build word map from shortDef if available, otherwise from topic
		searchText := e.ShortDef
		if searchText == "" {
			searchText = e.Topic
		}
		if searchText != "" {
			words := strings.Fields(strings.ToLower(searchText))
			seen := make(map[string]bool)
			for _, w := range words {
				w = cleanWord(w)
				if w != "" && len(w) > 1 && !seen[w] {
					data.wordMap[w] = append(data.wordMap[w], e.Topic)
					seen[w] = true
				}
			}
		}
	}

	// Load cognate relationships (SECE only)
	cogRows, err := db.Query("SELECT group_id, strong_number FROM cognate_strong_numbers ORDER BY group_id")
	if err == nil {
		defer cogRows.Close()

		groupMembers := make(map[int][]string)
		for cogRows.Next() {
			var groupID int
			var strongNum string
			cogRows.Scan(&groupID, &strongNum)
			strongNum = strings.TrimSpace(strongNum)
			if strongNum != "" {
				groupMembers[groupID] = append(groupMembers[groupID], strongNum)
			}
		}

		// Build bidirectional cognate map
		for _, members := range groupMembers {
			for _, member := range members {
				var cognates []string
				for _, other := range members {
					if other != member {
						cognates = append(cognates, other)
					}
				}
				data.cognateMap[member] = cognates
			}
		}
	}

	d.data[name] = data
}

func (d *DictionaryService) GetDictionaries() []string {
	d.ensureLoaded()
	d.mu.RLock()
	defer d.mu.RUnlock()

	var names []string
	for name := range d.databases {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

func (d *DictionaryService) SetDictionary(name string) bool {
	d.ensureLoaded()
	d.mu.Lock()
	defer d.mu.Unlock()

	if _, ok := d.databases[name]; ok {
		d.currentDict = name
		return true
	}
	return false
}

func (d *DictionaryService) GetCurrentDictionary() string {
	d.mu.RLock()
	defer d.mu.RUnlock()
	return d.currentDict
}

func (d *DictionaryService) getData() *dictionaryData {
	if d.data == nil {
		return nil
	}
	return d.data[d.currentDict]
}

func (d *DictionaryService) LookupWord(word string) []DictionaryEntry {
	d.ensureLoaded()
	d.mu.RLock()
	defer d.mu.RUnlock()

	data := d.getData()
	if data == nil || data.wordMap == nil {
		return nil
	}

	word = strings.ToLower(strings.TrimSpace(word))
	word = cleanWord(word)
	if word == "" || len(word) < 2 {
		return nil
	}

	topics, ok := data.wordMap[word]
	if !ok || len(topics) == 0 {
		return nil
	}

	var results []DictionaryEntry
	seen := make(map[string]bool)
	for _, topic := range topics {
		for _, e := range data.entries[topic] {
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

	data := d.getData()
	if data == nil || data.entries == nil {
		return nil
	}

	topic = strings.TrimPrefix(topic, "\ufeff")
	topic = strings.TrimSpace(topic)
	return data.entries[topic]
}

func (d *DictionaryService) LookupTopicPrefix(prefix string) []DictionaryEntry {
	d.ensureLoaded()
	d.mu.RLock()
	defer d.mu.RUnlock()

	data := d.getData()
	if data == nil || data.entries == nil {
		return nil
	}

	prefix = strings.TrimPrefix(prefix, "\ufeff")
	prefix = strings.TrimSpace(strings.ToUpper(prefix))
	if prefix == "" {
		return nil
	}

	var results []DictionaryEntry
	seen := make(map[string]bool)
	for topic, entries := range data.entries {
		upperTopic := strings.ToUpper(topic)
		if strings.HasPrefix(upperTopic, prefix) {
			for _, e := range entries {
				if !seen[e.Topic] {
					results = append(results, e)
					seen[e.Topic] = true
				}
			}
		}
	}
	return results
}

func (d *DictionaryService) SearchPhrase(phrase string) []DictionaryEntry {
	d.ensureLoaded()
	d.mu.RLock()
	defer d.mu.RUnlock()

	data := d.getData()
	if data == nil || data.entries == nil {
		return nil
	}

	phrase = strings.ToLower(strings.TrimSpace(phrase))
	if phrase == "" {
		return nil
	}

	var results []DictionaryEntry
	seen := make(map[string]bool)

	for _, entries := range data.entries {
		for _, e := range entries {
			if seen[e.Topic] {
				continue
			}
			// Search in shortDef, definition, and topic
			searchText := strings.ToLower(e.ShortDef + " " + e.Definition + " " + e.Topic)
			if strings.Contains(searchText, phrase) {
				results = append(results, e)
				seen[e.Topic] = true
			}
		}
	}

	// If no exact phrase match, try matching all words
	if len(results) == 0 {
		queryWords := strings.Fields(phrase)
		if len(queryWords) > 1 {
			for _, entries := range data.entries {
				for _, e := range entries {
					if seen[e.Topic] {
						continue
					}
					searchText := strings.ToLower(e.ShortDef + " " + e.Definition + " " + e.Topic)
					allMatch := true
					for _, qw := range queryWords {
						if !strings.Contains(searchText, qw) {
							allMatch = false
							break
						}
					}
					if allMatch {
						results = append(results, e)
						seen[e.Topic] = true
					}
				}
			}
		}
	}

	return results
}

func (d *DictionaryService) LookupCognates(topic string) []DictionaryEntry {
	d.ensureLoaded()
	d.mu.RLock()
	defer d.mu.RUnlock()

	data := d.getData()
	if data == nil || data.cognateMap == nil {
		return nil
	}

	topic = strings.TrimPrefix(topic, "\ufeff")
	topic = strings.TrimSpace(topic)

	cognateNums, ok := data.cognateMap[topic]
	if !ok || len(cognateNums) == 0 {
		return nil
	}

	var results []DictionaryEntry
	seen := make(map[string]bool)
	for _, cn := range cognateNums {
		if entries, exists := data.entries[cn]; exists {
			for _, e := range entries {
				if !seen[e.Topic] {
					results = append(results, e)
					seen[e.Topic] = true
				}
			}
		}
	}
	return results
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

	data := d.getData()
	if data == nil {
		return 0
	}
	return len(data.wordMap)
}

func (d *DictionaryService) EntryCount() int {
	d.ensureLoaded()
	d.mu.RLock()
	defer d.mu.RUnlock()

	data := d.getData()
	if data == nil {
		return 0
	}
	return len(data.entries)
}

func (d *DictionaryService) Preload() {
	d.ensureLoaded()
}
