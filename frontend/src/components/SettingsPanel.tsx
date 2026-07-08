import { Settings, Sun, Moon, Circle, Minus, Plus, RotateCcw } from 'lucide-react';
import { Theme } from '../hooks/useTheme';

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

export function SettingsPanel({ onClose, fontSize, onSetFontSize, theme, onSetTheme, readerWidth, onSetReaderWidth }: SettingsPanelProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-fg-muted" />
          <span className="text-base font-bold text-fg">Settings</span>
        </div>
        <button onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors">
          <span className="text-lg leading-none">&times;</span>
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
          </div>
        </div>

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
