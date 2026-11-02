import { useState } from "react";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toast";
import { musicSourceStrategies } from "@/lib/sources";
import type { IMusicSourceStrategy } from "@/lib/sources";
import { MusicSourceConfigForm } from "./MusicSourceConfigForm";

export interface AddMusicSourceProps {
  onSourceAdded?: () => void | Promise<void>;
  compact?: boolean;
}

/**
 * Flow for attaching a new music source. Step 1 lists the available source
 * types (an item list). Choosing a type that requires configuration shows a
 * standard config form (the strategy's `configFields`); otherwise the source
 * is added directly.
 */
export function AddMusicSource({
  onSourceAdded,
  compact = false,
}: AddMusicSourceProps) {
  const [open, setOpen] = useState(false);
  const [activeStrategy, setActiveStrategy] = useState<IMusicSourceStrategy | null>(null);
  const [pendingConfig, setPendingConfig] = useState<unknown>(undefined);

  function handleChoose(strategy: IMusicSourceStrategy) {
    setActiveStrategy(strategy);
    setPendingConfig(undefined);
    if (!strategy.requiresConfig) void handleAdd();
  }

  async function handleConfigSubmit(config: unknown) {
    await handleAdd(config);
  }

  async function handleConnect(config: unknown) {
    if (!activeStrategy) return;
    // Connection/login errors are surfaced by the standard config form.
    await activeStrategy.connect?.({ config });
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
        title: error instanceof Error ? error.message : `Unable to add ${activeStrategy.name}`,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button size={compact ? "sm" : "default"} className={compact ? "" : "w-full"}>
          <Plus className="h-4 w-4 mr-1" />
          Add Music Source
        </Button>
      </DialogTrigger>

      <DialogContent className="w-full sm:w-lg select-none">
        {!activeStrategy ? (
          <>
            <DialogHeader>
              <DialogTitle>Add a music source</DialogTitle>
              <DialogDescription>
                Choose a source type to connect to.
              </DialogDescription>
            </DialogHeader>

            <div className="divide-y rounded-lg border">
              {musicSourceStrategies.map((strategy) => (
                <button
                  key={strategy.kind}
                  type="button"
                  className="flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent/5"
                  onClick={() => handleChoose(strategy)}
                >
                  <div className="mt-1 text-accent">{strategy.icon}</div>
                  <div className="min-w-0">
                    <div className="font-medium">{strategy.name}</div>
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
            <DialogHeader>
              <div className="flex items-center gap-2">
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
                <DialogTitle>{activeStrategy.name}</DialogTitle>
              </div>
              <DialogDescription>{activeStrategy.description}</DialogDescription>
            </DialogHeader>

            {activeStrategy.configFields?.length ? (
              <MusicSourceConfigForm
                strategy={activeStrategy}
                initialValue={pendingConfig}
                onSubmit={handleConfigSubmit}
                onConnect={handleConnect}
              />
            ) : null}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
