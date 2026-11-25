import {
  AlertTriangle,
  CheckCircle2,
  FileArchive,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "cn";

import {
  PluginInstallError,
  type InstallPluginResult,
  type ManifestIssue,
  type PluginKind,
} from "@/core/plugins";
import { getRuntimeDescriptor } from "@/core/visualizers";
import {
  useInstallPlugin,
  useInstalledPlugins,
  useRemovePlugin,
  useVisualizer,
} from "@/hooks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "@/i18n";
import type { WmmResourceKey } from "@/i18n/resources";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { VisualizerSelector } from "@/components/visualizer";
import { PluginThumbnail } from "./PluginThumbnail";
import type { PluginManagerDialogProps } from "./PluginManagerDialogProps";

/** Dialog title, summary, submit and remove label per plugin kind. */
const PLUGIN_DIALOG_COPY: Record<
  PluginKind,
  {
    title: WmmResourceKey;
    description: WmmResourceKey;
    install: WmmResourceKey;
    remove: WmmResourceKey;
  }
> = {
  visualizer: {
    title: "visualizer.pluginsTitle",
    description: "visualizer.pluginsDescription",
    install: "visualizer.installPlugin",
    remove: "visualizer.removePlugin",
  },
  lyrics: {
    title: "settings.lyricsPluginsTitle",
    description: "settings.lyricsPluginsDescription",
    install: "settings.installLyricsPlugin",
    remove: "settings.removeLyricsPlugin",
  },
  metadata: {
    title: "settings.metadataPluginsTitle",
    description: "settings.metadataPluginsDescription",
    install: "settings.installMetadataPlugin",
    remove: "settings.removeMetadataPlugin",
  },
  source: {
    title: "settings.sourcePluginsTitle",
    description: "settings.sourcePluginsDescription",
    install: "settings.installSourcePlugin",
    remove: "settings.removeSourcePlugin",
  },
  theme: {
    title: "settings.sourcePluginsTitle",
    description: "settings.sourcePluginsDescription",
    install: "settings.installSourcePlugin",
    remove: "settings.removePlugin",
  },
  layout: {
    title: "settings.sourcePluginsTitle",
    description: "settings.sourcePluginsDescription",
    install: "settings.installSourcePlugin",
    remove: "settings.removePlugin",
  },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function IssueList({ issues }: { issues: ManifestIssue[] }) {
  if (issues.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs">
      {issues.map((issue, index) => (
        <li
          key={`${issue.code}-${index}`}
          className={cn(
            "flex items-start gap-1.5",
            issue.severity === "error"
              ? "text-destructive"
              : "text-muted-foreground"
          )}
        >
          <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          <span>
            {issue.field ? `${issue.field}: ` : ""}
            {issue.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Install, inspect and remove visualizer plugins.
 *
 * Install errors are shown as the manifest issues the manager produced, so a
 * rejected ZIP explains exactly which field or file failed validation.
 */
export function PluginManagerDialog({
  open,
  onOpenChange,
  className,
  kind = "visualizer",
}: PluginManagerDialogProps) {
  const { t } = useTranslation();
  const {
    managerOpen,
    setManagerOpen,
    activePluginId,
    setActivePluginId,
  } = useVisualizer();
  const { data: installed } = useInstalledPlugins();
  const plugins = installed?.filter((plugin) => plugin.kind === kind);
  const install = useInstallPlugin();
  const remove = useRemovePlugin();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [issues, setIssues] = useState<ManifestIssue[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [examplePending, setExamplePending] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isOpen = open ?? managerOpen;
  const setOpen = onOpenChange ?? setManagerOpen;

  /** Close the dialog and drop the previous install's outcome. */
  function handleOpenChange(next: boolean) {
    if (!next) {
      setFile(null);
      setReplace(false);
      setIssues([]);
      setSuccess(null);
      setConfirmRemoveId(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
    setOpen(next);
  }
  const active =
    kind === "visualizer"
      ? plugins?.find((plugin) => plugin.id === activePluginId)
      : (plugins?.find((plugin) => plugin.id === selectedId) ?? plugins?.[0]);
  const activeRuntime =
    active?.runtime !== undefined
      ? getRuntimeDescriptor(active.runtime)
      : undefined;

  function handleInstalled(result: InstallPluginResult) {
    setSuccess(
      t("visualizer.installedNamed", [
        result.plugin.name,
        result.plugin.version,
      ])
    );
    setFile(null);
    setReplace(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (kind === "visualizer") {
      setActivePluginId(result.plugin.id);
    }
  }

  function handleInstallError(error: Error) {
    const issues: ManifestIssue[] =
      error instanceof PluginInstallError
        ? error.issues
        : [
          {
            code: "archive-invalid",
            severity: "error",
            message: error.message,
          },
        ];
    setIssues(issues);
    // The inline list is only visible while this dialog is open, so the
    // failure also goes out as a notification.
    toast.add({
      type: "error",
      title: t("visualizer.installFailed"),
      description: issues[0]?.message ?? error.message,
    });
  }

  function handleInstall() {
    if (!file) {
      return;
    }

    setIssues([]);
    setSuccess(null);
    install.mutate(
      { file, replace, expectKind: kind },
      { onSuccess: handleInstalled, onError: handleInstallError }
    );
  }

  async function handleInstallExample() {
    setIssues([]);
    setSuccess(null);
    setExamplePending(true);

    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}plugins/aurora.zip`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error(t("visualizer.exampleNotFound", [response.status]));
      }

      const blob = await response.blob();
      const example = new File([blob], "aurora.zip", {
        type: "application/zip",
      });
      install.mutate(
        { file: example, replace: true },
        { onSuccess: handleInstalled, onError: handleInstallError }
      );
    } catch (error) {
      setIssues([
        {
          code: "archive-invalid",
          severity: "error",
          message: error instanceof Error ? error.message : String(error),
        },
      ]);
    } finally {
      setExamplePending(false);
    }
  }

  function handleRemove(pluginId: string) {
    remove.mutate(pluginId, {
      onSuccess: () => {
        setConfirmRemoveId(null);
        if (kind === "visualizer" && activePluginId === pluginId) {
          setActivePluginId(null);
        }
      },
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className={cn("sm:max-w-2xl", className)}>
        <DialogHeader>
          <DialogTitle>{t(PLUGIN_DIALOG_COPY[kind].title)}</DialogTitle>
          <DialogDescription>
            {t(PLUGIN_DIALOG_COPY[kind].description)}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="installed">
          <TabsList>
            <TabsTrigger value="installed">
              {t("visualizer.installed")}
            </TabsTrigger>
            <TabsTrigger value="install">{t("visualizer.install")}</TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="min-h-0">
            <div className="flex flex-col gap-3 md:flex-row">
              {kind === "visualizer" ? (
                <VisualizerSelector
                  variant="list"
                  className="min-h-64 flex-1"
                />
              ) : (
                <ScrollArea className="min-h-64 flex-1 rounded-lg border">
                  <div className="flex flex-col gap-1 p-2">
                    {plugins?.length === 0 && (
                      <p className="p-2 text-sm text-muted-foreground">
                        {t("settings.noLyricsPluginsInstalled")}
                      </p>
                    )}
                    {plugins?.map((plugin) => (
                      <button
                        key={plugin.id}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 rounded-md border px-3 py-2 text-left text-sm",
                          active?.id === plugin.id
                            ? "border-accent/30 bg-accent/10"
                            : "hover:border-accent/50 hover:bg-accent/30"
                        )}
                        onClick={() => setSelectedId(plugin.id)}
                      >
                        <PluginThumbnail pluginId={plugin.id} />
                        <span className="min-w-0 flex-1 truncate">
                          {plugin.name}
                        </span>
                        <Badge variant="outline">{plugin.version}</Badge>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <div className="flex w-full shrink-0 flex-col gap-2 rounded-lg border p-3 md:w-64">
                {active ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {active.name}
                      </span>
                      <Badge variant="outline">{active.version}</Badge>
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <dt>{t("visualizer.fieldId")}</dt>
                      <dd className="truncate">{active.id}</dd>
                      {active.runtime && (
                        <>
                          <dt>{t("visualizer.fieldRuntime")}</dt>
                          <dd>
                            {activeRuntime
                              ? t(activeRuntime.labelKey)
                              : active.runtime}
                          </dd>
                        </>
                      )}
                      <dt>{t("visualizer.fieldAuthor")}</dt>
                      <dd className="truncate">
                        {active.author ?? t("common.unknown")}
                      </dd>
                      {active.entryPath && (
                        <>
                          <dt>{t("visualizer.fieldEntry")}</dt>
                          <dd className="truncate">{active.entryPath}</dd>
                        </>
                      )}
                      <dt>{t("visualizer.fieldFiles")}</dt>
                      <dd>{active.fileCount}</dd>
                      <dt>{t("visualizer.fieldSize")}</dt>
                      <dd>{formatBytes(active.sizeBytes)}</dd>
                      <dt>{t("visualizer.fieldInstalled")}</dt>
                      <dd>
                        {new Date(active.installedAt).toLocaleDateString()}
                      </dd>
                    </dl>
                    {active.description && (
                      <p className="text-xs text-muted-foreground">
                        {active.description}
                      </p>
                    )}
                    <Separator />
                    {confirmRemoveId === active.id ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-destructive">
                          {t("visualizer.removeConfirm", [active.name])}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={remove.isPending}
                            onClick={() => handleRemove(active.id)}
                          >
                            {t("common.remove")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmRemoveId(null)}
                          >
                            {t("common.cancel")}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmRemoveId(active.id)}
                      >
                        <Trash2 />
                        {t(PLUGIN_DIALOG_COPY[kind].remove)}
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("visualizer.selectToSeeDetails")}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="install">
            <ScrollArea className="max-h-[60vh]">
              <div className="flex flex-col gap-3 pr-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="plugin-zip">{t("visualizer.pluginZip")}</Label>
                  <label
                    htmlFor="plugin-zip"
                    className={cn(
                      "group flex cursor-pointer items-center gap-3 rounded-xl border border-dashed p-3 transition-colors",
                      "hover:border-ring hover:bg-accent/40",
                      "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:text-foreground">
                      <FileArchive />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {file ? file.name : t("visualizer.chooseZip")}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {file
                          ? formatBytes(file.size)
                          : t("visualizer.zipHint")}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium">
                      {t("visualizer.browse")}
                    </span>
                    <input
                      id="plugin-zip"
                      ref={fileInputRef}
                      type="file"
                      accept=".zip,application/zip"
                      className="sr-only"
                      onChange={(event) => {
                        setFile(event.target.files?.[0] ?? null);
                        setIssues([]);
                        setSuccess(null);
                      }}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border p-2">
                  <div className="min-w-0">
                    <Label htmlFor="plugin-replace">
                      {t("visualizer.updateIfInstalled")}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {t("visualizer.updateIfInstalledHint")}
                    </p>
                  </div>
                  <Switch
                    id="plugin-replace"
                    checked={replace}
                    onCheckedChange={setReplace}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    disabled={!file || install.isPending}
                    onClick={handleInstall}
                  >
                    <Upload />
                    {install.isPending
                      ? t("visualizer.installing")
                      : t(PLUGIN_DIALOG_COPY[kind].install)}
                  </Button>
                  {kind === "visualizer" && (
                    <Button
                      variant="outline"
                      disabled={examplePending || install.isPending}
                      onClick={() => void handleInstallExample()}
                    >
                      <Sparkles />
                      {examplePending
                        ? t("visualizer.loadingExample")
                        : t("visualizer.installExample")}
                    </Button>
                  )}
                </div>

                <IssueList issues={issues} />

                {success && (
                  <p className="flex items-center gap-1.5 text-xs text-primary">
                    <CheckCircle2 className="size-3.5" />
                    {success}
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
