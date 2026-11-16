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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Item } from "@/components/ui/item";
import { Sun, Moon, Monitor, ArrowLeft, X, Cpu, RefreshCw, Loader2, Pencil, PackagePlus } from "lucide-react";
import { useTheme, useVisualizer } from "@/hooks";
import {
  AUTO_LANGUAGE,
  useTranslation,
  type LanguagePreference,
} from "@/i18n";
import { clearLibrary } from "@/core/scanning";
import { clearSubsonicSecrets } from "@/lib/sources/subsonic/subsonicSecrets";
import { runJobWithProgress } from "@/lib/jobs/runJobWithProgress";
import type { SourceRemoveResult } from "@/workers/shared/runSourceRemove";
import { getSourcesStore } from "@/core/ports";
import { AddMusicSource } from "@/components/add-source/AddMusicSource";
import { Badge } from "@/components/ui/badge";
import { musicSourceStrategies } from "@/lib/sources";
import { runSourceRefresh } from "@/lib/sources/runSourceRefresh";
import { useIsCompact, useIsTv } from "@/lib/hooks/useIsMobile";
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
  { value: "light", labelKey: "settings.themeLight", icon: Sun },
  { value: "dark", labelKey: "settings.themeDark", icon: Moon },
  { value: "system", labelKey: "settings.themeSystem", icon: Monitor },
] as const;

export function Settings() {
  //#region State
  const isCompact = useIsCompact();
  const isTv = useIsTv();
  const { setTheme, theme, accentColor, setAccentColor } = useTheme();
  const { setManagerOpen, setSettingsOpen } = useVisualizer();
  const { t, preference, detectedLanguage, changeLanguage, languages } =
    useTranslation();
  const [settingsPluginId, setSettingsPluginId] = useState<string>();
  const [clearSongsDialogOpen, setClearSongsDialogOpen] = useState(false);
  const [deleteDirDialogOpen, setDeleteDirDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingSource, setEditingSource] = useState<MusicSource | null>(null);
  const [sources, setDirectories] = useState<MusicSource[]>([]);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    theme: theme || "system",
    accentColor: accentColor || "#3b82f6",
    language: preference as LanguagePreference,
  });
  const languageOptions = [
    {
      value: AUTO_LANGUAGE as LanguagePreference,
      label: t("settings.languageAuto", [
        languages.find((entry) => entry.language === detectedLanguage)
          ?.nativeName ?? detectedLanguage,
      ]),
    },
    ...languages
      .filter((entry) => entry.language !== detectedLanguage)
      .map((entry) => ({
        value: entry.language as LanguagePreference,
        label: entry.nativeName,
      })),
  ];
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
        {t("source.kindServer")}
      </Badge>
    );
  }

  /** Re-pull a source's library via its music source strategy. */
  async function handleSyncSource(source: MusicSource) {
    const strategy = musicSourceStrategies.find((s) => s.kind === source.kind);
    if (!strategy) {
      console.warn(
        `[Settings] No sync strategy for source "${source.name}" (kind=${source.kind})`
      );
      return;
    }

    await runSourceRefresh({
      syncingId,
      sourceId: source.id,
      sourceName: source.name,
      onStart: setSyncingId,
      onFinish: () => setSyncingId(null),
      refresh: async () => {
        const handle = await strategy.sync({ source });
        if (handle) setSyncingId(null);
      },
    });
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
    changeLanguage(settings.language);

    toast.add({
      type: "success",
      title: t("settings.saved"),
    });
  };

  const handleClearSongs = async () => {
    await clearLibrary();
    await clearSubsonicSecrets();
    await refresh();
    setClearSongsDialogOpen(false);
    toast.add({
      type: "success",
      title: t("settings.songsCleared"),
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

    // The songs and the source record are deleted by a worker job so a large
    // library reports progress instead of freezing the page. The kind's own
    // cleanup (stored secrets, mirrored playlists) runs afterwards, since it
    // needs the source object that the job removes.
    try {
      await runJobWithProgress<SourceRemoveResult>({
        type: "Source Remove",
        payload: { sourceId: source.id },
        kind: "Source Remove",
        title: t("source.removing"),
        bulk: true,
        readResult: (raw) => {
          const value = raw as Partial<SourceRemoveResult> | undefined;

          return {
            cancelled: value?.cancelled ?? false,
            removed: value?.removed ?? 0,
          };
        },
      });
    } catch (error) {
      toast.add({
        type: "error",
        title: t("source.removeFailed"),
        description: String(error),
      });
      return;
    }

    const strategy = musicSourceStrategies.find((s) => s.kind === source.kind);
    await strategy?.cleanupRemovedSource?.(source);

    setPendingDeleteId(null);
    setDeleteDirDialogOpen(false);
  };
  //#endregion

  return (
    <div className="h-full overflow-y-auto select-none">
      <div className="max-w-2xl mx-auto p-2 md:p-8 space-y-2 md:space-y-4">
      <div className="flex gap-3 items-center">
        {/* The anchor is not a stop: the button inside it is, so the focus ring
            follows the button's rounded corners instead of the link's square
            box. On a television the remote's Back key already goes back, so
            the on-screen arrow is skipped and the first stop is the settings
            card below. */}
        <Link to="/" tabIndex={-1}>
          <Button variant="outline" tabIndex={isTv ? -1 : 0}>
            <ArrowLeft />
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">{t("settings.pageTitle")}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.title")}</CardTitle>
          <CardDescription>{t("settings.description")}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>{t("settings.theme")}</Label>

            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map(({ value, labelKey, icon: Icon }) => (
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
                  {t(labelKey)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>{t("settings.accentColor")}</Label>

            <AccentColorSelector
              value={settings.accentColor}
              onChange={(color) => handleChange("accentColor", color)}
            />
          </div>

          <div className="space-y-3">
            <Label>{t("settings.language")}</Label>

            <Select
              value={settings.language}
              items={languageOptions}
              onValueChange={(value) => {
                const next = languageOptions.find(
                  (option) => option.value === value
                );
                if (next) handleChange("language", next.value);
              }}
            >
              <SelectTrigger
                className="w-full"
                aria-label={t("settings.language")}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Button onClick={handleSave} className="w-full">
              {t("settings.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.visualizers")}</CardTitle>
          <CardDescription>
            {t("settings.visualizersDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <VisualizerSelector
            variant="list"
            className="max-h-80"
            onConfigure={(pluginId) => {
              setSettingsPluginId(pluginId);
              setSettingsOpen(true);
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setManagerOpen(true)}>
              <PackagePlus />
              {t("settings.installPlugins")}
            </Button>
          </div>

          <PluginManagerDialog />
          <VisualizerSettings pluginId={settingsPluginId} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.data")}</CardTitle>
          <CardDescription>
            {t("settings.dataDescription")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between">
            <Label>{t("library.sources")}</Label>
          </div>
          {sources.length === 0 && (
            <p className="text-sm text-muted-foreground my-2">
              {t("source.noneAdded")}
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
                        aria-label={t("source.editNamed", [dir.name])}
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
                        aria-label={t("source.syncNamed", [dir.name])}
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
                <DialogTitle>{t("source.removeTitle")}</DialogTitle>
                <DialogDescription>
                  {t("source.removeDescription")}
                </DialogDescription>
              </DialogHeader>

              <DialogFooter>
                <DialogClose
                  render={
                    <Button variant="outline">{t("common.cancel")}</Button>
                  }
                ></DialogClose>

                <Button variant="destructive" onClick={handleDeleteMusicSource}>
                  {t("source.removeTitle")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <div className="flex items-center justify-between">
            <Label htmlFor="clearDb">{t("settings.clearDatabase")}</Label>

            <Dialog open={clearSongsDialogOpen} onOpenChange={setClearSongsDialogOpen}>
              <DialogTrigger
                render={
                  <Button id="clearDb" variant="destructive">
                    {t("common.clear")}
                  </Button>
                }
              ></DialogTrigger>

              <DialogContent className="select-none w-lg">
                <DialogHeader>
                  <DialogTitle>{t("settings.clearDatabaseTitle")}</DialogTitle>
                  <DialogDescription>
                    {t("settings.clearDatabaseDescription")}
                  </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                  <DialogClose
                    render={
                      <Button variant="outline">{t("common.cancel")}</Button>
                    }
                  ></DialogClose>
                  <Button variant="destructive" onClick={handleClearSongs}>
                    {t("common.clear")}
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
