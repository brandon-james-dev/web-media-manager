import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";

import type { SyncDevice } from "@/models";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { useMemo, useState } from "react";
import { Item, ItemContent, ItemDescription, ItemTitle } from "../ui/item";
import { ScrollArea } from "../ui/scroll-area";
import type { SyncTrack } from "@/models";

type DeviceView = "songs" | "albums" | "artists" | "playlists";

export interface SyncDeviceCardProps {
  device: SyncDevice;

  onRefresh(): Promise<void>;
}

export function SyncDeviceCard({ device, onRefresh }: SyncDeviceCardProps) {
  const [view, setView] = useState<DeviceView>("songs");

  const albums = useMemo(() => {
    const map = new Map<
      string,
      {
        artist?: string;
        album?: string;
        trackCount: number;
      }
    >();

    for (const track of device.media?.tracks ?? []) {
      const key = `${track.artist ?? ""}|${track.album ?? ""}`;

      const existing = map.get(key);

      if (existing) {
        existing.trackCount++;
      } else {
        map.set(key, {
          artist: track.artist,
          album: track.album,
          trackCount: 1,
        });
      }
    }

    return [...map.values()].sort((a, b) =>
      (a.album ?? "").localeCompare(b.album ?? "")
    );
  }, [device.media?.tracks]);

  const artists = useMemo(() => {
    const map = new Map<string, number>();

    for (const track of device.media?.tracks ?? []) {
      const artist = track.artist || "Unknown Artist";

      map.set(artist, (map.get(artist) ?? 0) + 1);
    }

    return [...map.entries()]
      .map(([artist, trackCount]) => ({
        artist,
        trackCount,
      }))
      .sort((a, b) => a.artist.localeCompare(b.artist));
  }, [device.media?.tracks]);

  return (
    <Card>
      <CardContent className="py-4 space-y-4">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <div className="font-medium">{device.name}</div>
            <div className="flex flex-wrap items-center text-sm text-muted-foreground">
              <div>{device.type}</div>

              {device.model && (
                <div className="before:mx-2 before:content-['·']">
                  {device.model}
                </div>
              )}

              <div className="before:mx-2 before:content-['·']">
                {Number(
                  (device.storage?.usedBytes ?? 0) / Math.pow(1024, 3)
                ).toFixed(2)}
                GB used
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-end gap-2">
              <Badge variant="outline">
                {device.connected ? "Connected" : "Disconnected"}
              </Badge>
              <Button
                size="xs"
                className="h-5 p-0.5 aspect-square"
                onClick={onRefresh}
              >
                <RefreshCw />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
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
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-4 md:col-span-1">
            <Card>
              <CardContent>
                <CardTitle>{device.media?.tracks.length ?? 0}</CardTitle>
                <CardDescription>
                  {(device.media?.tracks.length ?? 0) > 1 ? "Tracks" : "Track"}
                </CardDescription>
              </CardContent>
            </Card>
          </div>
          <Tabs
            value={view}
            onValueChange={setView}
            className="col-span-4 md:col-span-3"
          >
            <TabsList>
              <TabsTrigger value="songs">Songs</TabsTrigger>
              <TabsTrigger value="albums">Albums</TabsTrigger>
              <TabsTrigger value="artists">Artists</TabsTrigger>
              <TabsTrigger value="playlists">Playlists</TabsTrigger>
            </TabsList>
            <TabsContent value="songs">
              <ScrollArea className="max-h-72 overflow-y-auto">
                <div className="divide-y">
                  {device.media?.tracks.map((track) => (
                    <div key={track.id}>
                      <Item className="p-0.5">
                        <ItemContent className="flex flex-row gap-2">
                          <ItemTitle>{track.title}</ItemTitle>
                          <ItemDescription>{track.artist}</ItemDescription>
                        </ItemContent>
                      </Item>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="albums">
              <ScrollArea className="max-h-72 overflow-y-auto">
                <div className="divide-y">
                  {albums.map((album) => (
                    <div key={`${album.artist}-${album.album}`}>
                      <Item className="p-0.5">
                        <ItemContent className="flex flex-row gap-2">
                          <ItemTitle>
                            {album.album || "Unknown Album"}
                          </ItemTitle>
                          <ItemDescription>
                            {album.artist}
                            {" · "}
                            {album.trackCount > 1
                              ? `${album.trackCount} Tracks`
                              : "1 Track"}
                          </ItemDescription>
                        </ItemContent>
                      </Item>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="artists">
              <ScrollArea className="max-h-72 overflow-y-auto">
                <div className="divide-y">
                  {artists.map((artist) => (
                    <div key={artist.artist}>
                      <Item className="p-0.5">
                        <ItemContent className="flex flex-row gap-2">
                          <ItemTitle>{artist.artist}</ItemTitle>
                          <ItemDescription>
                            {artist.trackCount > 1
                              ? `${artist.trackCount} Tracks`
                              : "1 Track"}
                          </ItemDescription>
                        </ItemContent>
                      </Item>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="playlists">
              <ScrollArea className="max-h-72 overflow-y-auto">
                <div className="divide-y">
                  {device.media?.playlists.map((playlist) => (
                    <div key={playlist.id}>
                      <Item className="p-0.5">
                        <ItemContent className="flex flex-row gap-2">
                          <ItemTitle>{playlist.name}</ItemTitle>
                          <ItemDescription>
                            {playlist.trackIds.length > 1
                              ? `${playlist.trackIds.length} Tracks`
                              : "1 Track"}
                          </ItemDescription>
                        </ItemContent>
                      </Item>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
