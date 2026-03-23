"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  artist: string;
  album: string;
  onChangeTitle: (v: string) => void;
  onChangeArtist: (v: string) => void;
  onChangeAlbum: (v: string) => void;
  onSearch: () => void;
  isMulti: boolean;
};

export function OnlineSrcPreSearchDialog({
  open,
  onOpenChange,
  title,
  artist,
  album,
  onChangeTitle,
  onChangeArtist,
  onChangeAlbum,
  onSearch,
  isMulti,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enter song info</DialogTitle>
          <DialogDescription hidden={isMulti}>
            Title and artist are required before searching iTunes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div hidden={isMulti}>
            <label className="text-sm font-medium">Title</label>
            <input
              className="w-full border rounded px-2 py-1 mt-1"
              value={title}
              required={!isMulti}
              onChange={(e) => onChangeTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Artist</label>
            <input
              className="w-full border rounded px-2 py-1 mt-1"
              value={artist}
              onChange={(e) => onChangeArtist(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium">
              Album<span hidden={isMulti}> (optional)</span>
            </label>
            <input
              className="w-full border rounded px-2 py-1 mt-1"
              value={album}
              required={isMulti}
              onChange={(e) => onChangeAlbum(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>

          <Button
            onClick={() => {
              onOpenChange(false);
              onSearch();
            }}
          >
            Search
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
