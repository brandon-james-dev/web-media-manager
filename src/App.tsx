import { Routes, Route } from "react-router";
import {
  Songs,
  Albums,
  Artists,
  Playlists,
  MainLayout,
  Settings,
  Sync,
} from "./pages";
import { NavBar } from "./layout";
import { SongProvider, SyncProvider, VisualizerProvider } from "./providers";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { PlaybackProvider } from "./providers/PlaybackProvider";
import { useEffect, useState } from "react";
import { keyShortcut$ } from "@/events";
import { registerDefaultShortcuts } from "./lib/keyboard-shortcuts/registerDefaultShortcuts";
import { KeyboardShortcutsModal } from "./components/keyboard-shortcuts-modal";
import { handleKey } from "./lib";
import { registerBrowserStoreProvider } from "./lib/persistence/browser/storeProvider";
import { registerBrowserMetadataReader } from "./lib/metadata/reader/browserMetadataReader";
import { registerBrowserSourceProvider } from "./lib/persistence/browser/sourcesProvider";
import { registerBrowserJobService } from "./lib/background-jobs/jobServiceProvider";
import { registerBrowserVisualizerStoreProvider } from "./lib/persistence/browser/visualizerStoreProvider";
import { resumeInterruptedJobs } from "./lib/background-jobs";
import { ensureFavorites } from "./core/playlists";
import { resyncAllSources } from "./lib/sources";
import { ensureExampleVisualizers } from "./lib/visualizers";
import { connectCommandDispatch, wmmBus } from "./events";
import { installTvNavigation } from "./lib/tv";
import "./events/job-notifications";
import "./events/playlist-import-events";

// Wire the browser persistence adapter behind the core store port for the
// lifetime of the app, before any component/provider calls into core.
registerBrowserStoreProvider();
registerBrowserMetadataReader();
registerBrowserSourceProvider();
registerBrowserJobService();
registerBrowserVisualizerStoreProvider();

// Restore jobs a previous session left unfinished, then re-import every
// configured source on startup so the library stays in sync
// with what's on the sources (local folders + remote servers).
void ensureFavorites().catch(() => {});

void resumeInterruptedJobs()
  .catch(() => new Set<string>())
  .then((restored) => resyncAllSources(restored));

// Seed the bundled particle visualizer on first run, after the plugin store
// provider is registered.
void ensureExampleVisualizers().catch(() => {});

// Connect the bus to the command dispatcher: bus.invoke() -> registered
// handlers (providers/UI register commands; this makes them reachable).
const disconnectCommandDispatch = connectCommandDispatch();
// A hot reload re-runs this module; drop the old link so each command is
// dispatched once (two links would run play/pause twice and cancel out).
import.meta.hot?.dispose(disconnectCommandDispatch);

function App() {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (target.closest("[data-context-menu]")) {
        return;
      }

      event.preventDefault();
    };

    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  useEffect(() => {
    registerDefaultShortcuts();

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Remote-control navigation, installed only on a television browser.
  useEffect(() => installTvNavigation(), []);

  useEffect(() => {
    const sub = keyShortcut$.subscribe((shortcut) => {
      if (shortcut === "openShortcuts") setIsShortcutsOpen(!isShortcutsOpen);
    });

    // Also listen for the ui.openShortcuts command on the bus so any
    // gesture/configurable binding can open the shortcuts modal.
    const offCmd = wmmBus.onCommand("wmm.ui.openShortcuts", () =>
      setIsShortcutsOpen((prev) => !prev)
    );

    return () => {
      sub.unsubscribe();
      offCmd();
    };
  });

  return (
    <ThemeProvider>
      {/* h-dvh: track the dynamic viewport height so the bottom app bar stays
          visible when mobile browsers collapse/expand their address bar
          (100vh can exceed the visible viewport, hiding the player/editor). */}
      <div className="flex flex-col h-dvh">
        <header className="shrink-0 border-b pt-[env(safe-area-inset-top)]">
          <NavBar />
        </header>

        <main className="flex-1 overflow-hidden">
          <SongProvider>
            <PlaybackProvider>
              <VisualizerProvider>
                <SyncProvider>
                  <Routes>
                    <Route path="/" element={<MainLayout />}>
                      <Route path="/" element={<Songs />} />
                      <Route path="songs" element={<Songs />} />
                      <Route path="songs/:mode" element={<Songs />} />
                      <Route path="albums" element={<Albums />} />
                      <Route path="albums/:mode" element={<Albums />} />
                      <Route path="artists" element={<Artists />} />
                      <Route path="artists/:mode" element={<Artists />} />
                      <Route path="playlists" element={<Playlists />} />
                      <Route path="playlists/:mode" element={<Playlists />} />
                      <Route path="sync" element={<Sync />} />
                    </Route>

                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </SyncProvider>
              </VisualizerProvider>
            </PlaybackProvider>
          </SongProvider>

          <KeyboardShortcutsModal
            open={isShortcutsOpen}
            onOpenChange={setIsShortcutsOpen}
          />
        </main>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
