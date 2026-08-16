import { useEffect, useState } from "react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenu,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Item } from "@/components/ui/item";

import { Sun, Moon, ArrowLeft, X } from "lucide-react";

import { useTheme } from "@/components/theme-provider";

import { clearDb, getMetadataStore } from "@/lib";
import type { Directory } from "@/models";
import type { CombinedMetadataStore } from "@/lib/CombinedMetadataStore";
import { toast } from "@/components/ui/toast";

export default function Settings() {
  const { setTheme, theme } = useTheme();

  const [clearSongsDialogOpen, setClearSongsDialogOpen] = useState(false);
  const [deleteDirDialogOpen, setDeleteDirDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [directories, setDirectories] = useState<Directory[]>([]);
  const [settings, setSettings] = useState({
    theme: theme || "system",
  });

  useEffect(() => {
    const store = getMetadataStore() as CombinedMetadataStore;
    store.getDirectories().then(setDirectories);

    const unsubDirDeleted = store.onDirectoryDeleted(refresh);
    const unsubDirCleared = store.onDirectoriesCleared(refresh);

    return () => {
      unsubDirDeleted();
      unsubDirCleared();
    };
  }, []);

  async function refresh(dir?: Directory) {
    const store = getMetadataStore() as CombinedMetadataStore;
    const all = await store.getDirectories();

    if (dir) {
      setDirectories(all.filter((d) => d.id !== dir.id));
    } else {
      setDirectories(all);
    }
  }

  const clearSongs = async () => {
    await clearDb();
    await refresh();
    setClearSongsDialogOpen(false);
    toast.add({
      type: "success",
      title: "All songs cleared from the database",
    });
  };

  const deleteDirectory = async () => {
    if (!pendingDeleteId) return;

    const store = getMetadataStore() as CombinedMetadataStore;
    await store.deleteDirectory(pendingDeleteId);

    setPendingDeleteId(null);
    setDeleteDirDialogOpen(false);
  };

  const getUserThemePreference = (): "dark" | "light" => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return "light";
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  };

  const showSun = () =>
    settings.theme === "light" ||
    (settings.theme === "system" && getUserThemePreference() === "light");

  const showMoon = () =>
    settings.theme === "dark" ||
    (settings.theme === "system" && getUserThemePreference() === "dark");

  const handleChange = (field: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setTheme(settings.theme as "light" | "dark" | "system");
    toast.add({
      type: "success",
      title: "Settings saved",
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-8 select-none">
      <div className="flex gap-3 items-center">
        <Link to="/">
          <Button variant="outline">
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Settings and Data</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Manage your application preferences</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="theme">Theme</Label>

            <DropdownMenu>
              <DropdownMenuTrigger
                id="theme"
                render={
                  <Button variant="outline" size="icon">
                    <Sun
                      className={`h-[1.2rem] w-[1.2rem] transition-all ${showSun() ? "scale-100 rotate-0" : "scale-0 -rotate-90"}`}
                    />
                    <Moon
                      className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${showMoon() ? "scale-100 rotate-0" : "scale-0 rotate-90"}`}
                    />
                  </Button>
                }
              ></DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleChange("theme", "light")}
                >
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleChange("theme", "dark")}>
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleChange("theme", "system")}
                >
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>
            Manage all song data and the folders used for scanning and importing
            music
          </CardDescription>
        </CardHeader>

        <CardContent>
          <label>Directories</label>
          {directories.length === 0 && (
            <p className="text-sm text-muted-foreground my-2">
              No directories added.
            </p>
          )}

          <ScrollArea className="max-h-75 my-2">
            <div className="border rounded-sm">
              {directories.map((dir) => (
                <Item
                  key={dir.id}
                  className="flex items-center justify-between p-0"
                >
                  <span className="pl-2">{dir.directoryName}</span>

                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => {
                      setPendingDeleteId(dir.id);
                      setDeleteDirDialogOpen(true);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </Item>
              ))}
            </div>
          </ScrollArea>

          <Dialog
            open={deleteDirDialogOpen}
            onOpenChange={setDeleteDirDialogOpen}
          >
            <DialogContent className="select-none">
              <DialogHeader>
                <DialogTitle>Remove Directory</DialogTitle>
                <DialogDescription>
                  This will remove the directory from your library. Songs
                  already imported will remain.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <DialogClose
                  render={<Button variant="outline">Cancel</Button>}
                ></DialogClose>

                <Button variant="destructive" onClick={deleteDirectory}>
                  Remove Directory
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="flex items-center justify-between">
            <Label htmlFor="clearDb">Clear Song Database</Label>

            <Dialog
              open={clearSongsDialogOpen}
              onOpenChange={setClearSongsDialogOpen}
            >
              <DialogTrigger
                render={
                  <Button id="clearDb" variant="destructive">
                    Clear
                  </Button>
                }
              ></DialogTrigger>

              <DialogContent className="select-none">
                <DialogHeader>
                  <DialogTitle>Are you absolutely sure?</DialogTitle>
                  <DialogDescription>
                    This action cannot be undone. This will remove all song data
                    from this machine.
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                  <DialogClose
                    render={<Button variant="outline">Cancel</Button>}
                  ></DialogClose>
                  <Button variant="destructive" onClick={clearSongs}>
                    Clear
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">
        Save Settings
      </Button>
    </div>
  );
}
