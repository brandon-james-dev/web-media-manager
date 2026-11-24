import { Routes, Route, useNavigate } from "react-router";
import {
  Songs,
  Albums,
  Artists,
  Playlists,
  MainLayout,
  Settings,
  Sync,
} from "./pages";
import { TvBrowse, TvDetail, TvHome } from "./pages/Tv";
import { useIsTv } from "./lib/hooks/useIsMobile";
import { NavBar } from "./layout";
import { SongProvider, SyncProvider, VisualizerProvider } from "./providers";
import { AddDeviceProvider } from "./components/sync";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { ThemeTrialBar } from "./components/theme-provider/ThemeTrialBar";
import { PlaybackProvider } from "./providers/PlaybackProvider";
import { useEffect, useState } from "react";
import { keyShortcut$ } from "@/events";
import { registerDefaultShortcuts } from "./lib/keyboard-shortcuts/registerDefaultShortcuts";
import { AboutDialog } from "./components/about-dialog";
import type { AboutTab } from "./components/about-dialog";
import { TvFullscreenPrompt } from "./components/tv";
import { handleKey } from "./lib";
import { registerBrowserStoreProvider } from "./lib/persistence/browser/storeProvider";
import { registerBrowserMetadataReader } from "./lib/metadata/reader/browserMetadataReader";
import { registerBrowserSourceProvider } from "./lib/persistence/browser/sourcesProvider";
import { registerBrowserJobService } from "./lib/background-jobs/jobServiceProvider";
import { registerBrowserVisualizerStoreProvider } from "./lib/persistence/browser/visualizerStoreProvider";
import { registerBrowserThemeStoreProvider } from "./lib/persistence/browser/themeStoreProvider";
import { registerBrowserLyricsSettingsStoreProvider } from "./lib/persistence/browser/lyricsSettingsProvider";
import { resumeInterruptedJobs } from "./lib/background-jobs";
import { ensureFavorites } from "./core/playlists";
import { getThemeNavigationHandler } from "./core/themes";
import { resyncAllSources } from "./lib/sources";
import { ensureExampleVisualizers } from "./lib/visualizers";
import { connectCommandDispatch, wmmBus } from "./events";
import { installTvNavigation } from "./lib/tv";
import {
  ThemedShellRoute,
  useThemedLayoutPending,
  useThemedLayoutSelection,
} from "./lib/themes/render/browser";
import { registerAppThemeWidgets } from "./components/theme-widgets";
import "./events/job-notifications";
import "./events/playlist-import-events";

// Wire the browser persistence adapter behind the core store port for the
// lifetime of the app, before any component/provider calls into core.
registerBrowserStoreProvider();
registerBrowserMetadataReader();
registerBrowserSourceProvider();
registerBrowserJobService();
registerBrowserVisualizerStoreProvider();
registerBrowserThemeStoreProvider();
registerBrowserLyricsSettingsStoreProvider();

// Restore jobs a previous session left unfinished, then re-import every
// configured source on startup so the library stays in sync
// with what's on the sources (local folders + remote servers).
void ensureFavorites().catch(() => { });

void resumeInterruptedJobs()
  .catch(() => new Set<string>())
  .then((restored) => resyncAllSources(restored));

// Seed the bundled particle visualizer on first run, after the plugin store
// provider is registered.
void ensureExampleVisualizers().catch(() => { });

// Connect the bus to the command dispatcher: bus.invoke() -> registered
// handlers (providers/UI register commands; this makes them reachable).
const disconnectCommandDispatch = connectCommandDispatch();
// A hot reload re-runs this module; drop the old link so each command is
// dispatched once (two links would run play/pause twice and cancel out).
import.meta.hot?.dispose(disconnectCommandDispatch);

// Register the app's theme widgets so a themed layout renders them instead of
// a placeholder. A hot reload re-runs this module; drop the old entries first.
const disposeAppThemeWidgets = registerAppThemeWidgets();
import.meta.hot?.dispose(disposeAppThemeWidgets);

/**
 * The root route: a television gets the tile grid, everything else the song
 * list. A TV has no persistent navigation, so its home screen is the map.
 */
const NAVIGATE_PATHS: Readonly<Record<string, string>> = {
  songs: "/songs",
  albums: "/albums",
  artists: "/artists",
  playlists: "/playlists",
  sync: "/sync",
  settings: "/settings",
};

function HomeRoute() {
  const isTv = useIsTv();
  return isTv ? <TvHome /> : <Songs />;
}

function App() {
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [aboutTab, setAboutTab] = useState<AboutTab>("about");
  const themedLayout = useThemedLayoutSelection();
  const themePending = useThemedLayoutPending();
  const builtinUi = themedLayout === undefined && !themePending;

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

  // Remote-control navigation. Installed whenever the television layout is in
  // use, so a TV browser that reports a desktop user agent and a fine pointer
  // still gets arrow-key navigation.
  const isTv = useIsTv();
  useEffect(
    () => installTvNavigation({ force: isTv }),
    [isTv]
  );

  useEffect(() => {
    // The shortcut and the bus command both land on the shortcuts tab.
    const toggleShortcuts = () => {
      setAboutTab("shortcuts");
      setIsAboutOpen((prev) => !prev);
    };

    const sub = keyShortcut$.subscribe((shortcut) => {
      if (shortcut === "openShortcuts") toggleShortcuts();
    });

    // Also listen for the ui.openShortcuts command on the bus so any
    // gesture/configurable binding can open the shortcuts reference.
    const offCmd = wmmBus.onCommand("wmm.ui.openShortcuts", toggleShortcuts);

    return () => {
      sub.unsubscribe();
      offCmd();
    };
  }, []);

  const navigate = useNavigate();
  useEffect(() => {
    const offSettings = wmmBus.onCommand("wmm.ui.openSettings", () =>
      navigate("/settings")
    );
    const offNavigate = wmmBus.onCommand("wmm.ui.navigate", (payload) => {
      const page = payload?.page;
      if (!page) {
        console.warn(`[wmm.ui.navigate] Unknown page "${page}"`);
        return;
      }
      const themeHandler = getThemeNavigationHandler();
      if (page !== "settings" && themeHandler?.handlesPage(page)) {
        themeHandler.navigate(page);
        wmmBus.publish("wmm.ui.viewChanged", { view: page });
        return;
      }
      const path = NAVIGATE_PATHS[page];
      if (!path) {
        console.warn(`[wmm.ui.navigate] Unknown page "${page}"`);
        return;
      }
      navigate(path);
      wmmBus.publish("wmm.ui.viewChanged", { view: page });
    });

    return () => {
      offSettings();
      offNavigate();
    };
  }, [navigate]);

  return (
    <ThemeProvider>
      {/* h-dvh: track the dynamic viewport height so the bottom app bar stays
          visible when mobile browsers collapse/expand their address bar
          (100vh can exceed the visible viewport, hiding the player/editor). */}
      {/* The providers wrap the header as well as the routes: the television
          top bar shows the current track, which it reads from playback. */}
      <SongProvider>
        <PlaybackProvider>
          <VisualizerProvider>
            <SyncProvider>
              <AddDeviceProvider>
                <div className="flex flex-col app-viewport">
                  {builtinUi ? (
                    <header className="shrink-0 border-b pt-[env(safe-area-inset-top)]">
                      <NavBar
                        onOpenAbout={() => {
                          setAboutTab("about");
                          setIsAboutOpen(true);
                        }}
                      />
                    </header>
                  ) : null}

                  <main className="flex-1 min-h-0 overflow-hidden">
                    <Routes>
                      {builtinUi ? (
                        <Route path="/" element={<MainLayout />}>
                          <Route path="/" element={<HomeRoute />} />
                          <Route path="songs" element={<Songs />} />
                          <Route path="songs/:mode" element={<Songs />} />
                          <Route path="albums" element={<Albums />} />
                          <Route path="albums/:mode" element={<Albums />} />
                          <Route path="artists" element={<Artists />} />
                          <Route path="artists/:mode" element={<Artists />} />
                          <Route path="playlists" element={<Playlists />} />
                          <Route path="playlists/:mode" element={<Playlists />} />
                          <Route path="tv/songs" element={<TvDetail />} />
                          <Route path="tv/browse/:kind" element={<TvBrowse />} />
                          <Route path="tv/album/:albumId" element={<TvDetail />} />
                          <Route
                            path="tv/artist/:artistId"
                            element={<TvDetail />}
                          />
                          <Route
                            path="tv/playlist/:playlistId"
                            element={<TvDetail />}
                          />
                          <Route path="sync" element={<Sync />} />
                        </Route>
                      ) : (
                        <Route
                          path="*"
                          element={
                            themedLayout === undefined ? (
                              <div className="h-full w-full" />
                            ) : (
                              <ThemedShellRoute selection={themedLayout} />
                            )
                          }
                        />
                      )}

                      <Route path="/settings" element={<Settings />} />
                    </Routes>

                    <AboutDialog
                      open={isAboutOpen}
                      onOpenChange={setIsAboutOpen}
                      tab={aboutTab}
                      onTabChange={setAboutTab}
                    />
                    <TvFullscreenPrompt />
                  </main>
                </div>
              </AddDeviceProvider>
            </SyncProvider>
          </VisualizerProvider>
        </PlaybackProvider>
      </SongProvider>
      <Toaster />
      <ThemeTrialBar />
    </ThemeProvider>
  );
}

export default App;
