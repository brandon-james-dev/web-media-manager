import type { Song } from "@/models/Song";
import type { IMetadataStore } from "../metadata-utils/IMetadataStore";

export class FileSystemMetadataStore implements IMetadataStore {
  private _root?: FileSystemDirectoryHandle | undefined;
  private songs: Map<string, Song>;

  constructor(
    rootDirectory?: FileSystemDirectoryHandle,
    songs?: Map<string, Song>
  ) {
    this.root = rootDirectory;
    this.songs = songs ?? new Map<string, Song>();
  }

  public get root(): FileSystemDirectoryHandle | undefined {
    return this._root;
  }
  public set root(value: FileSystemDirectoryHandle | undefined) {
    this._root = value;
  }

  async deleteSong(id: string): Promise<void> {
    this.songs.delete(id);
  }

  async getAllSongs(): Promise<Song[]> {
    return Array.from(this.songs.values());
  }

  async getSong(id: string): Promise<Song | null> {
    const song = this.songs.get(id);
    if (!song || !song.fileHandle) return null;

    let dir = this.root;

    if (song.path) {
      const parts = song.path.split("/").filter(Boolean);
      for (const part of parts) {
        dir = await dir?.getDirectoryHandle(part);
      }
    }

    const fileHandle = await dir?.getFileHandle(song.fileHandle?.name, {
      create: false,
    });

    return {
      ...song,
      fileHandle,
    };
  }

  async saveSong(id: string, updated: Song): Promise<Song> {
    this.songs.set(id, updated);
    const updatedSong = await this.getSong(id);

    if (!updatedSong) {
      throw new Error("The song was not saved");
    }

    return updatedSong;
  }
}
