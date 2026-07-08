package main

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"

	_ "modernc.org/sqlite"
)

type TopicalEntry struct {
	Topic      string `json:"topic"`
	Definition string `json:"definition"`
}

type TopicalVerseRef struct {
	BookNumber int    `json:"bookNumber"`
	Chapter    int    `json:"chapter"`
	Verse      int    `json:"verse"`
	Reference  string `json:"reference"`
}

type TopicalService struct {
	mu      sync.RWMutex
	loaded  bool
	entries map[string]string // topic -> definition HTML
	wordMap map[string][]string // lowercase word -> list of topics
	dbPath  string
}

func NewTopicalService(biblesDir string) *TopicalService {
	topicalDir := filepath.Join(biblesDir, "topical")
	entries, err := os.ReadDir(topicalDir)
	if err != nil {
		return &TopicalService{dbPath: ""}
	}
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".SQLite3") {
			return &TopicalService{dbPath: filepath.Join(topicalDir, e.Name())}
		}
	}
	return &TopicalService{dbPath: ""}
}

func (t *TopicalService) ensureLoaded() {
	t.mu.RLock()
	if t.loaded {
		t.mu.RUnlock()
		return
	}
	t.mu.RUnlock()

	t.mu.Lock()
	defer t.mu.Unlock()

	if t.loaded {
		return
	}

	if t.dbPath == "" {
		t.loaded = true
		return
	}

	db, err := sql.Open("sqlite", t.dbPath+"?mode=ro")
	if err != nil {
		t.loaded = true
		return
	}
	defer db.Close()

	t.entries = make(map[string]string)
	t.wordMap = make(map[string][]string)

	rows, err := db.Query("SELECT topic, definition FROM dictionary")
	if err != nil {
		t.loaded = true
		return
	}
	defer rows.Close()

	for rows.Next() {
		var topic, definition string
		rows.Scan(&topic, &definition)
		topic = strings.TrimSpace(topic)
		t.entries[topic] = definition
	}

	// Load word-to-topic mappings from the words table
	wordRows, err := db.Query("SELECT variation, standard_form FROM words")
	if err == nil {
		defer wordRows.Close()
		for wordRows.Next() {
			var variation, standardForm string
			wordRows.Scan(&variation, &standardForm)
			variation = strings.ToLower(strings.TrimSpace(variation))
			standardForm = strings.TrimSpace(standardForm)
			if variation != "" && standardForm != "" {
				t.wordMap[variation] = append(t.wordMap[variation], standardForm)
			}
		}
	}

	t.loaded = true
}

var topicNonAlpha = regexp.MustCompile(`[^a-z0-9']`)

func cleanTopicWord(w string) string {
	w = topicNonAlpha.ReplaceAllString(w, "")
	w = strings.Trim(w, "'")
	return w
}

func (t *TopicalService) SearchTopics(query string) []TopicalEntry {
	t.ensureLoaded()
	t.mu.RLock()
	defer t.mu.RUnlock()

	if t.entries == nil {
		return nil
	}

	query = strings.TrimSpace(query)
	if query == "" {
		return nil
	}

	queryLower := strings.ToLower(query)
	var results []TopicalEntry
	seen := make(map[string]bool)

	// First: exact topic match (case-insensitive)
	for topic, def := range t.entries {
		if strings.ToLower(topic) == queryLower && !seen[topic] {
			results = append(results, TopicalEntry{Topic: topic, Definition: def})
			seen[topic] = true
		}
	}

	// Second: prefix match
	for topic, def := range t.entries {
		if !seen[topic] && strings.HasPrefix(strings.ToLower(topic), queryLower) {
			results = append(results, TopicalEntry{Topic: topic, Definition: def})
			seen[topic] = true
		}
	}

	// Third: contains match
	for topic, def := range t.entries {
		if !seen[topic] && strings.Contains(strings.ToLower(topic), queryLower) {
			results = append(results, TopicalEntry{Topic: topic, Definition: def})
			seen[topic] = true
		}
	}

	// Fourth: word-based lookup via the words table
	if len(results) < 20 {
		cleaned := cleanTopicWord(queryLower)
		if cleaned != "" && len(cleaned) > 1 {
			if topics, ok := t.wordMap[cleaned]; ok {
				for _, topic := range topics {
					if !seen[topic] {
						if def, exists := t.entries[topic]; exists {
							results = append(results, TopicalEntry{Topic: topic, Definition: def})
							seen[topic] = true
						}
					}
				}
			}
		}
	}

	return results
}

func (t *TopicalService) GetTopicDefinition(topic string) string {
	t.ensureLoaded()
	t.mu.RLock()
	defer t.mu.RUnlock()

	topic = strings.TrimSpace(topic)
	if t.entries == nil {
		return ""
	}
	return t.entries[topic]
}

// ParseVerseRefs extracts Bible verse references from Nave's HTML definition
// Format: <a href='B:NNN CH:V'>Reference Text</a>
func (t *TopicalService) ParseVerseRefs(definition string) []TopicalVerseRef {
	var refs []TopicalVerseRef
	re := regexp.MustCompile(`<a href='B:(\d+)\s+(\d+):(\d+)'>([^<]+)</a>`)
	matches := re.FindAllStringSubmatch(definition, -1)

	for _, m := range matches {
		bn, _ := strconv.Atoi(m[1])
		ch, _ := strconv.Atoi(m[2])
		v, _ := strconv.Atoi(m[3])
		refText := strings.TrimSpace(m[4])
		if refText == "" {
			refText = fmt.Sprintf("B:%d %d:%d", bn, ch, v)
		}
		refs = append(refs, TopicalVerseRef{
			BookNumber: bn,
			Chapter:    ch,
			Verse:      v,
			Reference:  refText,
		})
	}
	return refs
}

// CleanDefinition strips HTML tags but preserves verse reference text
func (t *TopicalService) CleanDefinition(definition string) string {
	// Replace verse links with just their text
	re := regexp.MustCompile(`<a href='B:\d+\s+\d+:\d+'>([^<]+)</a>`)
	result := re.ReplaceAllString(definition, "$1")

	// Replace Strong's links with just their text
	re2 := regexp.MustCompile(`<a href='S:[^']+'>([^<]+)</a>`)
	result = re2.ReplaceAllString(result, "$1")

	// Strip remaining HTML tags
	re3 := regexp.MustCompile(`<[^>]*>`)
	result = re3.ReplaceAllString(result, " ")

	// Clean up whitespace
	result = strings.ReplaceAll(result, "\n", " ")
	spaceRe := regexp.MustCompile(`\s+`)
	result = spaceRe.ReplaceAllString(result, " ")
	return strings.TrimSpace(result)
}

func (t *TopicalService) EntryCount() int {
	t.ensureLoaded()
	t.mu.RLock()
	defer t.mu.RUnlock()
	return len(t.entries)
}

func (t *TopicalService) Preload() {
	t.ensureLoaded()
}

type TopicListItem struct {
	Topic string `json:"topic"`
}

func (t *TopicalService) GetTopicsByLetter(letter string) []TopicListItem {
	t.ensureLoaded()
	t.mu.RLock()
	defer t.mu.RUnlock()

	if t.entries == nil {
		return nil
	}

	letter = strings.ToUpper(strings.TrimSpace(letter))
	if letter == "" {
		return nil
	}

	var results []TopicListItem
	for topic := range t.entries {
		if len(topic) > 0 && strings.ToUpper(topic[:1]) == letter {
			results = append(results, TopicListItem{Topic: topic})
		}
	}

	// Sort alphabetically
	for i := 0; i < len(results); i++ {
		for j := i + 1; j < len(results); j++ {
			if results[i].Topic > results[j].Topic {
				results[i], results[j] = results[j], results[i]
			}
		}
	}

	return results
}

func (t *TopicalService) GetAlphabetIndex() map[string]int {
	t.ensureLoaded()
	t.mu.RLock()
	defer t.mu.RUnlock()

	index := make(map[string]int)
	for topic := range t.entries {
		if len(topic) > 0 {
			letter := strings.ToUpper(topic[:1])
			index[letter]++
		}
	}
	return index
}
