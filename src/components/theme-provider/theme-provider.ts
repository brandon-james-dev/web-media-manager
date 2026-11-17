import {
  createElement,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { activeTheme, isSafeMode } from "@/core/themes";
import { getThemeStore } from "@/core/ports";
import { reloadActiveTheme } from "@/lib/themes/getThemeManager";
import type { ColorScheme } from "@/lib/themes/package";
import {
  buildThemeTokens,
  createThemeMirror,
  writeThemeMirror,
} from "@/lib/themes/runtime";
import {
  ThemeFontLoader,
  applyColorSchemeClass,
  getRootTokenApplier,
} from "@/lib/themes/runtime/browser";
import { safeStorageGet, safeStorageSet } from "@/lib/safeStorage";
import {
  type ThemeProviderProps,
  type Theme,
  ThemeProviderContext,
} from "./theme-provider-props";

const themeFontLoader = new ThemeFontLoader(document.fonts, (themeId, path) =>
  getThemeStore()
    .files.getFile(themeId, path)
    .then((record) => record?.bytes)
);

/**
 * Applies the display preference and, when a custom theme is active, its
 * tokens: palette variables on the root element, the root font family of its
 * default text style, the scheme class, and a localStorage mirror so the next
 * first paint is already themed. Safe mode (`?theme=default`) skips the
 * mirror, and a switch updates the DOM in place.
 *
 * @example
 * ```xml
 * <Palettes>
 *   <Palette scheme="dark">
 *     <Set slot="background" value="#0b1a3a" />
 *   </Palette>
 * </Palettes>
 * ```
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultAccentColor = "#3b82f6",
  storageKey = "ui-theme",
  accentStorageKey = "ui-accent",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (safeStorageGet(storageKey) as Theme) || defaultTheme
  );

  const [accentColor, setAccentColorState] = useState<string>(
    () => safeStorageGet(accentStorageKey) || defaultAccentColor
  );

  const [systemScheme, setSystemScheme] = useState<ColorScheme>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  );

  const snapshot = useSyncExternalStore(
    activeTheme.subscribe,
    activeTheme.getSnapshot
  );
  const active = snapshot.theme;
  const preferred: ColorScheme = theme === "system" ? systemScheme : theme;
  const safeMode = isSafeMode(window.location.search);

  useEffect(() => {
    void reloadActiveTheme();
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemScheme(query.matches ? "dark" : "light");
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const root = document.documentElement;

    if (active !== undefined) {
      const tokens = buildThemeTokens(active.ir, {
        scheme: preferred,
        userAccent: accentColor,
      });
      applyColorSchemeClass(root, tokens.scheme);
      getRootTokenApplier().apply(tokens);
      if (!safeMode) {
        writeThemeMirror(
          window.localStorage,
          createThemeMirror(active.ir, accentColor)
        );
      }
      return;
    }

    if (snapshot.loaded) {
      getRootTokenApplier().clear();
      applyColorSchemeClass(root, preferred);
      root.style.setProperty("--accent", accentColor);
      if (!safeMode) writeThemeMirror(window.localStorage, undefined);
      return;
    }

    if (getRootTokenApplier().hasTokens) return;
    applyColorSchemeClass(root, preferred);
    root.style.setProperty("--accent", accentColor);
  }, [active, snapshot.loaded, preferred, accentColor, safeMode]);

  useEffect(() => {
    void themeFontLoader.load(active?.id ?? "", active?.ir);
  }, [active]);

  const setAccentColor = (color: string) => {
    safeStorageSet(accentStorageKey, color);
    setAccentColorState(color);
  };

  const lockedScheme =
    active !== undefined && active.ir.colorSchemes.length === 1
      ? active.ir.colorSchemes[0]
      : undefined;
  const accentLocked = active !== undefined && !active.ir.honorsUserAccent;

  const value = {
    theme,
    setTheme: (t: Theme) => {
      safeStorageSet(storageKey, t);
      setTheme(t);
    },

    accentColor,
    setAccentColor,

    lockedScheme,
    accentLocked,
  };

  const Context = ThemeProviderContext;

  return createElement(Context.Provider, { ...props, value }, children);
}
