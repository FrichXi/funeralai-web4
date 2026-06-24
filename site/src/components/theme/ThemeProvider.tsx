'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type SiteTheme = 'night' | 'day';

interface ThemeContextValue {
  theme: SiteTheme;
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
  const [theme, setTheme] = useState<SiteTheme>('night');

  useEffect(() => {
    const initialTheme = storedTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);

    function handleStorage(event: StorageEvent) {
      if (event.key !== THEME_STORAGE_KEY) {
        return;
      }

      const nextTheme = event.newValue === 'day' ? 'day' : 'night';
      setTheme(nextTheme);
      applyTheme(nextTheme);
    }

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme: () => {
        setTheme((currentTheme) => {
          const nextTheme = currentTheme === 'day' ? 'night' : 'day';
          applyTheme(nextTheme);

          try {
            window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
          } catch {
            // Theme still changes for the current page even when storage is unavailable.
          }

          return nextTheme;
        });
      },
    }),
    [theme]
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

