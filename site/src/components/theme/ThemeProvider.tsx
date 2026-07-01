'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type SiteTheme = 'night' | 'day';

interface ThemeContextValue {
  theme: SiteTheme;
  setTheme: (theme: SiteTheme) => void;
  toggleTheme: () => void;
}

const THEME_STORAGE_KEY = 'funeralai-theme';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(theme: SiteTheme) {
  if (theme === 'day') {
    document.documentElement.setAttribute('data-theme', 'day');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function storedTheme() {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'day' ? 'day' : 'night';
  } catch {
    return 'night';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<SiteTheme>('night');

  const setTheme = useCallback((nextTheme: SiteTheme) => {
    setThemeState(nextTheme);
    applyTheme(nextTheme);

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // Theme still changes for the current page even when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const initialTheme = storedTheme();
    setThemeState(initialTheme);
    applyTheme(initialTheme);

    function handleStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      const nextTheme = event.newValue === 'day' ? 'day' : 'night';
      setThemeState(nextTheme);
      applyTheme(nextTheme);
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === 'day' ? 'night' : 'day'),
    }),
    [setTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used inside ThemeProvider');
  }

  return context;
}
