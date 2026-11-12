import { useState } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { musicSourceStrategies } from "@/lib/sources";
import { sourceKindIcon } from "@/lib/sources/source-ui";
import type { IMusicSourceStrategy } from "@/lib/sources";
import type { MusicSource } from "@/models";
import { isLocalSource, localSourceFolders } from "@/core/contracts/sources";
import { MusicSourceConfigForm } from "./MusicSourceConfigForm";

export interface AddMusicSourceProps {
  onSourceAdded?: () => void | Promise<void>;
  compact?: boolean;
  /**
   * Render the flow in place instead of in a dialog: the trigger button is
   * replaced by the type list / form once opened.
   */
  inline?: boolean;
  /** Called when an edit-mode dialog closes (so the caller can clear the editing source). */
  onClose?: () => void;
  /**
   * When set, the dialog opens in EDIT mode: it skips the source-type list,
   * pre-fills the config form with the stored source's config, and the
   * submit calls the strategy's `updateSource` instead of `add`.
   */
  editingSource?: MusicSource | null;
}

/**
 * Flow for attaching a new music source. Step 1 lists the available source
 * types (an item list). Choosing a type that requires configuration shows a
 * standard config form (the strategy's `configFields`); otherwise the source
 * is added directly.
 *
 * When `editingSource` is provided the dialog opens directly in edit mode:
 * no type list, the form pre-filled with the stored source's config, and
 * submission persists via the strategy's `updateSource`.
 */
export function AddMusicSource({
  onSourceAdded,
  compact = false,
  inline = false,
  editingSource,
  onClose,
}: AddMusicSourceProps) {
  const [open, setOpen] = useState(Boolean(editingSource));
  const [activeStrategy, setActiveStrategy] =
    useState<IMusicSourceStrategy | null>(null);
  const [pendingConfig, setPendingConfig] = useState<unknown>(undefined);

  const editingStrategy = editingSource
    ? (musicSourceStrategies.find((s) => s.kind === editingSource.kind) ?? null)
    : null;

  const isEditing = Boolean(editingSource && editingStrategy);

  function handleChoose(strategy: IMusicSourceStrategy) {
    setActiveStrategy(strategy);
    setPendingConfig(undefined);
    if (!strategy.requiresConfig) void handleAdd();
  }

  async function handleConfigSubmit(config: unknown) {
    if (isEditing && editingSource && editingStrategy?.updateSource) {
      await handleEdit(config);
      return;
    }
    await handleAdd(config);
  }

  async function handleConnect(config: unknown) {
    const strat = activeStrategy ?? editingStrategy;
    if (!strat) return;
    // Connection/login errors are surfaced by the standard config form.
    await strat.connect?.({ config });
  }

  async function handleEdit(config?: unknown) {
    if (!editingSource || !editingStrategy?.updateSource) return;
    try {
      await editingStrategy.updateSource({
        source: editingSource,
        config: config ?? pendingConfig,
      });
      await onSourceAdded?.();
      toast.add({
        type: "success",
        title: `Updated ${editingSource.name}`,
      });
    } catch (error) {
      toast.add({
        type: "error",
        title:
          error instanceof Error
            ? error.message
            : `Unable to update ${editingSource.name}`,
      });
    } finally {
      setOpen(false);
      setActiveStrategy(null);
      setPendingConfig(undefined);
    }
  }

  async function handleAdd(config?: unknown) {
    if (!activeStrategy) return;
    // Use the config passed directly (from form submit) so the freshly
    // validated config reaches add() without a React-state race.
    const resolvedConfig = config ?? pendingConfig;
    try {
      await activeStrategy.add({
        onSourceAdded: onSourceAdded,
        config: resolvedConfig,
      });
    } catch (error) {
      toast.add({
        type: "error",
        title:
          error instanceof Error
            ? error.message
            : `Unable to add ${activeStrategy.name}`,
      });
    } finally {
      setOpen(false);
      setActiveStrategy(null);
      setPendingConfig(undefined);
    }
  }

  function handleBack() {
    setActiveStrategy(null);
    setPendingConfig(undefined);
  }

  const formStrategy = activeStrategy ?? editingStrategy;

  const Header = inline ? "div" : DialogHeader;
  const Title = inline ? InlineTitle : DialogTitle;
  const Description = inline ? InlineDescription : DialogDescription;

  const body = !formStrategy ? (
    <>
      <div className="flex items-center gap-2">
        {inline && (
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Cancel"
            title="Cancel"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Header className="flex-1 text-left">
          <Title>Add a music source</Title>
          <Description>Choose a source type to connect to.</Description>
        </Header>
      </div>

      <div className="divide-y rounded-lg border">
        {musicSourceStrategies.map((strategy) => (
          <button
            key={strategy.kind}
            type="button"
            disabled={strategy.isAvailable === false}
            className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            onClick={() => handleChoose(strategy)}
            title={
              strategy.isAvailable === false
                ? "Not supported in this browser"
                : undefined
            }
          >
            <div className="mt-1 text-accent">
              {sourceKindIcon(strategy.kind)}
            </div>
            <div className="min-w-0">
              <div className="font-medium">
                {strategy.name}
                {strategy.isAvailable === false && (
                  <span className="text-xs font-normal text-muted-foreground">
                    Not supported in this browser
                  </span>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {strategy.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </>
  ) : (
    <>
      <Header className="text-left">
        <div className="flex items-center gap-2">
          {!isEditing && (
            <Button
              variant="outline"
              size="icon"
              type="button"
              onClick={handleBack}
              aria-label="Back"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <Title>
            {isEditing ? `Edit ${editingSource?.name}` : formStrategy.name}
          </Title>
        </div>
        <Description>{formStrategy.description}</Description>
      </Header>

      {formStrategy.configFields?.length ? (
        <MusicSourceConfigForm
          strategy={formStrategy}
          initialValue={
            isEditing
              ? isLocalSource(editingSource!)
                ? { folders: localSourceFolders(editingSource) }
                : "config" in editingSource!
                  ? editingSource!.config
                  : pendingConfig
              : pendingConfig
          }
          onSubmit={handleConfigSubmit}
          onConnect={handleConnect}
        />
      ) : null}
    </>
  );

  if (inline) {
    if (!open) {
      return (
        <Button className="w-full" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Add Music Source
        </Button>
      );
    }
    return <div className="flex w-full flex-col gap-4 select-none">{body}</div>;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next && isEditing) onClose?.();
      }}
    >
      <DialogTrigger
        render={
          <Button
            size={compact ? "sm" : "default"}
            className={compact ? "" : "w-full"}
          >
            <Plus className="h-4 w-4 mr-1" />
            {isEditing ? "Edit" : "Add Music Source"}
          </Button>
        }
      />

      <DialogContent className="w-full sm:w-lg select-none">
        {body}
      </DialogContent>
    </Dialog>
  );
}

function InlineTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-medium">{children}</h2>;
}

function InlineDescription({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}
