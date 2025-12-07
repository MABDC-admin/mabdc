import { useState, useEffect } from 'react';

export const themes = [
  {
    name: 'Purple Pink',
    primary: '262 83% 58%',
    accent: '339 90% 51%',
    ring: '262 83% 58%',
  },
  {
    name: 'Ocean Blue',
    primary: '217 91% 60%',
    accent: '172 66% 50%',
    ring: '217 91% 60%',
  },
  {
    name: 'Forest Green',
    primary: '158 64% 42%',
    accent: '45 93% 47%',
    ring: '158 64% 42%',
  },
  {
    name: 'Sunset Orange',
    primary: '24 95% 53%',
    accent: '340 82% 52%',
    ring: '24 95% 53%',
  },
];

export function useTheme() {
  const [themeIndex, setThemeIndex] = useState(() => {
    const saved = localStorage.getItem('hr-theme-index');
    return saved ? parseInt(saved, 10) : 0;
  });

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('hr-dark-mode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const theme = themes[themeIndex];
    const root = document.documentElement;
    
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--ring', theme.ring);
    root.style.setProperty('--sidebar-primary', theme.primary);
    root.style.setProperty('--sidebar-accent', `${theme.primary.split(' ')[0]} ${theme.primary.split(' ')[1]} ${theme.primary.split(' ')[2]} / 0.1`);
    root.style.setProperty('--sidebar-accent-foreground', theme.primary);
    root.style.setProperty('--sidebar-ring', theme.primary);
    
    localStorage.setItem('hr-theme-index', themeIndex.toString());
  }, [themeIndex]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('hr-dark-mode', isDark.toString());
  }, [isDark]);

  const randomizeTheme = () => {
    const newIndex = Math.floor(Math.random() * themes.length);
    setThemeIndex(newIndex);
  };

  const setTheme = (index: number) => {
    setThemeIndex(index);
  };

  const toggleDarkMode = () => {
    setIsDark(prev => !prev);
  };

  return { themeIndex, themes, randomizeTheme, setTheme, currentTheme: themes[themeIndex], isDark, toggleDarkMode };
}
