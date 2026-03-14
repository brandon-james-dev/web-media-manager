import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenu } from '@/components/ui/dropdown-menu';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useTheme } from "@/components/theme-provider"
import { Sun, Moon, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { clearDb } from '@/hooks/songUpdateHooks';
import { toast } from 'sonner';

export default function Settings() {
  const { setTheme, theme } = useTheme();
  const [clearSongsDialogOpen, setClearSongsDialogOpen] = useState(false);

  const [settings, setSettings] = useState({
    theme: theme || 'system',
  });

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

  const clearSongs = async () => {
    await clearDb();
    setClearSongsDialogOpen(false);
    toast.success('All songs cleared from the database');
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="flex gap-3">
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-8 pointer-events-none">Settings and Data</h1>
      </div>
      <Card className="mb-6">
          <CardHeader className='pointer-events-none'>
            <CardTitle>Settings and Data</CardTitle>
            <CardDescription>Manage your application preferences and data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className='flex items-center justify-between'>
              <Label htmlFor='clearDb'>Clear Song Database</Label>
              <Dialog open={clearSongsDialogOpen} onOpenChange={setClearSongsDialogOpen}>
                <DialogTrigger asChild>
                  <Button id='clearDb'>Clear</Button> 
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                      This action cannot be undone. This will remove all song data from this machine.
                    </DialogDescription>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button onClick={clearSongs}>Clear</Button>
                    </DialogFooter>
                  </DialogHeader>
                </DialogContent>
              </Dialog>
            </div>
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