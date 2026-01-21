import { useState, useEffect } from 'react';

export const themes = [
  {
    name: 'Tropical Beach',
    primary: '174 60% 42%',
    accent: '38 85% 55%',
    ring: '174 60% 42%',
    sidebarBg: '180 30% 6%',
    sidebarBgLight: '174 35% 96%',
  },
  {
    name: 'Purple Pink',
    primary: '262 83% 58%',
    accent: '339 90% 51%',
    ring: '262 83% 58%',
    sidebarBg: '262 50% 12%',
    sidebarBgLight: '262 30% 96%',
  },
  {
    name: 'Ocean Blue',
    primary: '217 91% 60%',
    accent: '172 66% 50%',
    ring: '217 91% 60%',
    sidebarBg: '217 50% 12%',
    sidebarBgLight: '217 30% 96%',
  },
  {
    name: 'Forest Green',
    primary: '158 64% 42%',
    accent: '45 93% 47%',
    ring: '158 64% 42%',
    sidebarBg: '158 40% 10%',
    sidebarBgLight: '158 25% 96%',
  },
  {
    name: 'Sunset Orange',
    primary: '24 95% 53%',
    accent: '340 82% 52%',
    ring: '24 95% 53%',
    sidebarBg: '24 45% 12%',
    sidebarBgLight: '24 30% 96%',
  },
  {
    name: 'Midnight Blue',
    primary: '230 70% 50%',
    accent: '260 60% 60%',
    ring: '230 70% 50%',
    sidebarBg: '230 50% 8%',
    sidebarBgLight: '230 25% 95%',
  },
  {
    name: 'Rose Gold',
    primary: '350 60% 60%',
    accent: '30 50% 55%',
    ring: '350 60% 60%',
    sidebarBg: '350 35% 12%',
    sidebarBgLight: '350 30% 96%',
  },
  {
    name: 'Slate Gray',
    primary: '215 20% 50%',
    accent: '200 30% 45%',
    ring: '215 20% 50%',
    sidebarBg: '215 25% 10%',
    sidebarBgLight: '215 15% 95%',
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
    const theme = themes[themeIndex];
    
    if (isDark) {
      root.classList.add('dark');
      root.style.setProperty('--sidebar-background', theme.sidebarBg);
      root.style.setProperty('--sidebar-foreground', '0 0% 95%');
      root.style.setProperty('--sidebar-border', `${theme.primary.split(' ')[0]} 20% 20%`);
    } else {
      root.classList.remove('dark');
      root.style.setProperty('--sidebar-background', theme.sidebarBgLight);
      root.style.setProperty('--sidebar-foreground', '0 0% 15%');
      root.style.setProperty('--sidebar-border', `${theme.primary.split(' ')[0]} 20% 85%`);
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
