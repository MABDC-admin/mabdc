import { Palette, Shuffle, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { useTheme, themes } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

export function ThemeSelector() {
  const { themeIndex, randomizeTheme, setTheme, isDark, toggleDarkMode } = useTheme();

  return (
    <div className="flex items-center gap-1">
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-9 w-9" 
        onClick={toggleDarkMode}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Palette className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {themes.map((theme, index) => (
            <DropdownMenuItem
              key={theme.name}
              onClick={() => setTheme(index)}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                themeIndex === index && "bg-accent/20"
              )}
            >
              <div className="flex gap-1">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ background: `hsl(${theme.primary})` }} 
                />
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ background: `hsl(${theme.accent})` }} 
                />
              </div>
              <span className="text-sm">{theme.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={randomizeTheme} className="flex items-center gap-3 cursor-pointer">
            <Shuffle className="h-4 w-4" />
            <span className="text-sm">Random Theme</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
