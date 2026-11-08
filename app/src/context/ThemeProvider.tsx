import React, { useEffect } from 'react';
import { useAppSelector } from '@/store';
import { Logger } from '@/utils/logging';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = useAppSelector(state => state.preferences.theme);

  useEffect(() => {
    const currentTheme = theme || 'system';
    const root = document.documentElement;

    Logger.debug(Logger.Categories.THEME, `Applying theme: ${currentTheme}`);

    if (currentTheme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      document.body.classList.add('theme-light');
      document.body.classList.remove('theme-dark');
    } else if (currentTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.classList.add('theme-dark');
      document.body.classList.remove('theme-light');
    } else {
      // System: let OS decide via prefers-color-scheme
      root.classList.remove('light', 'dark');
      document.body.classList.remove('theme-light', 'theme-dark');

      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      Logger.trace(Logger.Categories.THEME, `System prefers dark: ${prefersDark}`);
      if (prefersDark) {
        root.classList.add('dark');
      }
    }
  }, [theme]);

  // Listen for system preference changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system' && theme !== undefined) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const root = document.documentElement;
      if (e.matches) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  return <>{children}</>;
};

export default ThemeProvider;
