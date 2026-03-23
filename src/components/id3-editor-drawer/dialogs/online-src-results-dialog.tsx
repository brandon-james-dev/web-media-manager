"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MusicResult } from "itunes-web-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: MusicResult[];
  onSelect: (result: MusicResult) => void;
};

export function OnlineSrcResultsDialog({
  open,
  onOpenChange,
  results,
  onSelect,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select the correct match</DialogTitle>
          <DialogDescription>
            Multiple results were found. Choose the correct one below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 mt-4">
          {results.map((r) => {
            const thumb = r.artworkUrl100
              ? r.artworkUrl100.replace("100x100bb", "60x60bb")
              : null;

            return (
              <button
                key={r.trackId}
                type="button"
                className="w-full flex items-center gap-3 p-3 border rounded hover:bg-muted transition text-left"
                onClick={() => {
                  onOpenChange(false);
                  onSelect(r);
                }}
              >
                {thumb ? (
                  <img
                    src={thumb}
                    alt={r.trackName}
                    className="w-12 h-12 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    No Art
                  </div>
                )}

                <div className="flex flex-col">
                  <span className="font-medium">{r.trackName}</span>
                  <span className="text-sm text-muted-foreground">
                    {r.artistName} — {r.collectionName}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
