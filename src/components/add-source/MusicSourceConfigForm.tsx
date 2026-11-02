import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showDirectoryPicker, isApiSupported } from "use-fs-access/core";
import type {
  IMusicSourceStrategy,
  MusicSourceConfigField,
} from "@/lib/sources";

export interface MusicSourceConfigFormProps {
  strategy: IMusicSourceStrategy;
  initialValue?: unknown;
  onSubmit: (config: Record<string, unknown>) => Promise<void> | void;
  onConnect?: (config: Record<string, unknown>) => Promise<void> | void;
}

/** Map a thrown connect error to a user-facing message. Inline here so any
 *  config-requiring source can surface the same standardized error. */
function connectErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (/(\(40\))/.test(msg)) return "Incorrect username or password";
  if (msg.includes("HTTP "))
    return "Couldn't reach the server — check the URL and network, then retry.";
  return msg || "Failed to connect";
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
  onSubmit,
  onConnect,
}: MusicSourceConfigFormProps) {
  const fields: MusicSourceConfigField[] = strategy.configFields ?? [];
  const initial = (initialValue ?? {}) as Record<string, string>;

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      fields.map((f) => [f.name, String(initial[f.name] ?? f.options?.default ?? "")])
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

  async function pickFolder(field: MusicSourceConfigField) {
    if (!isApiSupported) {
      setErrors((prev) => ({
        ...prev,
        [field.name]: "Folder selection is not supported in this browser",
      }));
      return;
    }
    try {
      const dirHandle = await showDirectoryPicker({ mode: "readwrite" });
      if (!dirHandle) return;
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

  function validate(): Record<string, string | FileSystemDirectoryHandle> | null {
    const next: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.name] ?? "";
      if (f.type === "folder") {
        if (!folderHandles[f.name]) {
          next[f.name] = "Choose a folder";
          continue;
        }
        continue;
      }
      if (f.required !== false && !v.trim()) {
        next[f.name] = `${f.label} is required`;
        continue;
      }
      const err = f.validate?.(v, values);
      if (err) next[f.name] = err;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return null;

    // Include picked folder handles (type: "folder") in the submitted config
    // so the strategy's add() can read `config.<fieldName>` as the handle.
    return { ...values, ...folderHandles };
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
        f.type === "folder" ? (
          <div className="space-y-1.5" key={f.name}>
            <Label htmlFor={`src-config-${f.name}`}>{f.label}</Label>
            <button
              type="button"
              id={`src-config-${f.name}`}
              onClick={() => pickFolder(f)}
              disabled={connecting}
              className="group flex w-full flex-col items-center gap-1.5 rounded-lg border-2 border-dashed px-6 py-5 text-center transition-colors
                border-border hover:border-accent hover:bg-accent/5
                data-[empty=true]:text-muted-foreground"
              data-empty={!values[f.name]}
              aria-label="Choose folder"
            >
              <FolderOpen className="h-6 w-6 shrink-0 text-accent" />
              {values[f.name] ? (
                <>
                  <span className="text-sm font-medium">
                    {values[f.name]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Click to change folder
                  </span>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium">Choose a folder</span>
                  <span className="text-xs text-muted-foreground">
                    Browse your device for a music folder
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
            <Label htmlFor={`src-config-${f.name}`}>{f.label}</Label>
            <Input
              id={`src-config-${f.name}`}
              type={f.type ?? "text"}
              placeholder={f.placeholder}
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

      {connectionError && (
        <div role="alert" className="text-sm text-destructive">
          {connectionError}
        </div>
      )}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={connecting}
          className="gap-1.5"
        >
          {connecting ? "Connecting..." : "Connect"}
        </Button>
      </div>
    </form>
  );
}
