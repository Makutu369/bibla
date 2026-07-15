import { useState, useCallback, useEffect } from 'react';
import { Settings, Minus, Plus, RotateCcw, X, Download, BookOpen } from 'lucide-react';
import { AppService } from '../../bindings/changeme';

interface SettingsPanelProps {
  onClose: () => void;
  fontSize: number;
  onSetFontSize: (size: number) => void;
  readerWidth: number;
  onSetReaderWidth: (width: number) => void;
}

const FONT_MIN = 12;
const FONT_MAX = 28;
const FONT_DEFAULT = 19;

const WIDTH_MIN = 480;
const WIDTH_MAX = 1100;
const WIDTH_DEFAULT = 720;
const WIDTH_STEP = 40;

export function SettingsPanel({ onClose, fontSize, onSetFontSize, readerWidth, onSetReaderWidth }: SettingsPanelProps) {
  const [version, setVersion] = useState('');
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    AppService.GetVersion().then(setVersion);
  }, []);

  const handleCheckUpdates = useCallback(async () => {
    setCheckingUpdate(true);
    try {
      await AppService.CheckForUpdates();
    } catch {}
    setCheckingUpdate(false);
  }, []);

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

        {/* About */}
        <div>
          <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">About</h3>
          <div className="rounded-2xl border border-border overflow-hidden">
            <div className="px-4 pt-5 pb-4 text-center bg-gradient-to-b from-accent/5 to-transparent">
              <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-accent/10 flex items-center justify-center">
                <BookOpen className="w-7 h-7 text-accent" />
              </div>
              <h4 className="text-base font-bold text-fg">Bibla</h4>
              <p className="text-[11px] text-fg-muted mt-0.5">A beautiful Bible reader</p>
              <span className="inline-block mt-2 px-2.5 py-0.5 text-[10px] font-mono font-medium text-fg-muted bg-surface rounded-full border border-border">
                v{version}
              </span>
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={handleCheckUpdates}
                disabled={checkingUpdate}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-medium rounded-xl border border-border bg-surface hover:bg-surface-hover hover:border-border-focus disabled:opacity-50 transition-all">
                <Download className="w-3.5 h-3.5" />
                {checkingUpdate ? 'Checking for updates...' : 'Check for Updates'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
