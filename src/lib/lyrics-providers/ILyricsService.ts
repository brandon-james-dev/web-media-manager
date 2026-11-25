import type {
  LyricsLookupOptions,
  LyricsQuery,
  LyricsResult,
  LyricsService,
  LyricsServiceConfig,
} from "@/core/contracts";

/**
 * The lyrics provider contract lives in core (`@/core/contracts`), because a
 * provider is a public extension seam. These aliases keep the provider
 * implementations and their tests reading the same names they always have.
 */
export type ILyricsQuery = LyricsQuery;
export type ILyricsResult = LyricsResult;
export type ILyricsServiceConfig = LyricsServiceConfig;
export type ILyricsLookupOptions = LyricsLookupOptions;
export type ILyricsService = LyricsService;
