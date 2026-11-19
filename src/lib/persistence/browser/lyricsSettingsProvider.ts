import { setLyricsSettingsStoreProvider } from "@/core/ports";
import { DexieLyricsSettingsStore } from "../dexie/DexieLyricsSettingsStore";

/**
 * Browser binding for the lyrics settings port. Called during app bootstrap,
 * before any lyrics lookup reads its configuration.
 */
export function registerBrowserLyricsSettingsStoreProvider(): void {
  setLyricsSettingsStoreProvider(() => new DexieLyricsSettingsStore());
}
