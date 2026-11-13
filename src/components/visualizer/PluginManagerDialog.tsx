import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "cn";

import {
  PluginInstallError,
  getRuntimeDescriptor,
  type InstallPluginResult,
  type ManifestIssue,
} from "@/core/visualizers";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { VisualizerSelector } from "./VisualizerSelector";
import type { PluginManagerDialogProps } from "./PluginManagerDialogProps";

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
}: PluginManagerDialogProps) {
  const {
    managerOpen,
    setManagerOpen,
    activePluginId,
    setActivePluginId,
  } = useVisualizer();
  const { data: plugins } = useInstalledPlugins();
  const install = useInstallPlugin();
  const remove = useRemovePlugin();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [replace, setReplace] = useState(false);
  const [issues, setIssues] = useState<ManifestIssue[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [examplePending, setExamplePending] = useState(false);

  const isOpen = open ?? managerOpen;
  const setOpen = onOpenChange ?? setManagerOpen;
  const active = plugins?.find((plugin) => plugin.id === activePluginId);

  function handleInstalled(result: InstallPluginResult) {
    setSuccess(`Installed ${result.plugin.name} ${result.plugin.version}.`);
    setFile(null);
    setReplace(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setActivePluginId(result.plugin.id);
  }

  function handleInstallError(error: Error) {
    setIssues(
      error instanceof PluginInstallError
        ? error.issues
        : [
            {
              code: "archive-invalid",
              severity: "error",
              message: error.message,
            },
          ]
    );
  }

  function handleInstall() {
    if (!file) {
      return;
    }

    setIssues([]);
    setSuccess(null);
    install.mutate(
      { file, replace },
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
        throw new Error(`Example plugin not found (${response.status}).`);
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
        if (activePluginId === pluginId) {
          setActivePluginId(null);
        }
      },
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogContent
        className={cn("z-120 sm:max-w-2xl", className)}
        overlayClassName="z-120"
      >
        <DialogHeader>
          <DialogTitle>Visualizer plugins</DialogTitle>
          <DialogDescription>
            Install a plugin from a ZIP archive, or manage the ones already
            installed.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="installed">
          <TabsList>
            <TabsTrigger value="installed">Installed</TabsTrigger>
            <TabsTrigger value="install">Install</TabsTrigger>
          </TabsList>

          <TabsContent value="installed" className="min-h-0">
            <div className="flex flex-col gap-3 md:flex-row">
              <VisualizerSelector
                variant="list"
                className="min-h-64 flex-1"
              />

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
                      <dt>Id</dt>
                      <dd className="truncate">{active.id}</dd>
                      <dt>Runtime</dt>
                      <dd>
                        {getRuntimeDescriptor(active.runtime)?.label ??
                          active.runtime}
                      </dd>
                      <dt>Author</dt>
                      <dd className="truncate">
                        {active.author ?? "Unknown"}
                      </dd>
                      <dt>Entry</dt>
                      <dd className="truncate">{active.entryPath}</dd>
                      <dt>Files</dt>
                      <dd>{active.fileCount}</dd>
                      <dt>Size</dt>
                      <dd>{formatBytes(active.sizeBytes)}</dd>
                      <dt>Installed</dt>
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
                          Remove {active.name} and its stored files?
                        </p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={remove.isPending}
                            onClick={() => handleRemove(active.id)}
                          >
                            Remove
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirmRemoveId(null)}
                          >
                            Cancel
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
                        Remove plugin
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a plugin to see its details.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="install">
            <ScrollArea className="max-h-[60vh]">
              <div className="flex flex-col gap-3 pr-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="plugin-zip">Plugin ZIP</Label>
                  <Input
                    id="plugin-zip"
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,application/zip"
                    onChange={(event) => {
                      setFile(event.target.files?.[0] ?? null);
                      setIssues([]);
                      setSuccess(null);
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    The archive must contain a manifest.json at its root (or
                    inside a single top-level folder).
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border p-2">
                  <div className="min-w-0">
                    <Label htmlFor="plugin-replace">Update if installed</Label>
                    <p className="text-xs text-muted-foreground">
                      Replace an existing plugin with the same id.
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
                    {install.isPending ? "Installing…" : "Install plugin"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={examplePending || install.isPending}
                    onClick={() => void handleInstallExample()}
                  >
                    <Sparkles />
                    {examplePending
                      ? "Loading example…"
                      : "Install aurora example"}
                  </Button>
                  {file && (
                    <span className="truncate text-xs text-muted-foreground">
                      {file.name}
                    </span>
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
