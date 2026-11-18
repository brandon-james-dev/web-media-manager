/**
 * The page a theme layout can navigate to. A theme registers a handler while
 * its layout is mounted, and the app asks it before falling back to the
 * built-in routes.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.navigate" commandParameter="songs" />
 * ```
 * @example
 * ```ts
 * const handler: ThemeNavigationHandler = {
 *   handlesPage: (page) => page === "songs",
 *   navigate: (page) => console.log(page),
 * };
 * ```
 */
export interface ThemeNavigationHandler {
  handlesPage(page: string): boolean;
  navigate(page: string): void;
}

let current: ThemeNavigationHandler | undefined;

/**
 * Registers the theme navigation handler and returns a disposer. The disposer
 * clears the handler only while it is still the one this call installed, so a
 * late unmount cannot remove its replacement.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.navigate" commandParameter="albums" />
 * ```
 * @example
 * ```ts
 * const dispose = setThemeNavigationHandler(handler);
 * dispose();
 * ```
 */
export function setThemeNavigationHandler(
  handler: ThemeNavigationHandler | undefined
): () => void {
  current = handler;
  return () => {
    if (current === handler) current = undefined;
  };
}

/**
 * The handler a mounted theme layout registered, if any.
 *
 * @example
 * ```xml
 * <Button command="wmm.ui.navigate" commandParameter="playlists" />
 * ```
 * @example
 * ```ts
 * getThemeNavigationHandler()?.handlesPage("playlists"); // true
 * ```
 */
export function getThemeNavigationHandler():
  ThemeNavigationHandler | undefined {
  return current;
}
