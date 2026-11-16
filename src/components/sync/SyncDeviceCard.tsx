import {
  ArrowDownToLine,
  Check,
  Database,
  Disc3,
  HardDrive,
  Headphones,
  Image,
  ListMusic,
  Minus,
  Pencil,
  RotateCw,
  Speaker,
  Usb,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "cn";

import type { SyncDevice } from "@/models";
import { formatBytes } from "@/lib/sync/helpers";
import { useSync } from "@/hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useCallback, useMemo, useState } from "react";
import { Item, ItemContent, ItemDescription, ItemTitle } from "../ui/item";
import { ScrollArea } from "../ui/scroll-area";
import { SyncStat } from "./SyncStat";

type DeviceView = "songs" | "albums" | "artists" | "genres" | "playlists";

export function SyncDeviceCard({ device }: { device: SyncDevice }) {
  const [view, setView] = useState<DeviceView>("songs");
  const [isRemoving, setIsRemoving] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<{
    label: string;
    trackIds: number[];
  } | null>(null);

  // On-device ids ticked for a bulk removal. Cleared whenever the tab changes
  // so a selection made in one grouping cannot be removed from another.
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Removal controls (row checkboxes, per-row minus, the selection bar) only
  // appear while editing, so the card reads as a library by default.
  const [isEditing, setIsEditing] = useState(false);

  const { refreshDevices, removeTracksFromDevice } = useSync();

  const toggleIds = useCallback((ids: number[]) => {
    setSelected((current) => {
      const next = new Set(current);
      const allSelected = ids.every((id) => next.has(id));

      for (const id of ids) {
        if (allSelected) next.delete(id);
        else next.add(id);
      }

      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const { usedBytes, capacityBytes } = device.storage ?? {};

  // Null when nothing was measured, rather than implying the device is empty.
  const storageLabel =
    usedBytes == null
      ? null
      : capacityBytes
        ? `${formatBytes(usedBytes)} of ${formatBytes(capacityBytes)} used`
        : `${formatBytes(usedBytes)} used`;

  // Bytes waiting in the sync queue. Drawn as a pending segment on the
  // storage bar, so the queue's footprint on the device is visible before
  // anything is written.
  const { queuedSongs } = useSync();
  const queuedBytes = useMemo(
    () => queuedSongs.reduce((sum, song) => sum + (song.filesize ?? 0), 0),
    [queuedSongs]
  );

  // Segments for the storage bar: what the device holds, what the queue would
  // add, and what is left. The pending segment is capped at the remaining
  // space so an oversized queue cannot overflow the bar.
  const storage = useMemo(() => {
    if (usedBytes == null || capacityBytes == null || capacityBytes <= 0) {
      return null;
    }

    const usedPct = Math.min((usedBytes / capacityBytes) * 100, 100);
    const pendingPct = Math.min(
      (queuedBytes / capacityBytes) * 100,
      100 - usedPct
    );

    return {
      usedPct,
      pendingPct,
      freeBytes: Math.max(capacityBytes - usedBytes - queuedBytes, 0),
    };
  }, [usedBytes, capacityBytes, queuedBytes]);

  // Read once so both memos depend on the same value the compiler infers.
  const tracks = device.media?.tracks;

  const albums = useMemo(() => {
    const map = new Map<
      string,
      {
        artist?: string;
        album?: string;
        trackCount: number;
        trackIds: number[];
      }
    >();

    for (const track of tracks ?? []) {
      const key = `${track.artist ?? ""}|${track.album ?? ""}`;

      const existing = map.get(key);

      if (existing) {
        existing.trackCount++;
        existing.trackIds.push(track.id);
      } else {
        map.set(key, {
          artist: track.artist,
          album: track.album,
          trackCount: 1,
          trackIds: [track.id],
        });
      }
    }

    return [...map.values()].sort((a, b) =>
      (a.album ?? "").localeCompare(b.album ?? "")
    );
  }, [tracks]);

  const artists = useMemo(() => {
    const map = new Map<string, { trackCount: number; trackIds: number[] }>();

    for (const track of tracks ?? []) {
      const artist = track.artist || "Unknown Artist";

      const existing = map.get(artist);

      if (existing) {
        existing.trackCount++;
        existing.trackIds.push(track.id);
      } else {
        map.set(artist, { trackCount: 1, trackIds: [track.id] });
      }
    }

    return [...map.entries()]
      .map(([artist, value]) => ({
        artist,
        trackCount: value.trackCount,
        trackIds: value.trackIds,
      }))
      .sort((a, b) => a.artist.localeCompare(b.artist));
  }, [tracks]);

  const genres = useMemo(() => {
    const map = new Map<string, { trackCount: number; trackIds: number[] }>();

    for (const track of tracks ?? []) {
      const genre = track.genre || "Unknown Genre";

      const existing = map.get(genre);

      if (existing) {
        existing.trackCount++;
        existing.trackIds.push(track.id);
      } else {
        map.set(genre, { trackCount: 1, trackIds: [track.id] });
      }
    }

    return [...map.entries()]
      .map(([genre, value]) => ({
        genre,
        trackCount: value.trackCount,
        trackIds: value.trackIds,
      }))
      .sort((a, b) => a.genre.localeCompare(b.genre));
  }, [tracks]);

  return (
    <Card className="h-full min-h-0 pt-0">
      <CardHeader className="relative overflow-hidden rounded-t-xl border-b bg-accent/10 py-2.5">
        {/* Decorative watermark: device and sync glyphs behind the header
            content, echoing the accent icon treatment of the add-source list. */}
        <div
          className="pointer-events-none absolute inset-0 select-none text-accent/10"
          aria-hidden="true"
        >
          <Usb className="absolute -left-2 -top-3 size-16 rotate-12" />

          <Headphones className="absolute left-1/4 -bottom-3 size-12 -rotate-12" />

          <Disc3 className="absolute left-1/2 -top-4 size-14 rotate-6" />

          <Speaker className="absolute right-1/3 -bottom-4 size-12 -rotate-6" />

          <ArrowDownToLine className="absolute -top-2 right-12 size-10 rotate-12" />

          <HardDrive className="absolute -right-3 bottom-0 size-16 -rotate-12" />
        </div>

        <div className="relative flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent ring-1 ring-accent/20"
              aria-hidden="true"
            >
              <Usb className="size-4" />
            </div>

            <div className="min-w-0">
              <div className="truncate font-medium">{device.name}</div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ArrowDownToLine className="size-3" />
                  Sync
                </span>

                {device.capabilities.database && (
                  <span className="flex items-center gap-1">
                    <Database className="size-3" />
                    Database
                  </span>
                )}

                {device.capabilities.artwork && (
                  <span className="flex items-center gap-1">
                    <Image className="size-3" />
                    Artwork
                  </span>
                )}

                {device.capabilities.playlists && (
                  <span className="flex items-center gap-1">
                    <ListMusic className="size-3" />
                    Playlists
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center text-sm text-muted-foreground">
                <div>{device.type}</div>

                {device.model && (
                  <div className="before:mx-2 before:content-['·']">
                    {device.model}
                  </div>
                )}

                {storageLabel && (
                  <div className="before:mx-2 before:content-['·']">
                    {storageLabel}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex flex-col gap-1.5 md:items-end">
              <Badge variant="outline" className="gap-1.5 bg-background">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    device.connected
                      ? "bg-primary"
                      : "bg-muted-foreground/40"
                  )}
                  aria-hidden="true"
                />
                {device.connected ? "Connected" : "Disconnected"}
              </Badge>

              <div className="flex flex-wrap gap-1.5 md:justify-end">
                {device.capabilities.database && (
                  <Badge variant="secondary">Database</Badge>
                )}

                {device.capabilities.artwork && (
                  <Badge variant="secondary">Artwork</Badge>
                )}

                {device.capabilities.playlists && (
                  <Badge variant="secondary">Playlists</Badge>
                )}

                {device.capabilities.playbackStats && (
                  <Badge variant="secondary">Playback Stats</Badge>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              className="size-10 shrink-0 rounded-lg p-0"
              title="Rescan for connected devices"
              aria-label="Rescan for connected devices"
              onClick={() => void refreshDevices()}
            >
              <RotateCw className="size-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        {storage && (
          <div className="space-y-1.5">
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`${formatBytes(usedBytes!)} used, ${formatBytes(queuedBytes)} queued, ${formatBytes(storage.freeBytes)} free`}
            >
              <div
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${storage.usedPct}%` }}
              />

              {storage.pendingPct > 0 && (
                <div
                  className="h-full bg-foreground transition-all duration-300"
                  style={{ width: `${storage.pendingPct}%` }}
                />
              )}
            </div>

            <div className="flex flex-wrap justify-between gap-x-3 text-xs text-muted-foreground tabular-nums">
              <span>{formatBytes(usedBytes!)} used</span>

              {queuedBytes > 0 && (
                <span className="text-foreground">
                  {formatBytes(queuedBytes)} queued
                </span>
              )}

              <span>{formatBytes(storage.freeBytes)} free</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <SyncStat
            label={
              (device.media?.tracks.length ?? 0) === 1 ? "Track" : "Tracks"
            }
            value={device.media?.tracks.length ?? 0}
          />

          <SyncStat
            label={
              (device.media?.playlists.length ?? 0) === 1
                ? "Playlist"
                : "Playlists"
            }
            value={device.media?.playlists.length ?? 0}
          />

          <SyncStat
            label="Used"
            value={usedBytes == null ? "—" : formatBytes(usedBytes)}
          />
        </div>

        <Tabs
          value={view}
          onValueChange={(next) => {
            setView(next as DeviceView);
            clearSelection();
          }}
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            !isEditing &&
            "**:data-[slot=checkbox]:hidden [&_button[aria-label^='Remove']]:hidden"
          )}
        >
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="songs">Songs</TabsTrigger>
              <TabsTrigger value="albums">Albums</TabsTrigger>
              <TabsTrigger value="artists">Artists</TabsTrigger>
              <TabsTrigger value="genres">Genres</TabsTrigger>
              <TabsTrigger value="playlists">Playlists</TabsTrigger>
            </TabsList>

            <div className="ml-auto flex items-center gap-1.5">
              {isEditing && selected.size > 0 && (
                <>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {selected.size} selected
                  </span>

                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={!device.connected || isRemoving}
                    onClick={() =>
                      setPendingRemove({
                        label: `${selected.size} selected track${selected.size === 1 ? "" : "s"
                          }`,
                        trackIds: [...selected],
                      })
                    }
                  >
                    <Minus />
                    Remove
                  </Button>

                  <Button size="sm" variant="ghost" onClick={clearSelection}>
                    Clear
                  </Button>
                </>
              )}

              <Button
                size="sm"
                variant={isEditing ? "secondary" : "outline"}
                className="shrink-0"
                aria-pressed={isEditing}
                title={
                  isEditing
                    ? "Stop managing tracks on this device"
                    : "Manage tracks on this device"
                }
                onClick={() => {
                  setIsEditing((current) => !current);
                  clearSelection();
                }}
              >
                {isEditing ? <Check /> : <Pencil />}
                Manage
              </Button>
            </div>
          </div>
          <TabsContent className="flex min-h-0 flex-1 flex-col" value="songs">
            <ScrollArea className="min-h-0 flex-1 rounded-md border py-0.5 px-1.5 overflow-y-auto">
              <div className="divide-y">
                {device.media?.tracks.map((track) => (
                  <div key={track.id}>
                    <Item className="p-0.5">
                      <Checkbox
                        checked={selected.has(track.id)}
                        disabled={!device.connected}
                        aria-label={`Select ${track.title ?? "Unknown Track"}`}
                        onCheckedChange={() => toggleIds([track.id])}
                      />

                      <ItemContent className="flex flex-row gap-2">
                        <ItemTitle>{track.title}</ItemTitle>
                        <ItemDescription>{track.artist}</ItemDescription>
                      </ItemContent>

                      <button
                        type="button"
                        className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent/15 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        title={`Remove ${track.title} from this device`}
                        aria-label={`Remove ${track.title} from this device`}
                        disabled={!device.connected}
                        onClick={() =>
                          setPendingRemove({
                            label: track.title ?? "Unknown Track",
                            trackIds: [track.id],
                          })
                        }
                      >
                        <Minus className="size-3" />
                      </button>
                    </Item>
                  </div>
                ))}
                {device.media.tracks.length == 0 && <>No tracks</>}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent className="flex min-h-0 flex-1 flex-col" value="albums">
            <ScrollArea className="min-h-0 flex-1 rounded-md border py-0.5 px-1.5 overflow-y-auto">
              <div className="divide-y">
                {albums.map((album) => (
                  <div key={`${album.artist}-${album.album}`}>
                    <Item className="p-0.5">
                      <Checkbox
                        checked={album.trackIds.every((id) => selected.has(id))}
                        disabled={!device.connected}
                        aria-label={`Select ${album.album || "Unknown Album"}`}
                        onCheckedChange={() => toggleIds(album.trackIds)}
                      />

                      <ItemContent className="flex flex-row gap-2">
                        <ItemTitle>
                          {album.album || "Unknown Album"}
                        </ItemTitle>
                        <ItemDescription>
                          {album.artist}
                          {" · "}
                          {album.trackCount === 1
                            ? "1 Track"
                            : `${album.trackCount} Tracks`}
                        </ItemDescription>
                      </ItemContent>

                      <button
                        type="button"
                        className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent/15 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        title={`Remove ${album.album || "Unknown Album"} from this device`}
                        aria-label={`Remove ${album.album || "Unknown Album"} from this device`}
                        disabled={!device.connected}
                        onClick={() =>
                          setPendingRemove({
                            label: album.album || "Unknown Album",
                            trackIds: album.trackIds,
                          })
                        }
                      >
                        <Minus className="size-3" />
                      </button>
                    </Item>
                  </div>
                ))}
                {albums.length == 0 && <>No albums</>}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent className="flex min-h-0 flex-1 flex-col" value="artists">
            <ScrollArea className="min-h-0 flex-1 rounded-md border py-0.5 px-1.5 overflow-y-auto">
              <div className="divide-y">
                {artists.map((artist) => (
                  <div key={artist.artist}>
                    <Item className="p-0.5">
                      <Checkbox
                        checked={artist.trackIds.every((id) => selected.has(id))}
                        disabled={!device.connected}
                        aria-label={`Select ${artist.artist}`}
                        onCheckedChange={() => toggleIds(artist.trackIds)}
                      />

                      <ItemContent className="flex flex-row gap-2">
                        <ItemTitle>{artist.artist}</ItemTitle>
                        <ItemDescription>
                          {artist.trackCount !== 1
                            ? `${artist.trackCount} Tracks`
                            : "1 Track"}
                        </ItemDescription>
                      </ItemContent>

                      <button
                        type="button"
                        className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent/15 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        title={`Remove ${artist.artist} from this device`}
                        aria-label={`Remove ${artist.artist} from this device`}
                        disabled={!device.connected}
                        onClick={() =>
                          setPendingRemove({
                            label: artist.artist,
                            trackIds: artist.trackIds,
                          })
                        }
                      >
                        <Minus className="size-3" />
                      </button>
                    </Item>
                  </div>
                ))}
                {artists.length == 0 && <>No artists</>}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent className="flex min-h-0 flex-1 flex-col" value="genres">
            <ScrollArea className="min-h-0 flex-1 rounded-md border py-0.5 px-1.5 overflow-y-auto">
              <div className="divide-y">
                {genres.map((genre) => (
                  <div key={genre.genre}>
                    <Item className="p-0.5">
                      <Checkbox
                        checked={genre.trackIds.every((id) => selected.has(id))}
                        disabled={!device.connected}
                        aria-label={`Select ${genre.genre}`}
                        onCheckedChange={() => toggleIds(genre.trackIds)}
                      />

                      <ItemContent className="flex flex-row gap-2">
                        <ItemTitle>{genre.genre}</ItemTitle>
                        <ItemDescription>
                          {genre.trackCount !== 1
                            ? `${genre.trackCount} Tracks`
                            : "1 Track"}
                        </ItemDescription>
                      </ItemContent>

                      <button
                        type="button"
                        className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent/15 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        title={`Remove ${genre.genre} from this device`}
                        aria-label={`Remove ${genre.genre} from this device`}
                        disabled={!device.connected}
                        onClick={() =>
                          setPendingRemove({
                            label: genre.genre,
                            trackIds: genre.trackIds,
                          })
                        }
                      >
                        <Minus className="size-3" />
                      </button>
                    </Item>
                  </div>
                ))}
                {genres.length == 0 && <>No genres</>}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent className="flex min-h-0 flex-1 flex-col" value="playlists">
            <ScrollArea className="min-h-0 flex-1 rounded-md border py-0.5 px-1.5 overflow-y-auto">
              <div className="divide-y">
                {device.media?.playlists.map((playlist) => (
                  <div key={playlist.id}>
                    <Item className="p-0.5">
                      <Checkbox
                        checked={playlist.trackIds.every((id) =>
                          selected.has(id)
                        )}
                        disabled={!device.connected}
                        aria-label={`Select ${playlist.name ?? "Unknown Playlist"}`}
                        onCheckedChange={() => toggleIds(playlist.trackIds)}
                      />

                      <ItemContent className="flex flex-row gap-2">
                        <ItemTitle>{playlist.name}</ItemTitle>
                        <ItemDescription>
                          {playlist.trackIds.length !== 1
                            ? `${playlist.trackIds.length} Tracks`
                            : "1 Track"}
                        </ItemDescription>
                      </ItemContent>

                      <button
                        type="button"
                        className="flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent/15 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
                        title={`Remove ${playlist.name} from this device`}
                        aria-label={`Remove ${playlist.name} from this device`}
                        disabled={!device.connected}
                        onClick={() =>
                          setPendingRemove({
                            label: playlist.name ?? "Unknown Playlist",
                            trackIds: playlist.trackIds,
                          })
                        }
                      >
                        <Minus className="size-3" />
                      </button>
                    </Item>
                  </div>
                ))}
                {device.media.playlists.length == 0 && <>No playlists</>}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>

      <Dialog
        open={pendingRemove !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemove(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove from device?</DialogTitle>
            <DialogDescription>
              <strong className="font-semibold text-foreground">
                {pendingRemove?.label ?? "This item"}
              </strong>{" "}
              will be deleted from{" "}
              <strong className="font-semibold text-foreground">
                {device.name}
              </strong>
              . The files are removed from the device; your library is not
              affected.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendingRemove(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              disabled={isRemoving}
              onClick={() => {
                if (!pendingRemove) return;
                setIsRemoving(true);

                void removeTracksFromDevice(
                  device,
                  pendingRemove.trackIds
                ).finally(() => {
                  setIsRemoving(false);
                  setPendingRemove(null);
                  clearSelection();
                });
              }}
            >
              {isRemoving ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
