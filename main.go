package main

import (
	"embed"
	"io/fs"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed bibles
var embeddedBibles embed.FS

func getDataDir() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".bibla")
}

func getBiblesDir() string {
	exe, _ := os.Executable()
	exeDir := filepath.Dir(exe)

	// Check next to the executable first
	candidate := filepath.Join(exeDir, "bibles")
	if info, err := os.Stat(candidate); err == nil && info.IsDir() {
		return candidate
	}

	// Check parent of executable (exe is in bin/)
	candidate = filepath.Join(exeDir, "..", "bibles")
	if info, err := os.Stat(candidate); err == nil && info.IsDir() {
		return candidate
	}

	// Check working directory
	if info, err := os.Stat("bibles"); err == nil && info.IsDir() {
		return "bibles"
	}

	return ""
}

func extractEmbeddedBibles(targetDir string) error {
	return fs.WalkDir(embeddedBibles, "bibles", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		rel := filepath.ToSlash(path)
		rel = rel[len("bibles/"):]
		if rel == "" {
			return nil
		}

		dest := filepath.Join(targetDir, rel)

		if d.IsDir() {
			return os.MkdirAll(dest, 0o755)
		}

		data, err := fs.ReadFile(embeddedBibles, path)
		if err != nil {
			return err
		}
		return os.WriteFile(dest, data, 0o644)
	})
}

func main() {
	biblesDir := getBiblesDir()

	dataDir := getDataDir()

	if biblesDir == "" {
		biblesDir = filepath.Join(dataDir, "bibles")
		if _, err := os.Stat(biblesDir); os.IsNotExist(err) {
			os.MkdirAll(biblesDir, 0o755)
			if err := extractEmbeddedBibles(biblesDir); err != nil {
				log.Fatal("Failed to extract bibles:", err)
			}
		}
	}

	bibleService := NewBibleService(biblesDir)
	dictionaryService := NewDictionaryService(biblesDir)
	topicalService := NewTopicalService(biblesDir)
	mapsService := NewMapsService(biblesDir)
	bookmarksService, err := NewBookmarksService(dataDir)
	if err != nil {
		log.Fatal(err)
	}
	readingPlanService, err := NewReadingPlanService(dataDir)
	if err != nil {
		log.Fatal(err)
	}

	// Preload dictionary, topical, and maps data in background
	go dictionaryService.Preload()
	go topicalService.Preload()
	go mapsService.Preload()

	app := application.New(application.Options{
		Name:        "Bibla",
		Description: "A beautiful Bible reader",
		Services: []application.Service{
			application.NewService(bibleService),
			application.NewService(dictionaryService),
			application.NewService(topicalService),
			application.NewService(mapsService),
			application.NewService(bookmarksService),
			application.NewService(readingPlanService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	app.Window.NewWithOptions(application.WebviewWindowOptions{
		Title: "Bibla",
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
		Width:     1200,
		Height:    800,
		MinWidth:  800,
		MinHeight: 600,
		BackgroundColour: application.NewRGB(15, 23, 42),
		URL:              "/",
	})

	err = app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
