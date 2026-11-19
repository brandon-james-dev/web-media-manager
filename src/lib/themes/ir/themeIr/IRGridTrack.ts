/**
 * One grid track: a pixel width, a star share, or content-sized.
 *
 * @example
 * ```xml
 * <Grid columns="220 1* auto" rows="1*" />
 * ```
 * @example
 * ```ts
 * const tracks: IRGridTrack[] = [
 *   { type: "px", value: 220 },
 *   { type: "star", share: 1 },
 *   { type: "auto" },
 * ];
 * ```
 */
export type IRGridTrack =
  | { readonly type: "px"; readonly value: number }
  | { readonly type: "star"; readonly share: number }
  | { readonly type: "auto" };
