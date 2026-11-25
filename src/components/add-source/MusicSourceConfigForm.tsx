import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FolderOpen, FolderPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showDirectoryPicker, isApiSupported } from "use-fs-access/core";
import { i18n, useTranslation } from "@/i18n";
import type {
  IMusicSourceStrategy,
  MusicSourceConfigField,
  MusicSourceProbe,
} from "@/lib/sources";

export interface MusicSourceConfigFormProps {
  strategy: IMusicSourceStrategy;
  initialValue?: unknown;
  /** Id of the source being edited, so the probe can reuse stored credentials. */
  probeSourceId?: string;
  onSubmit: (config: Record<string, unknown>) => Promise<void> | void;
  onConnect?: (config: Record<string, unknown>) => Promise<void> | void;
}

/** Map a thrown connect error to a user-facing message. Inline here so any
 *  config-requiring source can surface the same standardized error. */
function connectErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (/(\(40\))/.test(msg)) return i18n.t("source.invalidCredentials");
  if (msg.includes("HTTP "))
    return i18n.t("source.serverUnreachable");
  return msg || i18n.t("source.connectFailed");
}

/**
 * Standard config form for any source strategy that declares `configFields`.
 * Renders each field generically, handles required/URL validation, Enter-to-
 * submit (which begins the import), and an inline connection/login error
 * banner. Owned by the caller so every config-requiring source shares it.
 */
export function MusicSourceConfigForm({
  strategy,
  initialValue,
  probeSourceId,
  onSubmit,
  onConnect,
}: MusicSourceConfigFormProps) {
  const { t } = useTranslation();
  const fields: MusicSourceConfigField[] = strategy.configFields ?? [];
  const initial = (initialValue ?? {}) as Record<string, string>;

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [
        f.name,
        String(initial[f.name] ?? f.options?.default ?? ""),
      ])
    )
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  // Folder fields (type: "folder") hold the picked FileSystemDirectoryHandle
  // here; the field's display name goes in `values`.
  const [folderHandles, setFolderHandles] = useState<
    Record<string, FileSystemDirectoryHandle>
  >({});
  // Multi-folder fields (`options.multiple`) hold a list, seeded from the
  // initial value when editing an existing source.
  const [folderLists, setFolderLists] = useState<
    Record<string, FileSystemDirectoryHandle[]>
  >(() =>
    Object.fromEntries(
      fields
        .filter((f) => f.type === "folder" && f.options?.multiple)
        .map((f) => [
          f.name,
          ((initialValue as Record<string, unknown> | undefined)?.[f.name] ??
            []) as FileSystemDirectoryHandle[],
        ])
    )
  );

  // What the strategy reported about the server from the current values, so
  // the form can show its capabilities before the source is added.
  const [probe, setProbe] = useState<MusicSourceProbe | null>(null);
  const [probing, setProbing] = useState(false);

  const probeConfig = useMemo(
    () => ({ ...values, ...folderHandles, ...folderLists }),
    [values, folderHandles, folderLists]
  );

  // Only the extensions this app can actually use are listed; the rest are
  // summarised as a count so the panel stays short.
  const supportedExtensions =
    probe?.extensions.filter((extension) => extension.supported) ?? [];
  const unsupportedExtensionCount =
    probe?.extensions.filter((extension) => !extension.supported).length ?? 0;

  // Probe as the user fills the form in. Debounced so a typed URL or password
  // produces one request, not one per keystroke.
  useEffect(() => {
    const run = strategy.probe;
    if (!run) return;

    let cancelled = false;
    const timer = setTimeout(() => {
      setProbing(true);
      run({ config: probeConfig, sourceId: probeSourceId })
        .then((result) => {
          if (!cancelled) setProbe(result);
        })
        .catch(() => {
          if (!cancelled) setProbe(null);
        })
        .finally(() => {
          if (!cancelled) setProbing(false);
        });
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [strategy, probeConfig, probeSourceId]);

  async function pickFolder(field: MusicSourceConfigField) {
    if (!isApiSupported) {
      setErrors((prev) => ({
        ...prev,
        [field.name]: t("source.folderUnsupported"),
      }));
      return;
    }
    try {
      const dirHandle = await showDirectoryPicker({ mode: "readwrite" });
      if (!dirHandle) return;
      if (field.options?.multiple) {
        const current = folderLists[field.name] ?? [];
        // Names are unique within a source: they prefix each song's path.
        let error: string | undefined;
        if (current.some((f) => f.name === dirHandle.name)) {
          error = t("source.folderNamedAlreadyAdded", [dirHandle.name]);
        } else {
          for (const f of current) {
            if (await f.isSameEntry(dirHandle)) {
              error = t("source.folderAlreadyAdded", [dirHandle.name]);
              break;
            }
          }
        }
        if (error) {
          setErrors((prev) => ({ ...prev, [field.name]: error }));
          return;
        }
        setFolderLists((prev) => ({
          ...prev,
          [field.name]: [...current, dirHandle],
        }));
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field.name];
          return next;
        });
        setConnectionError(null);
        return;
      }
      setFolderHandles((prev) => ({ ...prev, [field.name]: dirHandle }));
      setValues((prev) => ({ ...prev, [field.name]: dirHandle.name }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field.name];
        return next;
      });
      setConnectionError(null);
    } catch {
      // User cancelled the picker — treat as "no selection yet".
    }
  }

  function validate(): Record<string, unknown> | null {
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.name] ?? "";
      if (f.type === "folder") {
        if (f.options?.multiple) {
          if (!folderLists[f.name]?.length) {
            next[f.name] = t("source.chooseAtLeastOneFolder");
          }
          continue;
        }
        if (!folderHandles[f.name]) {
          next[f.name] = t("source.chooseFolder");
          continue;
        }
        continue;
      }
      if (f.required !== false && !v.trim()) {
        next[f.name] = t("source.fieldRequired", [f.labelKey ? t(f.labelKey) : f.label]);
        continue;
      }
      const err = f.validate?.(v, values);
      if (err) next[f.name] = t(err);
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return null;

    // Include picked folder handles (type: "folder") in the submitted config
    // so the strategy's add() can read `config.<fieldName>` as the handle.
    // The probe result rides along so the source stores what the server
    // reported, and later calls need not ask again.
    return {
      ...values,
      ...folderHandles,
      ...folderLists,
      ...(probe
        ? {
            openSubsonic: probe.openSubsonic,
            ...(probe.serverType ? { serverType: probe.serverType } : {}),
            ...(probe.serverVersion
              ? { serverVersion: probe.serverVersion }
              : {}),
            extensions: probe.extensions.map(({ name, versions, supported }) => ({
              name,
              versions,
              supported,
            })),
          }
        : {}),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setConnectionError(null);
    const config = validate();
    if (!config) return;
    setConnecting(true);
    // Form submission begins the import: establish the connection (persist)
    // then hand off to the panel's import flow.
    try {
      await onConnect?.(config);
      await onSubmit(config);
    } catch (err) {
      setConnectionError(connectErrorMessage(err));
    } finally {
      setConnecting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      {fields.map((f) =>
        f.type === "folder" && f.options?.multiple ? (
          <div className="space-y-1.5" key={f.name}>
            <Label>{f.labelKey ? t(f.labelKey) : f.label}</Label>
            <ul className="space-y-1">
              {(folderLists[f.name] ?? []).map((folder) => (
                <li
                  key={folder.name}
                  className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <FolderOpen className="h-4 w-4 shrink-0 text-accent" />
                  <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label={t("source.removeFolderNamed", [folder.name])}
                    title={t("source.removeFolderNamed", [folder.name])}
                    disabled={connecting}
                    onClick={() =>
                      setFolderLists((prev) => ({
                        ...prev,
                        [f.name]: prev[f.name].filter((x) => x !== folder),
                      }))
                    }
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => pickFolder(f)}
              disabled={connecting}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-4 text-sm font-medium text-muted-foreground transition-colors border-border hover:border-accent hover:bg-accent/5"
              aria-label={t("source.addFolder")}
            >
              <FolderPlus className="h-5 w-5 shrink-0 text-accent" />
              {folderLists[f.name]?.length
                ? t("source.addAnotherFolder")
                : t("source.chooseFolder")}
            </button>
            {errors[f.name] && (
              <p className="text-sm text-destructive">{errors[f.name]}</p>
            )}
          </div>
        ) : f.type === "folder" ? (
          <div className="space-y-1.5" key={f.name}>
            <Label htmlFor={`src-config-${f.name}`}>{f.labelKey ? t(f.labelKey) : f.label}</Label>
            <button
              type="button"
              id={`src-config-${f.name}`}
              onClick={() => pickFolder(f)}
              disabled={connecting}
              className="group flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-5 text-center transition-colors
                border-border hover:border-accent hover:bg-accent/5
                data-[empty=true]:text-muted-foreground"
              data-empty={!values[f.name]}
              aria-label={t("source.chooseFolder")}
            >
              <FolderOpen className="h-6 w-6 shrink-0 text-accent" />
              {values[f.name] ? (
                <>
                  <span className="text-sm font-medium">{values[f.name]}</span>
                  <span className="text-xs text-muted-foreground">
                    {t("source.clickToChangeFolder")}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">
                    {t("source.chooseFolder")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t("source.browseForFolder")}
                  </span>
                </>
              )}
            </button>
            {errors[f.name] && (
              <p className="text-sm text-destructive">{errors[f.name]}</p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5" key={f.name}>
            <Label htmlFor={`src-config-${f.name}`}>{f.labelKey ? t(f.labelKey) : f.label}</Label>
            <Input
              id={`src-config-${f.name}`}
              type={f.type ?? "text"}
              placeholder={f.placeholderKey ? t(f.placeholderKey) : f.placeholder}
              value={values[f.name] ?? ""}
              onChange={(e) => {
                const next = { ...values, [f.name]: e.target.value };
                setValues(next);
                setConnectionError(null);
                if (errors[f.name])
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next[f.name];
                    return next;
                  });
              }}
              aria-invalid={Boolean(errors[f.name])}
            />
            {errors[f.name] && (
              <p className="text-sm text-destructive">{errors[f.name]}</p>
            )}
          </div>
        )
      )}

      {strategy.probe && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          {probing && !probe ? (
            <p className="text-sm text-muted-foreground">
              {t("source.checkingServer")}
            </p>
          ) : probe ? (
            <>
              <div>
                <p className="text-sm font-medium">
                  {probe.openSubsonic
                    ? t("source.openSubsonicDetected")
                    : t("source.subsonicDetected")}
                </p>
                {probe.openSubsonic &&
                  (probe.serverType || probe.serverVersion) && (
                    <p className="text-xs text-muted-foreground">
                      {[probe.serverType, probe.serverVersion]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  )}
              </div>

              {probe.openSubsonic &&
                (probe.extensions.length > 0 ? (
                  <>
                    {supportedExtensions.length > 0 && (
                      <ul className="space-y-1">
                        {supportedExtensions.map((extension) => (
                          <li
                            key={extension.name}
                            className="flex items-center gap-2 text-sm"
                          >
                            <CheckCircle2
                              className="h-4 w-4 shrink-0 text-accent"
                              aria-label={t("source.extensionSupported")}
                            />
                            <span className="font-medium">
                              {extension.name}
                            </span>
                            {extension.versions.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                v{extension.versions.join(", v")}
                              </span>
                            )}
                            {extension.descriptionKey && (
                              <span className="text-xs text-muted-foreground">
                                {t(extension.descriptionKey)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {unsupportedExtensionCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t("source.moreUnsupportedExtensions", [
                          String(unsupportedExtensionCount),
                        ])}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("source.noExtensionsReported")}
                  </p>
                ))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("source.serverInfo")}
            </p>
          )}
        </div>
      )}

      {connectionError && (
        <div role="alert" className="text-sm text-destructive">
          {connectionError}
        </div>
      )}
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={connecting} className="gap-1.5">
          {connecting ? t("source.connecting") : t("source.connect")}
        </Button>
      </div>
    </form>
  );
}
