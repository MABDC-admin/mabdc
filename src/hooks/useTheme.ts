import { useState, useEffect } from 'react';

export const themes = [
  {
    name: 'ClassDojo Green',
    primary: '160 100% 40%',
    accent: '199 89% 48%',
    ring: '160 100% 40%',
    sidebarBg: '160 100% 40%',
    sidebarBgLight: '160 100% 40%',
    sidebarFgLight: '0 0% 100%',
    sidebarFgDark: '0 0% 90%',
  },
  {
    name: 'ClassDojo Blue',
    primary: '199 89% 48%',
    accent: '160 100% 40%',
    ring: '199 89% 48%',
    sidebarBg: '199 89% 48%',
    sidebarBgLight: '199 89% 48%',
    sidebarFgLight: '0 0% 100%',
    sidebarFgDark: '0 0% 90%',
  },
  {
    name: 'ClassDojo Purple',
    primary: '270 70% 55%',
    accent: '320 80% 55%',
    ring: '270 70% 55%',
    sidebarBg: '270 70% 55%',
    sidebarBgLight: '270 70% 55%',
    sidebarFgLight: '0 0% 100%',
    sidebarFgDark: '0 0% 90%',
  },
  {
    name: 'ClassDojo Orange',
    primary: '25 95% 55%',
    accent: '45 100% 50%',
    ring: '25 95% 55%',
    sidebarBg: '25 95% 55%',
    sidebarBgLight: '25 95% 55%',
    sidebarFgLight: '0 0% 100%',
    sidebarFgDark: '0 0% 90%',
  },
  {
    name: 'ClassDojo Teal',
    primary: '175 80% 40%',
    accent: '200 85% 50%',
    ring: '175 80% 40%',
    sidebarBg: '175 80% 40%',
    sidebarBgLight: '175 80% 40%',
    sidebarFgLight: '0 0% 100%',
    sidebarFgDark: '0 0% 90%',
  },
  {
    name: 'ClassDojo Pink',
    primary: '340 80% 55%',
    accent: '280 70% 60%',
    ring: '340 80% 55%',
    sidebarBg: '340 80% 55%',
    sidebarBgLight: '340 80% 55%',
    sidebarFgLight: '0 0% 100%',
    sidebarFgDark: '0 0% 90%',
  },
  {
    name: 'ClassDojo Navy',
    primary: '220 70% 45%',
    accent: '199 89% 48%',
    ring: '220 70% 45%',
    sidebarBg: '220 70% 45%',
    sidebarBgLight: '220 70% 45%',
    sidebarFgLight: '0 0% 100%',
    sidebarFgDark: '0 0% 90%',
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
    root.style.setProperty('--sidebar-primary', isDark ? theme.primary : '0 0% 100%');
    root.style.setProperty('--sidebar-accent', `${theme.primary.split(' ')[0]} ${theme.primary.split(' ')[1]} 50% / 0.15`);
    root.style.setProperty('--sidebar-accent-foreground', isDark ? theme.primary : '0 0% 100%');
    root.style.setProperty('--sidebar-ring', isDark ? theme.primary : '0 0% 100%');
    
    localStorage.setItem('hr-theme-index', themeIndex.toString());
  }, [themeIndex, isDark]);

  useEffect(() => {
    const root = document.documentElement;
    const theme = themes[themeIndex];
    
    if (isDark) {
      root.classList.add('dark');
      root.style.setProperty('--sidebar-background', `${theme.primary.split(' ')[0]} 40% 12%`);
      root.style.setProperty('--sidebar-foreground', theme.sidebarFgDark);
      root.style.setProperty('--sidebar-border', `${theme.primary.split(' ')[0]} 30% 20%`);
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--sidebar-background', theme.sidebarBgLight);
      root.style.setProperty('--sidebar-foreground', theme.sidebarFgLight);
      root.style.setProperty('--sidebar-border', `${theme.primary.split(' ')[0]} 80% 35%`);
    }
    localStorage.setItem('hr-dark-mode', isDark.toString());
  }, [isDark, themeIndex]);

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
