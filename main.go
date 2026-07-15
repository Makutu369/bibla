package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/updater"
	"github.com/wailsapp/wails/v3/pkg/updater/providers/github"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed bibles
var embeddedBibles embed.FS

var currentVersion = "dev"

var appInst *application.App

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
	commentaryService := NewCommentaryService(biblesDir)
	bookmarksService, err := NewBookmarksService(dataDir)
	if err != nil {
		log.Fatal(err)
	}
	readingPlanService, err := NewReadingPlanService(dataDir)
	if err != nil {
		log.Fatal(err)
	}

	// Preload dictionary, topical, maps, and commentary data in background
	go dictionaryService.Preload()
	go topicalService.Preload()
	go mapsService.Preload()
	go commentaryService.Preload()

	app := application.New(application.Options{
		Name:        "Bibla",
		Description: "A beautiful Bible reader",
		Services: []application.Service{
			application.NewService(bibleService),
			application.NewService(dictionaryService),
			application.NewService(topicalService),
			application.NewService(mapsService),
			application.NewService(commentaryService),
			application.NewService(bookmarksService),
			application.NewService(readingPlanService),
			application.NewService(&AppService{}),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})
	appInst = app

	// Initialize updater
	gh, err := github.New(github.Config{
		Repository:    "Makutu369/bibla",
		ChecksumAsset: "SHA256SUMS",
		HTTPClient: &http.Client{
			Timeout: 10 * time.Minute,
		},
	})
	if err != nil {
		log.Fatalf("github.New: %v", err)
	}
	if err := app.Updater.Init(updater.Config{
		CurrentVersion: currentVersion,
		Providers:      []updater.Provider{gh},
		CheckInterval:  24 * time.Hour,
		Window: &updater.BuiltinWindow{
			CSS: `:root {
				--bg: #0f172a;
				--surface: #1e293b;
				--surface-2: #334155;
				--fg: #f1f5f9;
				--fg-dim: #94a3b8;
				--fg-faint: #64748b;
				--border: #1e293b;
				--accent: #38bdf8;
				--accent-fg: #0f172a;
				--success: #22c55e;
				--error: #ef4444;
				--radius: 16px;
				--font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
			}
			* { box-sizing: border-box; }
			body {
				font-family: var(--font);
				-webkit-font-smoothing: antialiased;
			}
			.card {
				background: var(--surface);
				border: 1px solid var(--surface-2);
				border-radius: var(--radius);
				box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2);
			}
			.progress-bar {
				background: var(--surface-2);
				border-radius: 999px;
				overflow: hidden;
				height: 6px;
			}
			.progress-bar-fill {
				background: linear-gradient(90deg, var(--accent), #7dd3fc);
				height: 100%;
				border-radius: 999px;
				transition: width 0.3s ease;
			}
			.btn-primary {
				background: var(--accent);
				color: var(--accent-fg);
				border: none;
				border-radius: 12px;
				padding: 12px 24px;
				font-weight: 600;
				font-size: 13px;
				cursor: pointer;
				transition: all 0.2s ease;
				box-shadow: 0 2px 8px rgba(56, 189, 248, 0.3);
			}
			.btn-primary:hover {
				filter: brightness(1.1);
				box-shadow: 0 4px 16px rgba(56, 189, 248, 0.4);
				transform: translateY(-1px);
			}
			.btn-primary:active {
				transform: translateY(0);
			}
			.btn-ghost {
				background: transparent;
				color: var(--fg-dim);
				border: 1px solid var(--surface-2);
				border-radius: 12px;
				padding: 10px 20px;
				font-weight: 500;
				font-size: 13px;
				cursor: pointer;
				transition: all 0.2s ease;
			}
			.btn-ghost:hover {
				background: var(--surface-2);
				color: var(--fg);
				border-color: var(--fg-faint);
			}
			.version-badge {
				display: inline-flex;
				align-items: center;
				gap: 6px;
				padding: 6px 14px;
				background: var(--surface-2);
				border-radius: 999px;
				font-size: 12px;
				font-weight: 500;
				color: var(--fg-dim);
				font-family: 'SF Mono', 'Fira Code', monospace;
			}
			.icon-wrapper {
				width: 56px;
				height: 56px;
				border-radius: 16px;
				display: flex;
				align-items: center;
				justify-content: center;
			}
			.icon-wrapper.checking { background: rgba(56, 189, 248, 0.1); }
			.icon-wrapper.available { background: rgba(56, 189, 248, 0.1); }
			.icon-wrapper.downloading { background: rgba(56, 189, 248, 0.15); }
			.icon-wrapper.ready { background: rgba(34, 197, 94, 0.1); }
			.icon-wrapper.error { background: rgba(239, 68, 68, 0.1); }
			.icon-wrapper.uptodate { background: rgba(34, 197, 94, 0.1); }
			.release-notes {
				background: var(--bg);
				border: 1px solid var(--surface-2);
				border-radius: 12px;
				padding: 16px;
				font-size: 13px;
				line-height: 1.6;
				color: var(--fg-dim);
				max-height: 200px;
				overflow-y: auto;
			}
			.release-notes::-webkit-scrollbar { width: 6px; }
			.release-notes::-webkit-scrollbar-track { background: transparent; }
			.release-notes::-webkit-scrollbar-thumb { background: var(--surface-2); border-radius: 3px; }
			.release-notes::-webkit-scrollbar-thumb:hover { background: var(--fg-faint); }
			.status-text { color: var(--fg-dim); font-size: 13px; }
			.title { color: var(--fg); font-weight: 700; font-size: 18px; }
			.subtitle { color: var(--fg-dim); font-size: 13px; margin-top: 4px; }`,
		},
	}); err != nil {
		log.Fatalf("Updater.Init: %v", err)
	}

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
