import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getShortcuts } from "@/lib/keyboardShortcuts";
import { Kbd } from "@/components/ui/kbd";
import { isMac } from "@/lib/os";
import {
  ArrowBigUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Command,
  Option,
} from "lucide-react";

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (openState: boolean) => void;
}) {
  const shortcuts = [...getShortcuts().values()];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-6 w-150 max-h-[80%]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="mt-4 space-y-3">
            {shortcuts.map((s) => {
              const c = s.combo;

              return (
                <div
                  key={s.id}
                  className="flex justify-between items-center border-b pb-2"
                >
                  <span className="text-sm">{s.description}</span>

                  <span className="flex gap-1 select-none items-center">
                    {c.ctrl && (
                      <>
                        <Kbd>{isMac ? <Command /> : "Ctrl"}</Kbd>
                        <span>+</span>
                      </>
                    )}

                    {c.meta && (
                      <>
                        <Kbd>{isMac ? <Command /> : "Ctrl"}</Kbd>
                        <span>+</span>
                      </>
                    )}

                    {c.shift && (
                      <>
                        <Kbd>
                          <ArrowBigUp />
                        </Kbd>
                        <span>+</span>
                      </>
                    )}

                    {c.alt && (
                      <>
                        <Kbd>{isMac ? <Option /> : "Alt"}</Kbd>
                        <span>+</span>
                      </>
                    )}

                    {(() => {
                      switch (c.key) {
                        case "ArrowUp":
                          return (
                            <Kbd>
                              <ArrowUp />
                            </Kbd>
                          );

                        case "ArrowDown":
                          return (
                            <Kbd>
                              <ArrowDown />
                            </Kbd>
                          );

                        case "ArrowLeft":
                          return (
                            <Kbd>
                              <ArrowLeft />
                            </Kbd>
                          );

                        case "ArrowRight":
                          return (
                            <Kbd>
                              <ArrowRight />
                            </Kbd>
                          );

                        case " ":
                          return <Kbd>Space</Kbd>;

                        default:
                          return <Kbd>{c.key}</Kbd>;
                      }
                    })()}
                  </span>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
