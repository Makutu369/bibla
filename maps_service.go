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

type MapEntry struct {
	Topic      string `json:"topic"`
	Definition string `json:"definition"`
}

type MapImage struct {
	ID      string `json:"id"`
	Content string `json:"content"`
}

type MapsService struct {
	mu       sync.RWMutex
	loaded   bool
	entries  map[string]MapEntry // topic -> entry
	images   map[string]string   // id -> base64 content
	wordMap  map[string][]string  // variation -> list of topics
	dbPath   string
	topics   []string             // ordered list of map topics
}

func NewMapsService(biblesDir string) *MapsService {
	mapsDir := filepath.Join(biblesDir, "maps")
	entries, err := os.ReadDir(mapsDir)
	if err != nil {
		return &MapsService{dbPath: ""}
	}
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".SQLite3") {
			return &MapsService{dbPath: filepath.Join(mapsDir, e.Name())}
		}
	}
	return &MapsService{dbPath: ""}
}

func (m *MapsService) ensureLoaded() {
	m.mu.RLock()
	if m.loaded {
		m.mu.RUnlock()
		return
	}
	m.mu.RUnlock()

	m.mu.Lock()
	defer m.mu.Unlock()

	if m.loaded {
		return
	}

	if m.dbPath == "" {
		m.loaded = true
		return
	}

	db, err := sql.Open("sqlite", m.dbPath+"?mode=ro")
	if err != nil {
		m.loaded = true
		return
	}
	defer db.Close()

	m.entries = make(map[string]MapEntry)
	m.images = make(map[string]string)
	m.wordMap = make(map[string][]string)
	m.topics = nil

	// Load dictionary entries
	rows, err := db.Query("SELECT topic, definition FROM dictionary")
	if err != nil {
		m.loaded = true
		return
	}
	defer rows.Close()

	for rows.Next() {
		var e MapEntry
		rows.Scan(&e.Topic, &e.Definition)
		e.Topic = strings.TrimSpace(e.Topic)
		if e.Topic != "" {
			m.entries[e.Topic] = e
			m.topics = append(m.topics, e.Topic)
		}
	}

	// Load images - extract base64 from img tags
	imgRows, err := db.Query("SELECT id, fragment FROM content_fragments")
	if err == nil {
		defer imgRows.Close()
		for imgRows.Next() {
			var id, content string
			imgRows.Scan(&id, &content)
			if id != "" {
				// Extract base64 from img tag src="data:image/...;base64,XXX"
				if idx := strings.Index(content, "base64,"); idx != -1 {
					b64 := content[idx+7:]
					// Remove trailing quote and img tag closing
					if endIdx := strings.Index(b64, "\""); endIdx != -1 {
						b64 = b64[:endIdx]
					}
					m.images[id] = b64
				} else {
					m.images[id] = content
				}
			}
		}
	}

	// Load word variations
	wordRows, err := db.Query("SELECT standard_form, variation FROM words")
	if err == nil {
		defer wordRows.Close()
		for wordRows.Next() {
			var standard, variation string
			wordRows.Scan(&standard, &variation)
			variation = strings.ToLower(strings.TrimSpace(variation))
			standard = strings.TrimSpace(standard)
			if variation != "" && standard != "" {
				m.wordMap[variation] = append(m.wordMap[variation], standard)
			}
		}
	}

	m.loaded = true
}

func (m *MapsService) GetAllMaps() []MapEntry {
	m.ensureLoaded()
	m.mu.RLock()
	defer m.mu.RUnlock()

	var results []MapEntry
	// Return overview maps (numbered entries) first
	for _, topic := range m.topics {
		if strings.HasPrefix(topic, "#") {
			if e, ok := m.entries[topic]; ok {
				results = append(results, e)
			}
		}
	}
	return results
}

func (m *MapsService) GetMapEntry(topic string) MapEntry {
	m.ensureLoaded()
	m.mu.RLock()
	defer m.mu.RUnlock()

	topic = strings.TrimSpace(topic)
	return m.entries[topic]
}

func (m *MapsService) GetMapImage(id string) string {
	m.ensureLoaded()
	m.mu.RLock()
	defer m.mu.RUnlock()

	return m.images[id]
}

func (m *MapsService) SearchMaps(query string) []MapEntry {
	m.ensureLoaded()
	m.mu.RLock()
	defer m.mu.RUnlock()

	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return m.GetAllMaps()
	}

	seen := make(map[string]bool)
	var results []MapEntry

	// First: exact topic match
	for _, topic := range m.topics {
		if strings.ToLower(topic) == query && !seen[topic] {
			if e, ok := m.entries[topic]; ok {
				results = append(results, e)
				seen[topic] = true
			}
		}
	}

	// Second: prefix match
	for _, topic := range m.topics {
		if !seen[topic] && strings.HasPrefix(strings.ToLower(topic), query) {
			if e, ok := m.entries[topic]; ok {
				results = append(results, e)
				seen[topic] = true
			}
		}
	}

	// Third: contains match
	for _, topic := range m.topics {
		if !seen[topic] && strings.Contains(strings.ToLower(topic), query) {
			if e, ok := m.entries[topic]; ok {
				results = append(results, e)
				seen[topic] = true
			}
		}
	}

	// Fourth: word variation lookup
	if topics, ok := m.wordMap[query]; ok {
		for _, topic := range topics {
			if !seen[topic] {
				if e, ok := m.entries[topic]; ok {
					results = append(results, e)
					seen[topic] = true
				}
			}
		}
	}

	return results
}

func (m *MapsService) GetLocationEntries() []MapEntry {
	m.ensureLoaded()
	m.mu.RLock()
	defer m.mu.RUnlock()

	var results []MapEntry
	for _, topic := range m.topics {
		if !strings.HasPrefix(topic, "#") {
			if e, ok := m.entries[topic]; ok {
				results = append(results, e)
			}
		}
	}
	return results
}

func (m *MapsService) SearchLocations(query string) []MapEntry {
	m.ensureLoaded()
	m.mu.RLock()
	defer m.mu.RUnlock()

	query = strings.ToLower(strings.TrimSpace(query))
	if query == "" {
		return m.GetLocationEntries()
	}

	seen := make(map[string]bool)
	var results []MapEntry

	// Search in non-map entries
	for _, topic := range m.topics {
		if strings.HasPrefix(topic, "#") {
			continue
		}
		if strings.Contains(strings.ToLower(topic), query) && !seen[topic] {
			if e, ok := m.entries[topic]; ok {
				results = append(results, e)
				seen[topic] = true
			}
		}
	}

	// Word variation lookup
	if topics, ok := m.wordMap[query]; ok {
		for _, topic := range topics {
			if !seen[topic] {
				if e, ok := m.entries[topic]; ok {
					results = append(results, e)
					seen[topic] = true
				}
			}
		}
	}

	return results
}

func (m *MapsService) EntryCount() int {
	m.ensureLoaded()
	m.mu.RLock()
	defer m.mu.RUnlock()
	return len(m.entries)
}

func (m *MapsService) Preload() {
	m.ensureLoaded()
}

var nonAlphaMap = regexp.MustCompile(`[^a-z0-9']`)

func cleanWordMap(w string) string {
	w = nonAlphaMap.ReplaceAllString(w, "")
	w = strings.Trim(w, "'")
	return w
}
