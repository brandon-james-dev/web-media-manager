/** One record of the LRCLIB `/api/search` response. */
export interface ILrcLibSearchResult {
  id: number;
  trackName: string;
  artistName: string;
  albumName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
  hasWordSync?: boolean;
}
