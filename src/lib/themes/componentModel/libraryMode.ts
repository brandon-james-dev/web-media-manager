/**
 * The library mode an element renders in, set with the `libraryMode`
 * attribute. Allowed on any element in the Shell or in a page whose role is
 * `library`, `artists`, `albums` or `playlists` (`E6201` elsewhere). The
 * element collapses in the other mode, so the layout reflows. It is a closed
 * host state, not an expression.
 *
 * @example
 * ```xml
 * <MetadataEditor dock="bottom" libraryMode="edit" mode="full" height="320" />
 * ```
 * @example
 * ```ts
 * const visible = element.libraryMode === undefined || element.libraryMode === mode;
 * ```
 */
export const LibraryMode = {
  /**
   * The default mode: the library plays music. Use it for the playback bar.
   *
   * @example
   * ```xml
   * <Panel dock="bottom" libraryMode="playback" style="@panel/playback-bar" />
   * ```
   */
  Playback: "playback",
  /**
   * The mode `wmm.ui.toggleEditMode` switches to. Use it for the metadata
   * editor.
   *
   * @example
   * ```xml
   * <MetadataEditor dock="bottom" libraryMode="edit" mode="full" height="320" />
   * ```
   */
  Edit: "edit",
} as const;

/**
 * One of the {@link LibraryMode} values.
 *
 * @example
 * ```ts
 * let mode: LibraryMode = LibraryMode.Playback;
 * mode = mode === LibraryMode.Edit ? LibraryMode.Playback : LibraryMode.Edit;
 * ```
 */
export type LibraryMode = (typeof LibraryMode)[keyof typeof LibraryMode];
