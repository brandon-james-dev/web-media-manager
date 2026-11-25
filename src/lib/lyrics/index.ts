export {
  activePlacementAt,
  appendStaticLine,
  canPlaceAt,
  placementWindow,
  formatTimecode,
  formatTimestamp,
  mapPlacementsToLines,
  isInsideWindow,
  parseLrc,
  parseTimecode,
  serializeLrc,
  splitTimedLyrics,
  staticLines,
  syncPlacementsToLyrics,
  trimPlacementsAfterInsertion,
  validateSync,
} from "./lrc";
export type {
  ILyricLine,
  ISyncIssue,
  SyncIssueReason,
} from "./lrc";
