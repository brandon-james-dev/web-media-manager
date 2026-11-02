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
import { Sun, Moon, ArrowLeft, X, Cpu, RefreshCw, Loader2 } from "lucide-react";
import { useTheme } from "@/hooks";
import { clearLibrary } from "@/core/scanning";
import { getSourcesStore } from "@/core/ports";
import { AddMusicSource } from "@/components/add-source/AddMusicSource";
import { Badge } from "@/components/ui/badge";
import { musicSourceStrategies } from "@/lib/sources";
import type { MusicSource } from "@/models";
import { toast } from "@/components/ui/toast";
import { AccentColorSelector } from "@/components/theme-provider";

export function Settings() {
  //#region State
  const { setTheme, theme, accentColor, setAccentColor } = useTheme();
  const [clearSongsDialogOpen, setClearSongsDialogOpen] = useState(false);
  const [deleteDirDialogOpen, setDeleteDirDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [directories, setDirectories] = useState<MusicSource[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    theme: theme || "system",
    accentColor: accentColor || "#3b82f6",
  });
  //#endregion

  //#region Global event listeners
  useEffect(() => {
    const store = getSourcesStore();
    store.getSources().then(setDirectories);

    const unsubSourceAdded = store.onSourceAdded(refresh);
    const unsubSourceDeleted = store.onSourceDeleted(refresh);
    const unsubSourcesCleared = store.onSourcesCleared(refresh);

    return () => {
      unsubSourceAdded();
      unsubSourceDeleted();
      unsubSourcesCleared();
    };
  }, []);
  //#endregion

  //#region Helpers

  /** Badge naming the type of a music source (on-device / subsonic / server). */
  /** Badge naming the type of a music source — resolved from the source
   *  strategy (each strategy owns its kind's presentation). */
  function SourceKindBadge({ source }: { source: MusicSource }) {
    const strategy = musicSourceStrategies.find((s) => s.kind === source.kind);
    if (strategy?.sourceKindBadge) return strategy.sourceKindBadge;
    return (
      <Badge variant="secondary">
        <Cpu />
        Server
      </Badge>
    );
  }

  /** Re-pull a source's library via its music source strategy. */
  function handleSyncSource(source: MusicSource) {
    if (syncingId) return;
    const strategy = musicSourceStrategies.find((s) => s.kind === source.kind);
    if (!strategy) return;
    setSyncingId(source.id);
    const handle = strategy.sync({ source });
    if (!handle) setSyncingId(null);
  }

  async function refresh(dir?: MusicSource) {
    const store = getSourcesStore();
    const all = await store.getSources();

    if (dir) {
      setDirectories(all.filter((d) => d.id !== dir.id));
    } else {
      setDirectories(all);
    }
  }
  //#endregion

  //#region Getters
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
  //#endregion

  //#region Interactivity handlers
  const handleChange = (field: string, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setTheme(settings.theme as "light" | "dark" | "system");
    setAccentColor(settings.accentColor);

    toast.add({
      type: "success",
      title: "Settings saved",
    });
  };

  const handleClearSongs = async () => {
    await clearLibrary();
    await refresh();
    setClearSongsDialogOpen(false);
    toast.add({
      type: "success",
      title: "All songs cleared from the database",
    });
  };

  const handleDeleteMusicSource = async () => {
    if (!pendingDeleteId) return;

    const source = (await getSourcesStore().getSources()).find(
      (s) => s.id === pendingDeleteId
    );
    if (!source) {
      setPendingDeleteId(null);
      setDeleteDirDialogOpen(false);
      return;
    }

    const strategy = musicSourceStrategies.find((s) => s.kind === source.kind);
    if (strategy) {
      await strategy.removeSource({
        source,
        onSourceRemoved: async () => {
          setPendingDeleteId(null);
          setDeleteDirDialogOpen(false);
        },
      });
      return;
    }

    // Fallback for an unregistered kind: plain removal (no kind cleanup).
    const store = getSourcesStore();
    await store.deleteSource(pendingDeleteId);
    setPendingDeleteId(null);
    setDeleteDirDialogOpen(false);
  };
  //#endregion

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
          <div className="flex items-center justify-between">
            <Label>Accent Color</Label>
          </div>

          <AccentColorSelector
            value={settings.accentColor}
            onChange={(color) => handleChange("accentColor", color)}
          />

          <div>
            <Button onClick={handleSave} className="w-full">
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>
            Manage all song data and the sources used for scanning and
            importing music
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between">
            <label>Sources</label>
            <AddMusicSource compact onSourceAdded={refresh} />
          </div>
          {directories.length === 0 && (
            <p className="text-sm text-muted-foreground my-2">
              No music sources added yet. Add an on-device folder or a
              Subsonic server.
            </p>
          )}

          <ScrollArea className="max-h-75 my-2">
            <div className="border rounded-sm">
              {directories.map((dir) => (
                <Item
                  key={dir.id}
                  className="flex items-center justify-between p-0"
                >
                  <div className="flex items-center gap-2 pl-2 overflow-hidden">
                    <span className="truncate">{dir.name}</span>
                    <SourceKindBadge source={dir} />
                  </div>

                  <div className="flex items-center gap-1">
                    {musicSourceStrategies.some((s) => s.kind === dir.kind) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Sync ${dir.name}`}
                        disabled={syncingId === dir.id}
                        onClick={() => handleSyncSource(dir)}
                      >
                        {syncingId === dir.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                    )}

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
                  </div>
                </Item>
              ))}
            </div>
          </ScrollArea>

          <Dialog
            open={deleteDirDialogOpen}
            onOpenChange={setDeleteDirDialogOpen}
          >
            <DialogContent className="select-none w-lg">
              <DialogHeader>
                <DialogTitle>Remove Music Source</DialogTitle>
                <DialogDescription>
                  This will remove the source from your library. Songs
                  already imported will remain.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <DialogClose
                  render={<Button variant="outline">Cancel</Button>}
                ></DialogClose>

                <Button variant="destructive" onClick={handleDeleteMusicSource}>
                  Remove Music Source
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

              <DialogContent className="select-none w-lg">
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
                  <Button variant="destructive" onClick={handleClearSongs}>
                    Clear
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
