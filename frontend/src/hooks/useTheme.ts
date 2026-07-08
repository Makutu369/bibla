import { useState, useEffect, useCallback } from 'react';
import { Sun, Moon, Circle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type Theme = 'light' | 'gray' | 'amoled';

const THEME_CLASSES: Record<Theme, string> = {
  light: '',
  gray: 'theme-gray',
  amoled: 'theme-amoled',
};

const THEME_ICONS: Record<Theme, LucideIcon> = { light: Sun, gray: Circle, amoled: Moon };
const THEME_LABELS: Record<Theme, string> = { light: 'Light', gray: 'Gray', amoled: 'Dark' };

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('bibla-theme') as Theme) || 'amoled';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-gray', 'theme-amoled');
    if (THEME_CLASSES[theme]) root.classList.add(THEME_CLASSES[theme]);
    localStorage.setItem('bibla-theme', theme);
  }, [theme]);

  const cycle = useCallback(() => {
    setTheme(t => t === 'light' ? 'gray' : t === 'gray' ? 'amoled' : 'light');
  }, []);

  return { theme, setTheme, cycle, Icon: THEME_ICONS[theme], label: THEME_LABELS[theme] };
}
