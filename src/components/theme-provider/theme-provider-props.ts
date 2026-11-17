import { createContext } from "react";

export type Theme = "dark" | "light" | "system";

export type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultAccentColor?: string;
  storageKey?: string;
  accentStorageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;

  accentColor: string;
  setAccentColor: (color: string) => void;

  lockedScheme: "light" | "dark" | undefined;
  accentLocked: boolean;
};

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,

  accentColor: "#3b82f6",
  setAccentColor: () => null,

  lockedScheme: undefined,
  accentLocked: false,
};

export const ThemeProviderContext =
  createContext<ThemeProviderState>(initialState);
