import { createElement, useEffect, useState } from "react";
import {
  type ThemeProviderProps,
  type Theme,
  ThemeProviderContext,
} from "./theme-provider-props";

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultAccentColor = "#3b82f6",
  storageKey = "ui-theme",
  accentStorageKey = "ui-accent",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );

  const [accentColor, setAccentColorState] = useState<string>(
    () => localStorage.getItem(accentStorageKey) || defaultAccentColor
  );

  // Apply theme (existing behavior)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
      return;
    }

    root.classList.add(theme);
  }, [theme]);

  // Apply accent color
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", accentColor);
  }, [accentColor]);

  const setAccentColor = (color: string) => {
    localStorage.setItem(accentStorageKey, color);
    setAccentColorState(color);
  };

  const value = {
    theme,
    setTheme: (t: Theme) => {
      localStorage.setItem(storageKey, t);
      setTheme(t);
    },

    accentColor,
    setAccentColor,
  };

  const Context = ThemeProviderContext;

  return createElement(Context.Provider, { ...props, value }, children);
}
