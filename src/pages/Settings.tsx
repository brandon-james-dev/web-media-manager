import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenu } from '@/components/ui/dropdown-menu';
import { useTheme } from "@/components/theme-provider"
import { Sun, Moon } from 'lucide-react';

export default function Settings() {
  const { setTheme } = useTheme()

  const [settings, setSettings] = useState({
    apiKey: '',
    autoSync: true,
    maxUploadSize: '100',
    theme: 'system',
  });

  const onThemeChange = (callback: (theme: "dark" | "light") => void): void => {
      if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return;
      }

      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

      callback(mediaQuery.matches ? "dark" : "light");

      const listener = (event: MediaQueryListEvent) => {
        callback(event.matches ? "dark" : "light");
      };

      if (typeof mediaQuery.addEventListener === "function") {
        mediaQuery.addEventListener("change", listener);
      } else {
        mediaQuery.addListener(listener);
      }
  }

  const getUserThemePreference = (): "dark" | "light" => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return "light";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  const showSun = (): boolean => {
    return settings.theme === 'light' || (settings.theme === 'system' && getUserThemePreference() === 'light');
  }

  const showMoon = (): boolean => {
    return settings.theme === 'dark' || (settings.theme === 'system' && getUserThemePreference() === 'dark');
  }

  const handleChange = (field: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log('Settings saved:', settings);
    setTheme(settings.theme as 'light' | 'dark' | 'system');
  };

  onThemeChange((theme) => {
    if (settings.theme === 'system') {
      setTheme(theme);
    }
  })

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <Card className="mb-6">
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Manage your application preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme">Theme</Label>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                    <Sun className={`h-[1.2rem] w-[1.2rem] rotate-0 transition-all ${showSun() ? 'scale-100' : 'scale-0 -rotate-90' }`} />
                    <Moon className={`absolute h-[1.2rem] w-[1.2rem] rotate-90 transition-all ${showMoon() ? 'scale-100 rotate-0' : 'scale-0'}`} />
                      <span className="sr-only">Toggle theme</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleChange('theme', 'light')}>Light</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChange('theme', 'dark')}>Dark</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleChange('theme', 'system')}>System</DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        Save Settings
      </Button>
    </div>
  );
}