import { useState } from 'react';

export type Theme = 'gray';

export function useTheme() {
  const [theme] = useState<Theme>('gray');
  return { theme, setTheme: () => {} };
}
