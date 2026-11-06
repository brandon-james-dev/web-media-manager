import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type NewPlaylistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Receives the trimmed name; the caller creates the playlist. */
  onCreate: (name: string) => void | Promise<void>;
  /** Song count shown in the description, when songs are being added. */
  songCount?: number;
  /** Pre-fills the field (rename flow) instead of starting empty. */
  initialName?: string;
};

/** Prompts for a playlist name before the playlist is created. */
export function NewPlaylistDialog({
  open,
  onOpenChange,
  onCreate,
  songCount = 0,
  initialName,
}: NewPlaylistDialogProps) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // Start from an empty field each time the dialog is opened (or from the
  // current name in the rename flow).
  useEffect(() => {
    if (open) setName(initialName ?? "");
  }, [open, initialName]);

  const trimmed = name.trim();

  async function submit() {
    if (!trimmed || busy) return;
    setBusy(true);
    try {
      await onCreate(trimmed);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {initialName ? "Rename playlist" : "New playlist"}
          </DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-playlist-name">Name</Label>
            <Input
              id="new-playlist-name"
              autoFocus
              value={name}
              placeholder="Playlist name"
              onChange={(event) => setName(event.target.value)}
            />
            {songCount > 0 && (
              <div className="text-xs text-muted-foreground">
                {songCount} {songCount === 1 ? "song" : "songs"} will be added.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!trimmed || busy}>
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
