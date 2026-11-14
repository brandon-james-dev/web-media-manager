import type { Song } from "@/models";

/** An extra overflow-menu entry for a track row. */
export interface TrackItemAction {
  label: string;
  onSelect: (song: Song) => void;
  /** Destructive styling (red text). */
  destructive?: boolean;
}

/**
 * Props for TrackItem — a compact, tappable song row built on the shadcn
 * Item primitives. Presentational: it owns no store/playback calls, so it
 * composes anywhere tracks are browsed — the artist detail column, a
 * playlist, search results, or a mobile list where the table doesn't fit.
 */
export interface TrackItemProps {
  /** The song this row represents. */
  song: Song;
  /** Leading track number fallback (the song's own track wins). */
  index?: number;
  /** Leading number that wins over the album track (e.g. playlist position). */
  position?: number;
  /** Hide the leading number entirely (e.g. search results). */
  hideNumber?: boolean;
  /** Highlight the row (accent text) — e.g. the currently playing song. */
  isPlaying?: boolean;
  /** Show a cover thumbnail on the leading edge (mobile browsing aid). */
  showArtwork?: boolean;
  /** Show artist — album meta under the title (default true). */
  showMeta?: boolean;
  /** Play this track (row activation, row double-click, and Play action). */
  onPlay?: (song: Song) => void;
  /**
   * Override the row's double-click. Provided, double-click does this
   * instead of the default activation (e.g. edit mode: open the advanced
   * editor rather than play).
   */
  onDoubleClick?: (song: Song) => void;
  /**
   * Single-click on the row (opt-in: without it the row is click-inert,
   * matching the default double-click-to-activate behavior). E.g. edit
   * mode: single-click opens quick edit.
   */
  onClick?: (song: Song) => void;
  /**
   * ⋯ menu entries. Play/shuffle/edit are deliberately NOT mirrored into the
   * menu from the callbacks above — the row's inline play/pause button and the
   * shared right-click song context menu already surface those — so the ⋯
   * button only renders when a host adds items here.
   */
  actions?: TrackItemAction[];
  /** Density; `xs` is the tight mobile list look. */
  size?: "default" | "sm" | "xs";
  /**
   * Make the row itself a focus stop. Television remotes move focus with the
   * arrow keys and activate with Enter, so the row must be reachable without a
   * pointer; the row is not a native button (it contains its own), so Enter is
   * handled by the TV navigation layer clicking the focused element.
   */
  focusable?: boolean;
  className?: string;
}
