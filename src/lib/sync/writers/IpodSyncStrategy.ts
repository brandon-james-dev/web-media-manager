import type { SyncDevice, Song } from "@/models";
import type { ISyncStrategy } from "./ISyncStrategy";

export class IpodSyncStrategy implements ISyncStrategy {
  canHandle(device: SyncDevice): boolean {
    return device.type === "iPod";
  }

  async sync(device: SyncDevice, songs: Song[]): Promise<void> {
    if (!device && !songs)
      throw new Error("There was no device or songs selected to sync to it!");
    // const root = device.rootHandle;
    // if (!root) throw new Error("Device root missing.");
    // if (!device.productId) throw new Error("Device product ID missing.");
    // const fs = new BrowserFs(root);
    // const itdbDevice = getItdbDeviceModel(device.productId);
    // const itdb = await Itdb.open(fs, { device: itdbDevice });
    // itdb.clear();
    // const metadataStore = getMetadataStore() as CombinedMetadataStore;
    // for (const song of songs) {
    //   const fileHandle = await metadataStore
    //     .getFileSystem()
    //     .getFileHandle(song.id);
    //   if (!fileHandle)
    //     throw new Error(`File not available for "${song.filename}"`);
    //   const file = await fileHandle.getFile();
    //   const trackBytes = new Uint8Array(await file.arrayBuffer());
    //   await itdb.addTrack(this.mapSongToTrackStrings(song), trackBytes);
    // }
    // await itdb.save();
  }

  // private mapSongToTrackStrings(song: Song): TrackStrings {
  //   return {
  //     title: song.title,
  //     album: song.album,
  //     artist: song.artist,
  //     genre: song.genre,
  //     comment: song.comment,
  //     composer: song.composer,
  //     albumArtist: song.albumArtist,
  //   };
  // }
}
