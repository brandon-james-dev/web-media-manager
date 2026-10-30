import { Routes, Route } from "react-router";
import { Songs, Albums, Settings, Sync } from "./pages";
import { NavBar } from "./layout";
import { SongProvider, SyncProvider } from "./providers";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { MainLayout } from "./pages/Main/MainLayout";
import { PlaybackProvider } from "./providers/PlaybackProvider";
import { useEffect, useState } from "react";
import { keyShortcut$ } from "@/core/events";
import { registerDefaultShortcuts } from "./lib/keyboard-shortcuts/registerDefaultShortcuts";
import { KeyboardShortcutsModal } from "./components/keyboard-shortcuts-modal";
import { handleKey } from "./lib";
import { registerBrowserStoreProvider } from "./lib/persistence/browser/storeProvider";
import { registerBrowserMetadataReader } from "./lib/metadata/reader/browserMetadataReader";
import { registerBrowserSourceProvider } from "./lib/persistence/browser/sourcesProvider";
import { registerBrowserJobService } from "./lib/background-jobs/jobServiceProvider";
import { connectCommandDispatch, wmmBus } from "./core/events";
import "./core/events/job-notifications";

// Wire the browser persistence adapter behind the core store port for the
// lifetime of the app, before any component/provider calls into core.
registerBrowserStoreProvider();
registerBrowserMetadataReader();
registerBrowserSourceProvider();
registerBrowserJobService();

// Connect the bus to the command dispatcher: bus.invoke() -> registered
// handlers (providers/UI register commands; this makes them reachable).
connectCommandDispatch();

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
      <div className="flex flex-col h-screen">
        <header className="shrink-0 border-b">
          <NavBar />
        </header>

        <main className="flex-1 overflow-hidden">
          <SongProvider>
            <PlaybackProvider>
              <SyncProvider>
                <Routes>
                  <Route path="/" element={<MainLayout />}>
                    <Route path="/" element={<Songs />} />
                    <Route path="songs" element={<Songs />} />
                    <Route path="songs/:mode" element={<Songs />} />
                    <Route path="albums" element={<Albums />} />
                    <Route path="albums/:mode" element={<Albums />} />
                    <Route path="sync" element={<Sync />} />
                  </Route>

                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </SyncProvider>
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
