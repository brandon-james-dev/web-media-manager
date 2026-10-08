export interface SyncArtwork {
  id: number;

  formats: SyncArtworkFormat[];
}

export interface SyncArtworkFormat {
  formatId: number;

  width: number;
  height: number;

  fileName: string;
}

export interface SyncArtworkSource {
  loadArtwork(
    artworkId: string,
    formatId?: number
  ): Promise<ImageBitmap | ImageData>;
}
