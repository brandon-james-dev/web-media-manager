// Metadata capabilities grouped by read / write, with artwork as a
// distinct concern. Interfaces (IMetadataReader/IMetadataWriter) live in
// ../contracts; these folders hold the operations + any local impls.
export {
  applySongEdits,
  createCombinedWriteStrategy,
  renameFile,
} from "./writer";
export {
  readSongFile,
  readSongFiles,
  loadSongMetadata,
  importSongs,
} from "./reader";
export {
  getArtworkForSong,
  getPicturesForSong,
  getPicturesForSongOfType,
  resizeBitmap,
  ThumbnailSize,
} from "./artwork";
