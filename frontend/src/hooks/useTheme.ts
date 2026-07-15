import { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, Circle, Palette } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Theme = 'light' | 'gray' | 'amoled' | 'custom';

const THEME_CLASSES: Record<string, string> = {
  light: '',
  gray: 'theme-gray',
  amoled: 'theme-amoled',
};

const THEME_ICONS: Record<string, LucideIcon> = { light: Sun, gray: Circle, amoled: Moon, custom: Palette };
const THEME_LABELS: Record<string, string> = { light: 'Light', gray: 'Gray', amoled: 'Dark', custom: 'Custom' };

function applyCustomThemeFromStorage() {
  try {
    const raw = localStorage.getItem('bibla-custom-theme');
    if (!raw) return;
    const t = JSON.parse(raw);
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
  } catch {}
}

function clearCustomThemeStyles() {
  const root = document.documentElement;
  const vars = [
    '--bg', '--surface', '--surface-hover', '--surface-active',
    '--border', '--border-focus', '--fg', '--fg-secondary', '--fg-muted',
    '--accent', '--accent-hover', '--accent-light', '--accent-dim', '--accent-glow',
    '--reader-text', '--drop-cap', '--selection-bg', '--selection-fg',
    '--scrollbar', '--scrollbar-hover', '--input', '--ring', '--muted-foreground',
  ];
  vars.forEach(v => root.style.removeProperty(v));
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('bibla-theme') as Theme) || 'amoled';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-gray', 'theme-amoled');
    clearCustomThemeStyles();

    if (theme === 'custom') {
      applyCustomThemeFromStorage();
    } else if (THEME_CLASSES[theme]) {
      root.classList.add(THEME_CLASSES[theme]);
    }

    localStorage.setItem('bibla-theme', theme);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme(t => {
      if (t === 'light') return 'gray';
      if (t === 'gray') return 'amoled';
      if (t === 'amoled') return 'custom';
      return 'light';
    });
  }, []);

  return { theme, setTheme, cycle, Icon: THEME_ICONS[theme] || Moon, label: THEME_LABELS[theme] || 'Theme' };
}
