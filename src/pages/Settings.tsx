import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Sun, Moon, Monitor, ArrowLeft, X, Cpu, RefreshCw, Loader2, Pencil, PackagePlus, SlidersHorizontal } from "lucide-react";
import { useTheme, useVisualizer } from "@/hooks";
import { clearLibrary } from "@/core/scanning";
import { clearSubsonicSecrets } from "@/lib/sources/subsonic/subsonicSecrets";
import { getSourcesStore } from "@/core/ports";
import { AddMusicSource } from "@/components/add-source/AddMusicSource";
import { Badge } from "@/components/ui/badge";
import { musicSourceStrategies } from "@/lib/sources";
import { useIsCompact } from "@/lib/hooks/useIsMobile";
import { cn } from "cn"
import { sourceKindBadge } from "@/lib/sources/source-ui";
import type { MusicSource } from "@/models";
import { toast } from "@/components/ui/toast";
import { AccentColorSelector } from "@/components/theme-provider";
import {
  PluginManagerDialog,
  VisualizerSelector,
  VisualizerSettings,
} from "@/components/visualizer";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function Settings() {
  //#region State
  const isCompact = useIsCompact();
  const { setTheme, theme, accentColor, setAccentColor } = useTheme();
  const { setManagerOpen, setSettingsOpen } = useVisualizer();
  const [clearSongsDialogOpen, setClearSongsDialogOpen] = useState(false);
  const [deleteDirDialogOpen, setDeleteDirDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<MusicSource | null>(null);
  const [sources, setDirectories] = useState<MusicSource[]>([]);
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
   *  kind's presentation registry (each kind owns its badge). */
  function SourceKindBadge({ source }: { source: MusicSource }) {
    const badge = sourceKindBadge(source.kind);
    if (badge) return badge;
    return (
      <Badge variant="secondary">
        <Cpu />
        Server
      </Badge>
    );
  }

  /** Re-pull a source's library via its music source strategy. */
  async function handleSyncSource(source: MusicSource) {
    if (syncingId) return;
    const strategy = musicSourceStrategies.find((s) => s.kind === source.kind);
    if (!strategy) return;
    setSyncingId(source.id);
    const handle = await strategy.sync({ source });
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
    await clearSubsonicSecrets();
    await refresh();
    setClearSongsDialogOpen(false);
    toast.add({
      type: "success",
      title: "All songs cleared from the database",
    });
  };

  const handleDeleteMusicSource = async () => {
    if (!pendingDeleteId) return;

    const source = (await getSourcesStore().getSources()).find((s) => s.id === pendingDeleteId);
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
    <div className="h-full overflow-y-auto select-none">
      <div className="max-w-2xl mx-auto p-2 md:p-8 space-y-2 md:space-y-8">
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
          <div className="space-y-3">
            <Label>Theme</Label>

            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
                <Button
                  key={value}
                  variant="outline"
                  aria-pressed={settings.theme === value}
                  className={cn(
                    settings.theme === value &&
                      "border-primary bg-primary/15 text-foreground hover:bg-primary/20 dark:border-primary dark:bg-primary/25 dark:hover:bg-primary/30"
                  )}
                  onClick={() => handleChange("theme", value)}
                >
                  <Icon />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Accent Color</Label>

            <AccentColorSelector
              value={settings.accentColor}
              onChange={(color) => handleChange("accentColor", color)}
            />
          </div>

          <div>
            <Button onClick={handleSave} className="w-full">
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Visualizers</CardTitle>
          <CardDescription>
            Install visualizer plugins and configure the active one
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <VisualizerSelector variant="list" className="max-h-80" />

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setManagerOpen(true)}>
              <PackagePlus />
              Install or manage plugins
            </Button>
            <Button variant="outline" onClick={() => setSettingsOpen(true)}>
              <SlidersHorizontal />
              Visualizer settings
            </Button>
          </div>

          <PluginManagerDialog />
          <VisualizerSettings />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data</CardTitle>
          <CardDescription>
            Manage all song data and the sources used for scanning and importing music
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Sources</Label>
          </div>
          {sources.length === 0 && (
            <p className="text-sm text-muted-foreground my-2">
              No music sources added yet. Add an on-device folder or a Subsonic server.
            </p>
          )}

          <ScrollArea className="max-h-75 my-2">
            <div className="border rounded-sm flex flex-col gap-0.5">
              {sources.map((dir) => (
                // Desktop: one line (name + badge left, actions right).
                // Mobile: stacks — the name gets the first line and the
                // badge + wider touch buttons sit below it.
                <Item
                  key={dir.id}
                  className={cn(
                    "p-0",
                    isCompact
                      ? "flex flex-col items-stretch gap-1.5 py-2"
                      : "flex items-center justify-between gap-1"
                  )}
                >
                  <div className="flex items-center gap-2 pl-2 min-w-0 overflow-hidden">
                    <span className="truncate">{dir.name}</span>
                    {!isCompact && <SourceKindBadge source={dir} />}
                  </div>

                  <div className={cn("flex items-center gap-1 shrink-0", isCompact ? "pl-1" : undefined)}>
                    {isCompact && <SourceKindBadge source={dir} />}
                    {musicSourceStrategies.some((s) => s.kind === dir.kind && s.updateSource) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={isCompact ? "w-auto px-3" : undefined}
                        aria-label={`Edit ${dir.name}`}
                        onClick={() => setEditingSource(dir)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}

                    {musicSourceStrategies.some((s) => s.kind === dir.kind) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className={isCompact ? "w-auto px-3" : undefined}
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
                      className={isCompact ? "w-auto px-3" : undefined}
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

              <AddMusicSource onSourceAdded={refresh} />
              {editingSource && (
                <AddMusicSource
                  compact
                  editingSource={editingSource}
                  onSourceAdded={() => {
                    setEditingSource(null);
                    void refresh();
                  }}
                  onClose={() => setEditingSource(null)}
                />
              )}
            </div>
          </ScrollArea>

          <Dialog open={deleteDirDialogOpen} onOpenChange={setDeleteDirDialogOpen}>
            <DialogContent className="select-none w-lg">
              <DialogHeader>
                <DialogTitle>Remove Music Source</DialogTitle>
                <DialogDescription>
                  This will remove the source from your library. Songs already imported will remain.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <DialogClose render={<Button variant="outline">Cancel</Button>}></DialogClose>

                <Button variant="destructive" onClick={handleDeleteMusicSource}>
                  Remove Music Source
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="flex items-center justify-between">
            <Label htmlFor="clearDb">Clear Song Database</Label>

            <Dialog open={clearSongsDialogOpen} onOpenChange={setClearSongsDialogOpen}>
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
                    This action cannot be undone. This will remove all song data managed by Web
                    Media Manager.
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                  <DialogClose render={<Button variant="outline">Cancel</Button>}></DialogClose>
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
    </div>
  );
}
