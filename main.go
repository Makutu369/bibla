package main

import (
	"embed"
	"log"
	"os"
	"path/filepath"

	"github.com/wailsapp/wails/v3/pkg/application"
)

//go:embed all:frontend/dist
var assets embed.FS

func getDataDir() string {
	home, _ := os.UserHomeDir()
	return filepath.Join(home, ".bibla")
}

func getBiblesDir() string {
	exe, _ := os.Executable()
	dir := filepath.Dir(exe)
	return filepath.Join(dir, "bibles")
}

func main() {
	biblesDir := "bibles"
	if _, err := os.Stat(biblesDir); os.IsNotExist(err) {
		biblesDir = getBiblesDir()
	}

	dataDir := getDataDir()

	bibleService := NewBibleService(biblesDir)
	dictionaryService := NewDictionaryService(biblesDir)
	bookmarksService, err := NewBookmarksService(dataDir)
	if err != nil {
		log.Fatal(err)
	}

	app := application.New(application.Options{
		Name:        "Bibla",
		Description: "A beautiful Bible reader",
		Services: []application.Service{
			application.NewService(bibleService),
			application.NewService(dictionaryService),
			application.NewService(bookmarksService),
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
