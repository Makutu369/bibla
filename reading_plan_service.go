package main

import (
	"database/sql"
	"encoding/json"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

type ReadingPlanService struct {
	dbPath string
}

func NewReadingPlanService(dataDir string) (*ReadingPlanService, error) {
	os.MkdirAll(dataDir, 0755)
	dbPath := filepath.Join(dataDir, "reading_plan.db")

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}
	defer db.Close()

	db.Exec(`
		CREATE TABLE IF NOT EXISTS plan_progress (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			plan_id TEXT NOT NULL,
			book_number INTEGER NOT NULL,
			chapter INTEGER NOT NULL,
			completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			UNIQUE(plan_id, book_number, chapter)
		)
	`)

	return &ReadingPlanService{dbPath: dbPath}, nil
}

func (s *ReadingPlanService) openDB() (*sql.DB, error) {
	return sql.Open("sqlite", s.dbPath)
}

type PlanProgress struct {
	ID          int    `json:"id"`
	PlanID      string `json:"planId"`
	BookNumber  int    `json:"bookNumber"`
	Chapter     int    `json:"chapter"`
	CompletedAt string `json:"completedAt"`
}

func (s *ReadingPlanService) MarkChapter(planID string, bookNumber int, chapter int) error {
	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()

	now := time.Now().Format(time.RFC3339)
	_, err = db.Exec(
		"INSERT OR IGNORE INTO plan_progress (plan_id, book_number, chapter, completed_at) VALUES (?, ?, ?, ?)",
		planID, bookNumber, chapter, now,
	)
	return err
}

func (s *ReadingPlanService) UnmarkChapter(planID string, bookNumber int, chapter int) error {
	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()

	_, err = db.Exec(
		"DELETE FROM plan_progress WHERE plan_id = ? AND book_number = ? AND chapter = ?",
		planID, bookNumber, chapter,
	)
	return err
}

func (s *ReadingPlanService) GetProgress(planID string) []PlanProgress {
	db, err := s.openDB()
	if err != nil {
		return nil
	}
	defer db.Close()

	rows, err := db.Query(
		"SELECT id, plan_id, book_number, chapter, completed_at FROM plan_progress WHERE plan_id = ? ORDER BY completed_at DESC",
		planID,
	)
	if err != nil {
		return nil
	}
	defer rows.Close()

	var progress []PlanProgress
	for rows.Next() {
		var p PlanProgress
		rows.Scan(&p.ID, &p.PlanID, &p.BookNumber, &p.Chapter, &p.CompletedAt)
		progress = append(progress, p)
	}
	return progress
}

func (s *ReadingPlanService) IsChapterDone(planID string, bookNumber int, chapter int) bool {
	db, err := s.openDB()
	if err != nil {
		return false
	}
	defer db.Close()

	var count int
	db.QueryRow(
		"SELECT COUNT(*) FROM plan_progress WHERE plan_id = ? AND book_number = ? AND chapter = ?",
		planID, bookNumber, chapter,
	).Scan(&count)
	return count > 0
}

type ReadingPlanJSON struct {
	ID   string         `json:"id"`
	Name string         `json:"name"`
	Days []PlanDayJSON  `json:"days"`
}

type PlanDayJSON struct {
	Day      int            `json:"day"`
	Readings []ReadingJSON  `json:"readings"`
}

type ReadingJSON struct {
	BookNumber int `json:"bookNumber"`
	Chapter    int `json:"chapter"`
}

func (s *ReadingPlanService) SavePlan(plan ReadingPlanJSON) error {
	db, err := s.openDB()
	if err != nil {
		return err
	}
	defer db.Close()

	db.Exec(`
		CREATE TABLE IF NOT EXISTS plans (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			data TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	data, err := json.Marshal(plan)
	if err != nil {
		return err
	}

	_, err = db.Exec(
		"INSERT OR REPLACE INTO plans (id, name, data) VALUES (?, ?, ?)",
		plan.ID, plan.Name, string(data),
	)
	return err
}

func (s *ReadingPlanService) GetPlan(planID string) *ReadingPlanJSON {
	db, err := s.openDB()
	if err != nil {
		return nil
	}
	defer db.Close()

	db.Exec(`
		CREATE TABLE IF NOT EXISTS plans (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			data TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	var data string
	err = db.QueryRow("SELECT data FROM plans WHERE id = ?", planID).Scan(&data)
	if err != nil {
		return nil
	}

	var plan ReadingPlanJSON
	if err := json.Unmarshal([]byte(data), &plan); err != nil {
		return nil
	}
	return &plan
}

func (s *ReadingPlanService) GetAllPlans() []ReadingPlanJSON {
	db, err := s.openDB()
	if err != nil {
		return nil
	}
	defer db.Close()

	db.Exec(`
		CREATE TABLE IF NOT EXISTS plans (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			data TEXT NOT NULL,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP
		)
	`)

	rows, err := db.Query("SELECT data FROM plans ORDER BY created_at DESC")
	if err != nil {
		return nil
	}
	defer rows.Close()

	var plans []ReadingPlanJSON
	for rows.Next() {
		var data string
		rows.Scan(&data)
		var plan ReadingPlanJSON
		if err := json.Unmarshal([]byte(data), &plan); err == nil {
			plans = append(plans, plan)
		}
	}
	return plans
}
