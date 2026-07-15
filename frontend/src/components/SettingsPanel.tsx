import { useState, useCallback } from 'react';
import { Settings, Sun, Moon, Circle, Minus, Plus, RotateCcw, Palette, X } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

interface CustomTheme {
  name: string;
  bg: string;
  surface: string;
  fg: string;
  accent: string;
}

const CUSTOM_THEMES_KEY = 'bibla-custom-themes';

function loadCustomThemes(): CustomTheme[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomThemes(themes: CustomTheme[]) {
  localStorage.setItem(CUSTOM_THEMES_KEY, JSON.stringify(themes));
}

interface SettingsPanelProps {
  onClose: () => void;
  fontSize: number;
  onSetFontSize: (size: number) => void;
  theme: Theme;
  onSetTheme: (theme: Theme) => void;
  readerWidth: number;
  onSetReaderWidth: (width: number) => void;
}

const THEMES: { id: Theme; label: string; icon: typeof Sun }[] = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'gray', label: 'Gray', icon: Circle },
  { id: 'amoled', label: 'Dark', icon: Moon },
];

const FONT_MIN = 12;
const FONT_MAX = 28;
const FONT_DEFAULT = 19;

const WIDTH_MIN = 480;
const WIDTH_MAX = 1100;
const WIDTH_DEFAULT = 720;
const WIDTH_STEP = 40;

const PRESET_CUSTOM_COLORS: CustomTheme[] = [
  { name: 'Sepia', bg: '#f4ecd8', surface: '#ebe3d0', fg: '#5c4b37', accent: '#8b6914' },
  { name: 'Forest', bg: '#1a2318', surface: '#1f2b1d', fg: '#c8d6c0', accent: '#6b8f5e' },
  { name: 'Ocean', bg: '#0f172a', surface: '#1e293b', fg: '#cbd5e1', accent: '#38bdf8' },
  { name: 'Lavender', bg: '#1e1b2e', surface: '#262339', fg: '#d4d0e8', accent: '#a78bfa' },
  { name: 'Rose', bg: '#1c1317', surface: '#271e24', fg: '#e0d0d8', accent: '#f472b6' },
];

export function SettingsPanel({ onClose, fontSize, onSetFontSize, theme, onSetTheme, readerWidth, onSetReaderWidth }: SettingsPanelProps) {
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(loadCustomThemes);
  const [showCustom, setShowCustom] = useState(false);
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);

  const applyCustomTheme = useCallback((t: CustomTheme) => {
    const root = document.documentElement;
    root.classList.remove('theme-gray', 'theme-amoled');
    root.style.setProperty('--bg', t.bg);
    root.style.setProperty('--surface', t.surface);
    root.style.setProperty('--surface-hover', t.surface + 'dd');
    root.style.setProperty('--surface-active', t.surface + 'bb');
    root.style.setProperty('--border', t.fg + '22');
    root.style.setProperty('--border-focus', t.fg + '44');
    root.style.setProperty('--fg', t.fg);
    root.style.setProperty('--fg-secondary', t.fg + 'bb');
    root.style.setProperty('--fg-muted', t.fg + '77');
    root.style.setProperty('--accent', t.accent);
    root.style.setProperty('--accent-hover', t.accent + 'dd');
    root.style.setProperty('--accent-light', t.accent + '18');
    root.style.setProperty('--accent-dim', t.accent + '12');
    root.style.setProperty('--accent-glow', t.accent + '1f');
    root.style.setProperty('--reader-text', t.fg + 'e0');
    root.style.setProperty('--drop-cap', t.accent);
    root.style.setProperty('--selection-bg', t.accent + '1a');
    root.style.setProperty('--selection-fg', t.fg);
    root.style.setProperty('--scrollbar', t.fg + '1f');
    root.style.setProperty('--scrollbar-hover', t.fg + '33');
    root.style.setProperty('--input', t.fg + '22');
    root.style.setProperty('--ring', t.accent);
    root.style.setProperty('--muted-foreground', t.fg + '77');
    localStorage.setItem('bibla-theme', 'custom');
    localStorage.setItem('bibla-custom-theme', JSON.stringify(t));
  }, []);

  const saveTheme = useCallback(() => {
    if (!editingTheme || !editingTheme.name.trim()) return;
    const updated = [...customThemes.filter(t => t.name !== editingTheme.name), editingTheme];
    setCustomThemes(updated);
    saveCustomThemes(updated);
    applyCustomTheme(editingTheme);
    setEditingTheme(null);
  }, [editingTheme, customThemes, applyCustomTheme]);

  const deleteTheme = useCallback((name: string) => {
    const updated = customThemes.filter(t => t.name !== name);
    setCustomThemes(updated);
    saveCustomThemes(updated);
  }, [customThemes]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-fg-muted" />
          <span className="text-base font-bold text-fg">Settings</span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
          <span className="text-lg leading-none"><X className="w-3.5 h-3.5" /></span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
        {/* Theme */}
        <div>
          <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">Theme</h3>
          <div className="flex gap-2">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => onSetTheme(t.id)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg border transition-all ${
                  theme === t.id
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-fg-muted hover:border-border-focus hover:text-fg'
                }`}>
                <t.icon className="w-4 h-4" />
                <span className="text-[11px] font-medium">{t.label}</span>
              </button>
            ))}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-lg border transition-all ${
                showCustom || theme === ('custom' as Theme)
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-fg-muted hover:border-border-focus hover:text-fg'
              }`}>
              <Palette className="w-4 h-4" />
              <span className="text-[11px] font-medium">Custom</span>
            </button>
          </div>
        </div>

        {/* Custom Theme Editor */}
        {showCustom && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider">Custom Themes</h3>

            {/* Preset colors */}
            <div className="flex flex-wrap gap-2">
              {PRESET_CUSTOM_COLORS.map(t => (
                <button
                  key={t.name}
                  onClick={() => applyCustomTheme(t)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-xs text-fg-secondary hover:border-border-focus hover:text-fg transition-all"
                  style={{ backgroundColor: t.bg }}>
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.accent }} />
                  {t.name}
                </button>
              ))}
            </div>

            {/* Create custom theme */}
            {editingTheme ? (
              <div className="p-3 rounded-xl bg-surface border border-border space-y-3">
                <input
                  type="text"
                  value={editingTheme.name}
                  onChange={e => setEditingTheme({ ...editingTheme, name: e.target.value })}
                  placeholder="Theme name"
                  className="w-full px-3 py-1.5 text-sm rounded-lg bg-bg border border-border text-fg outline-none focus:border-accent"
                />
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Background', key: 'bg' as const },
                    { label: 'Surface', key: 'surface' as const },
                    { label: 'Text', key: 'fg' as const },
                    { label: 'Accent', key: 'accent' as const },
                  ].map(c => (
                    <label key={c.key} className="flex items-center gap-2 text-xs text-fg-muted">
                      <input
                        type="color"
                        value={editingTheme[c.key]}
                        onChange={e => setEditingTheme({ ...editingTheme, [c.key]: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer border-0"
                      />
                      {c.label}
                    </label>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={saveTheme}
                    className="flex-1 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                    Save
                  </button>
                  <button onClick={() => setEditingTheme(null)}
                    className="px-3 py-1.5 text-xs font-medium border border-border text-fg-muted rounded-lg hover:text-fg transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingTheme({ name: '', bg: '#1a1a2e', surface: '#16213e', fg: '#e0e0e0', accent: '#e94560' })}
                className="w-full px-3 py-2 text-xs text-fg-muted border border-dashed border-border rounded-xl hover:border-border-focus hover:text-fg transition-all">
                + Create custom theme
              </button>
            )}

            {/* Saved custom themes */}
            {customThemes.length > 0 && (
              <div className="space-y-1.5">
                {customThemes.map(t => (
                  <div key={t.name} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-surface-hover transition-colors group">
                    <button onClick={() => applyCustomTheme(t)} className="flex items-center gap-2 flex-1 text-left">
                      <span className="w-4 h-4 rounded-full border border-border" style={{ backgroundColor: t.accent }} />
                      <span className="text-xs text-fg">{t.name}</span>
                    </button>
                    <button onClick={() => deleteTheme(t.name)}
                      className="text-[10px] text-fg-muted hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Font size */}
        <div>
          <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">Font Size</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSetFontSize(Math.max(FONT_MIN, fontSize - 1))}
              disabled={fontSize <= FONT_MIN}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-fg-muted hover:text-fg hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 relative">
              <input
                type="range"
                min={FONT_MIN}
                max={FONT_MAX}
                value={fontSize}
                onChange={e => onSetFontSize(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-fg-muted">{FONT_MIN}px</span>
                <span className="text-[11px] font-medium text-fg">{fontSize}px</span>
                <span className="text-[10px] text-fg-muted">{FONT_MAX}px</span>
              </div>
            </div>
            <button
              onClick={() => onSetFontSize(Math.min(FONT_MAX, fontSize + 1))}
              disabled={fontSize >= FONT_MAX}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-fg-muted hover:text-fg hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {fontSize !== FONT_DEFAULT && (
            <button
              onClick={() => onSetFontSize(FONT_DEFAULT)}
              className="mt-2 flex items-center gap-1.5 text-[11px] text-fg-muted hover:text-fg transition-colors">
              <RotateCcw className="w-3 h-3" />
              Reset to default
            </button>
          )}
        </div>

        {/* Reader width */}
        <div>
          <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">Reader Width</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSetReaderWidth(Math.max(WIDTH_MIN, readerWidth - WIDTH_STEP))}
              disabled={readerWidth <= WIDTH_MIN}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-fg-muted hover:text-fg hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <Minus className="w-3.5 h-3.5" />
            </button>
            <div className="flex-1 relative">
              <input
                type="range"
                min={WIDTH_MIN}
                max={WIDTH_MAX}
                step={WIDTH_STEP}
                value={readerWidth}
                onChange={e => onSetReaderWidth(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-border rounded-full appearance-none cursor-pointer accent-accent"
              />
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-fg-muted">{WIDTH_MIN}px</span>
                <span className="text-[11px] font-medium text-fg">{readerWidth}px</span>
                <span className="text-[10px] text-fg-muted">{WIDTH_MAX}px</span>
              </div>
            </div>
            <button
              onClick={() => onSetReaderWidth(Math.min(WIDTH_MAX, readerWidth + WIDTH_STEP))}
              disabled={readerWidth >= WIDTH_MAX}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-border text-fg-muted hover:text-fg hover:bg-surface-hover disabled:opacity-30 disabled:pointer-events-none transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {readerWidth !== WIDTH_DEFAULT && (
            <button
              onClick={() => onSetReaderWidth(WIDTH_DEFAULT)}
              className="mt-2 flex items-center gap-1.5 text-[11px] text-fg-muted hover:text-fg transition-colors">
              <RotateCcw className="w-3 h-3" />
              Reset to default
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
