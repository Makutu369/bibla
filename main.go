package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
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

func isChecksumFile(name string) bool {
	return strings.Contains(name, "sha256") || strings.Contains(name, "checksum") ||
		strings.Contains(name, "md5") || strings.Contains(name, "sha512")
}

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
		if rel == "bibles" || rel == "bibles/" {
			return nil
		}
		rel = strings.TrimPrefix(rel, "bibles/")

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
		AssetMatcher: func(req updater.CheckRequest, assets []github.ReleaseAsset) int {
			plat := strings.ToLower(req.Platform)
			arch := strings.ToLower(req.Arch)
			for i, a := range assets {
				name := strings.ToLower(a.Name)
				if strings.HasSuffix(name, ".sig") || strings.HasSuffix(name, ".asc") {
					continue
				}
				if strings.HasSuffix(name, ".deb") || strings.HasSuffix(name, ".rpm") {
					continue
				}
				if isChecksumFile(name) {
					continue
				}
				if plat != "" && !strings.Contains(name, plat) {
					continue
				}
				if arch != "" && !strings.Contains(name, arch) {
					continue
				}
				return i
			}
			return -1
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
			Options: updater.WindowOptions{
				Frameless: true,
			},
			HTML: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Software Update</title>
<style>
:root {
  --bg: #1a1a1f;
  --surface: #222228;
  --surface-hover: #2a2a32;
  --surface-active: #3a3a44;
  --border: #2e2e38;
  --fg: #eeeef0;
  --fg-secondary: #a0a0aa;
  --fg-muted: #5a5a66;
  --accent: #8a8070;
  --accent-hover: #9a9080;
  --accent-light: rgba(138,128,112,0.10);
  --success: #22c55e;
  --error: #ef4444;
  --radius: 12px;
  --font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--fg);
  -webkit-font-smoothing: antialiased;
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
}
.layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  gap: 14px;
}
.hero {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.icon {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--accent-light);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.state-ready .icon, .state-uptodate .icon { background: rgba(34,197,94,0.1); color: var(--success); }
.state-error .icon { background: rgba(239,68,68,0.1); color: var(--error); }
.head { flex: 1; min-width: 0; }
.title { font-size: 15px; font-weight: 600; }
.spinner {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--fg-muted);
}
.spinner::before {
  content: "";
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2.5px solid var(--surface-active);
  border-top-color: var(--accent);
  animation: spin 0.9s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
.progress-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.progress-pct {
  font-size: 28px;
  font-weight: 700;
  color: var(--fg);
  font-variant-numeric: tabular-nums;
  text-align: center;
}
.bar {
  appearance: none;
  width: 100%;
  height: 4px;
  border: none;
  border-radius: 2px;
  background: var(--surface-active);
}
.bar::-webkit-progress-bar { background: var(--surface-active); border-radius: 2px; }
.bar::-webkit-progress-value { background: var(--accent); border-radius: 2px; transition: width 80ms linear; }
.bar::-moz-progress-bar { background: var(--accent); border-radius: 2px; }
.error-banner {
  background: rgba(239,68,68,0.1);
  border: 1px solid var(--error);
  color: var(--error);
  padding: 10px 14px;
  border-radius: var(--radius);
  font-size: 12px;
}
.notes {
  flex: 1 1 auto;
  min-height: 40px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px;
  overflow-y: auto;
  color: var(--fg-secondary);
  font-size: 12px;
  line-height: 1.6;
}
.notes:empty { display: none; }
.notes::-webkit-scrollbar { width: 4px; }
.notes::-webkit-scrollbar-track { background: transparent; }
.notes::-webkit-scrollbar-thumb { background: var(--surface-active); border-radius: 2px; }
.footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  flex: 0 0 auto;
}
.btn {
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--fg);
  padding: 7px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.btn:hover { background: var(--surface-hover); }
.btn:active { transform: scale(0.98); }
.btn-primary {
  background: var(--accent);
  color: var(--bg);
  border-color: transparent;
}
.btn-primary:hover { background: var(--accent-hover); }
.btn-ghost {
  border-color: transparent;
  background: transparent;
  color: var(--fg-muted);
  padding: 7px 10px;
}
.btn-ghost:hover { background: var(--surface-hover); color: var(--fg); }
[state] { display: none; }
[state="checking"]    { display: flex; }
[state="available"]   { display: flex; }
[state="downloading"] { display: flex; }
[state="verifying"]   { display: flex; }
[state="installing"]  { display: flex; }
[state="ready"]       { display: flex; }
[state="up-to-date"]  { display: flex; }
[state="error"]       { display: flex; }
[state] .btn[data-show] { display: none; }
[state="available"]   .btn[data-show~="available"]   { display: inline-flex; }
[state="ready"]       .btn[data-show~="ready"]       { display: inline-flex; }
[state="up-to-date"]  .btn[data-show~="up-to-date"]  { display: inline-flex; }
[state="error"]       .btn[data-show~="error"]       { display: inline-flex; }
</style>
</head>
<body>
<main class="layout wails-updater" id="root" state="checking" data-wails-updater-window="1">
  <header class="hero">
    <div class="icon" id="state-icon">↓</div>
    <div class="head">
      <h1 class="title" id="title">Checking for Updates…</h1>
    </div>
  </header>

  <div class="spinner" data-show="checking verifying installing" id="spinner-text">Checking…</div>

  <div class="notes" data-show="available ready" id="notes"></div>

  <div class="progress-box" data-show="downloading">
    <div class="progress-pct" id="progress-pct">0%</div>
    <progress class="bar" id="bar" max="100" value="0"></progress>
  </div>

  <div class="error-banner" data-show="error" id="error-text">An error occurred.</div>

  <footer class="footer">
    <button class="btn btn-ghost" data-show="available" id="btn-skip" type="button">Skip</button>
    <button class="btn" data-show="available up-to-date error" id="btn-cancel" type="button">Close</button>
    <button class="btn btn-primary" data-show="available" id="btn-install" type="button">Install</button>
    <button class="btn btn-primary" data-show="ready" id="btn-restart" type="button">Restart</button>
    <button class="btn btn-primary" data-show="error" id="btn-retry" type="button">Retry</button>
  </footer>
</main>

<script>
(function () {
  var Events = window.wails.Events;
  var els = {
    root: document.getElementById("root"),
    icon: document.getElementById("state-icon"),
    title: document.getElementById("title"),
    notes: document.getElementById("notes"),
    spinnerText: document.getElementById("spinner-text"),
    progress: document.getElementById("bar"),
    progressPct: document.getElementById("progress-pct"),
    error: document.getElementById("error-text"),
    btnInstall: document.getElementById("btn-install"),
    btnSkip: document.getElementById("btn-skip"),
    btnCancel: document.getElementById("btn-cancel"),
    btnRestart: document.getElementById("btn-restart"),
    btnRetry: document.getElementById("btn-retry"),
  };

  var ICONS = { checking:"↻", available:"↓", downloading:"↓", verifying:"✓", installing:"↓", ready:"✓", "up-to-date":"✓", error:"!" };
  var RANK = { "":0, checking:1, available:2, downloading:3, verifying:4, installing:5, ready:6, "up-to-date":6, error:99 };
  var rank = 0;
  var errored = false;

  function setState(name) {
    if (errored && name !== "error") return false;
    if (name === "error") { errored = true; }
    else { if ((RANK[name]||0) < rank) return false; rank = RANK[name]||0; }
    els.root.setAttribute("state", name);
    els.root.classList.toggle("state-ready", name === "ready");
    els.root.classList.toggle("state-uptodate", name === "up-to-date");
    els.root.classList.toggle("state-error", name === "error");
    if (els.icon) els.icon.textContent = ICONS[name] || "";
    return true;
  }

  function renderMarkdown(src) {
    if (!src) return "";
    function esc(s) { return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
    function inline(s) {
      s = s.replace(/\*\*([^*]+)\*\*/g,"<strong>$1</strong>");
      s = s.replace(/(^|[^*])\*([^*]+)\*/g,"$1<em>$2</em>");
      return s;
    }
    var lines = esc(src).split(/\r?\n/), out = [], i = 0;
    while (i < lines.length) {
      var L = lines[i];
      if (/^#{1,6}\s+(.+)$/.test(L)) { var hm = /^#{1,6}\s+(.+)$/.exec(L); out.push("<p><strong>"+inline(hm[1])+"</strong></p>"); i++; continue; }
      if (/^[-*]\s+(.+)$/.test(L)) { var items=[]; while(i<lines.length&&/^[-*]\s+(.+)$/.test(lines[i])){items.push("<li>"+inline(/^[-*]\s+(.+)$/.exec(lines[i])[1])+"</li>");i++;} out.push("<ul>"+items.join("")+"</ul>"); continue; }
      if (L.trim()==="") { i++; continue; }
      var para=[L]; i++; while(i<lines.length&&lines[i].trim()!==""&&!/^[-*]\s/.test(lines[i])){para.push(lines[i]);i++;}
      out.push("<p>"+inline(para.join(" "))+"</p>");
    }
    return out.join("\n");
  }

  function onCheckStarted() { setState("checking"); els.title.textContent = "Checking for Updates…"; els.spinnerText.textContent = "Checking…"; }
  function onUpdateAvailable(rel) { setState("available"); els.title.textContent = "Update Available"; els.notes.innerHTML = (rel&&rel.notes)?renderMarkdown(rel.notes):""; }
  function onNoUpdate() { setState("up-to-date"); els.title.textContent = "You're Up to Date"; }
  function onDownloadStarted() { setState("downloading"); els.title.textContent = "Downloading…"; els.progress.removeAttribute("value"); els.progressPct.textContent = "0%"; }
  function onDownloadProgress(p) { if(!p||rank!==RANK.downloading) return; var pct = p.total>0 ? Math.round((p.written/p.total)*100) : 0; els.progress.max = p.total||100; els.progress.value = p.written||0; els.progressPct.textContent = pct+"%"; }
  function onVerifying() { setState("verifying"); els.title.textContent = "Verifying…"; els.spinnerText.textContent = "Checking integrity…"; }
  function onInstalling() { setState("installing"); els.title.textContent = "Installing…"; els.spinnerText.textContent = "Unpacking update…"; }
  function onUpdateReady() { setState("ready"); els.title.textContent = "Update Ready"; setTimeout(function(){ Events.Emit("wails:updater:user:restart"); }, 500); }
  function onError(info) { setState("error"); els.title.textContent = "Update Failed"; els.error.textContent = (info&&info.message)?info.message:"An unexpected error occurred."; }

  Events.On("wails:updater:check-started", function(){ onCheckStarted(); });
  Events.On("wails:updater:update-available", function(e){ onUpdateAvailable(e&&(e.data!=null?e.data:e)); });
  Events.On("wails:updater:no-update", function(){ onNoUpdate(); });
  Events.On("wails:updater:download-started", function(){ onDownloadStarted(); });
  Events.On("wails:updater:download-progress", function(e){ onDownloadProgress(e&&(e.data!=null?e.data:e)); });
  Events.On("wails:updater:download-complete", function(){});
  Events.On("wails:updater:verifying", function(){ onVerifying(); });
  Events.On("wails:updater:installing", function(){ onInstalling(); });
  Events.On("wails:updater:update-ready", function(){ onUpdateReady(); });
  Events.On("wails:updater:error", function(e){ onError(e&&(e.data!=null?e.data:e)); });

  if (els.btnInstall) els.btnInstall.addEventListener("click", function(){ Events.Emit("wails:updater:user:install"); });
  if (els.btnSkip)    els.btnSkip.addEventListener("click", function(){ Events.Emit("wails:updater:user:skip"); });
  if (els.btnCancel)  els.btnCancel.addEventListener("click", function(){ Events.Emit("wails:updater:user:cancel"); });
  if (els.btnRestart) els.btnRestart.addEventListener("click", function(){ Events.Emit("wails:updater:user:restart"); });
  if (els.btnRetry)   els.btnRetry.addEventListener("click", function(){ Events.Emit("wails:updater:user:install"); });

  (function announce() {
    if (window._wails && typeof window._wails.invoke === "function") {
      window._wails.invoke("wails:runtime:ready");
      Events.Emit("wails:updater:window:ready");
    } else { setTimeout(announce, 30); }
  })();
})();
</script>
</body>
</html>`,
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
