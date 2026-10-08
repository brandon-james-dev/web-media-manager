import type { SyncDevice } from "@/models";
import type { DeviceDetector } from "./DeviceDetector";
import { uuidv7 } from "uuidv7";
import { type UsbDeviceInfo } from "../usb";

// TODO: Postponing to another date
export class IpodDetector implements DeviceDetector {
  async detect(
    usb?: UsbDeviceInfo,
    root?: FileSystemDirectoryHandle
  ): Promise<SyncDevice> {
    if (!root) throw new Error("The root directory was not found");
    // const usbInfo = usb ?? (await this.tryGetUsbInfo());

    // const itunesDb = await IpodDetector.getItunesDb(root);
    // const artworkDb = await IpodDetector.getArtworkDb(root);

    //#region Map to sync models
    // const playlists: SyncPlaylist[] = itunesDb.playlists.map((playlist) => {
    //   return {
    //     id: playlist.id,
    //     name: `${playlist.name}${playlist.isMaster && " (Master)"}`,
    //     trackIds: playlist.items.map((t) => t.trackId),
    //   };
    // });

    // const artworks: SyncArtwork[] = artworkDb.images.map((image) => {
    //   return {
    //     id: image.id,
    //     formats: image.thumbnails.map((t) => {
    //       return {
    //         formatId: t.formatId,
    //         width: t.width,
    //         height: t.height,
    //         fileName: t.filename,
    //       };
    //     }),
    //   };
    // });

    // const tracks: SyncTrack[] = itunesDb.tracks.map((track) => {
    //   return {
    //     id: track.id,
    //     title: track.title,
    //     album: track.album,
    //     artist: track.artist,
    //     durationMs: track.length,
    //   };
    // });

    // const media: SyncLibrary = {
    //   artworks,
    //   playlists,
    //   tracks,
    // };

    // const model = usbInfo?.productId
    //   ? String(getIpodModel(usbInfo.productId))
    //   : "iPod";

    //#endregion

    return {
      id: uuidv7(),
      name: root.name,
      type: "iPod",
      media: {
        artworks: [],
        playlists: [],
        tracks: [],
      },
      // model,
      usb,
      capabilities: {
        database: true,
        artwork: true,
        playlists: true,
        playbackStats: true,
      },
      rootHandle: root,
      createdAt: Date.now(),
      connected: true,
    };
  }

  // private async tryGetUsbInfo() {
  //   try {
  //     const usbDevice = await navigator.usb.requestDevice({
  //       filters: [
  //         { classCode: 0x06 }, // MTP/PTP
  //         { classCode: 0x08 }, // Mass Storage
  //       ],
  //     });

  //     return mapUsbDevice(usbDevice);
  //   } catch {
  //     return undefined;
  //   }
  // }

  // static async getItunesDbFile(
  //   root: FileSystemDirectoryHandle
  // ): Promise<FileSystemFileHandle> {
  //   const control = await root.getDirectoryHandle("iPod_Control");

  //   const iTunes = await control.getDirectoryHandle("iTunes");
  //   const iTunesDbFh = await iTunes.getFileHandle("iTunesDB");
  //   return iTunesDbFh;
  // }

  // static async getItunesDb(root: FileSystemDirectoryHandle): Promise<ITunesDb> {
  //   const iTunesDbFh = await IpodDetector.getItunesDbFile(root);
  //   const iTunesDbFile = await iTunesDbFh.getFile();
  //   const iTunesDbBuf = await iTunesDbFile.arrayBuffer();
  //   const iTunesDbUint8Buf = new Uint8Array(iTunesDbBuf);

  //   const itunesDb = parseITunesDb(iTunesDbUint8Buf);
  //   return itunesDb;
  // }

  // static async getArtworkDbFile(
  //   root: FileSystemDirectoryHandle
  // ): Promise<FileSystemFileHandle> {
  //   const control = await root.getDirectoryHandle("iPod_Control");
  //   const artwork = await control.getDirectoryHandle("Artwork");
  //   const artworkDbFh = await artwork.getFileHandle("ArtworkDB");
  //   return artworkDbFh;
  // }

  // static async getArtworkDb(
  //   root: FileSystemDirectoryHandle
  // ): Promise<ArtworkDb> {
  //   const artworkDbFh = await IpodDetector.getArtworkDbFile(root);
  //   const artworkDbFile = await artworkDbFh.getFile();
  //   const artworkDbBuf = await artworkDbFile.arrayBuffer();
  //   const uint8ArtworkDbBufBuf = new Uint8Array(artworkDbBuf);

  //   const artworkDb = parseArtworkDb(uint8ArtworkDbBufBuf);
  //   return artworkDb;
  // }
}
