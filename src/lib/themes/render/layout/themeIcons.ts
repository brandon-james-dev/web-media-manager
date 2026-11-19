import {
  ArrowLeft,
  AudioLines,
  Disc3,
  FastForward,
  Heart,
  Library,
  ListMusic,
  ListOrdered,
  Maximize,
  Menu,
  MicVocal,
  Minimize,
  Moon,
  MoreHorizontal,
  Music,
  PanelLeft,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Repeat,
  Repeat1,
  Rewind,
  Search,
  Settings,
  Shuffle,
  SkipBack,
  SkipForward,
  Square,
  Usb,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { IconName } from "../../componentModel/iconNames";

/**
 * The vector icon each `@icon/...` name draws. Every name in the host set
 * has an entry, so a theme never renders a missing icon.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.next" labelKey="playback.next" icon="@icon/next" />
 * ```
 * @example
 * ```ts
 * const Icon = THEME_ICONS.next;
 * ```
 */
export const THEME_ICONS: Readonly<Record<IconName, LucideIcon>> = {
  play: Play,
  pause: Pause,
  playPause: Play,
  stop: Square,
  next: SkipForward,
  prev: SkipBack,
  shuffle: Shuffle,
  repeat: Repeat,
  volume: Volume2,
  mute: Volume2,
  search: Search,
  settings: Settings,
  sync: RefreshCw,
  device: Usb,
  library: Library,
  artists: Users,
  albums: Disc3,
  playlists: ListMusic,
  nowPlaying: Music,
  visualizer: AudioLines,
  edit: Pencil,
  add: Plus,
  close: X,
  back: ArrowLeft,
  menu: Menu,
  more: MoreHorizontal,
  queue: ListOrdered,
  lyrics: MicVocal,
  fullscreen: Maximize,
  darkRoom: Moon,
  seekForward: FastForward,
  seekBack: Rewind,
  favorite: Heart,
  sidebar: PanelLeft,
};

/**
 * The face an icon swaps to while its button is active. `activeValues` picks
 * a face per active value, so `repeat` shows the repeat-one face only while
 * repeat is in the `one` mode.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.toggleRepeat" labelKey="playback.repeat" icon="@icon/repeat" />
 * ```
 * @example
 * ```ts
 * const swap: IconSwap = { active: Pause };
 * ```
 */
export interface IconSwap {
  /** The face drawn while the button is active. */
  readonly active: LucideIcon;
  /** The face drawn for one specific active value. */
  readonly activeValues?: Readonly<Record<string, LucideIcon>>;
}

/**
 * The icons with a second face, keyed by the name the theme references. The
 * renderer picks the face from the button's host state.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.playpause" labelKey="playback.playPause" icon="@icon/playPause" />
 * ```
 * @example
 * ```ts
 * ICON_SWAPS.playPause?.active; // Pause
 * ```
 */
export const ICON_SWAPS: Readonly<Partial<Record<IconName, IconSwap>>> = {
  playPause: { active: Pause },
  repeat: { active: Repeat, activeValues: { one: Repeat1 } },
  mute: { active: VolumeX },
  fullscreen: { active: Minimize },
};

/**
 * The icon component to draw for a name and a button state. An icon without
 * a swap keeps its single face, and a valued swap falls back to the plain
 * active face when the value has no entry.
 *
 * @example
 * ```xml
 * <Button command="wmm.playback.toggleRepeat" labelKey="playback.repeat" icon="@icon/repeat" />
 * ```
 * @example
 * ```ts
 * resolveThemeIcon("repeat", { active: true, activeValue: "one" }); // Repeat1
 * ```
 */
export function resolveThemeIcon(
  name: IconName,
  state: { readonly active: boolean; readonly activeValue?: string }
): LucideIcon {
  const swap = ICON_SWAPS[name];
  if (swap === undefined || !state.active) return THEME_ICONS[name];
  if (state.activeValue !== undefined) {
    const valued = swap.activeValues?.[state.activeValue];
    if (valued !== undefined) return valued;
  }
  return swap.active;
}
