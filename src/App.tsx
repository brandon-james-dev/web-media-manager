import "./App.css";

import { Routes, Route } from "react-router";
import { Songs, Albums, Settings } from "./pages";
import { NavBar } from "./layout";
import { SongProvider } from "./providers/SongProvider";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { MainLayout } from "./pages/Main/MainLayout";
import { PlaybackProvider } from "./providers/PlaybackProvider";
import { useEffect, useState } from "react";
import { keyShortcut$ } from "./events/keyboard-events";
import { registerDefaultShortcuts } from "./lib/registerDefaultShortcuts";
import { KeyboardShortcutsModal } from "./components/keyboard-shortcuts-modal";
import { handleKey } from "./lib";

function App() {
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  useEffect(() => {
    registerDefaultShortcuts();

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const sub = keyShortcut$.subscribe((shortcut) => {
      if (shortcut === "openShortcuts") setIsShortcutsOpen(!isShortcutsOpen);
    });

    return () => sub.unsubscribe();
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
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route path="/" element={<Songs />} />
                  <Route path="songs" element={<Songs />} />
                  <Route path="songs/:mode" element={<Songs />} />
                  <Route path="albums" element={<Albums />} />
                  <Route path="albums/:mode" element={<Albums />} />
                </Route>

                <Route path="/settings" element={<Settings />} />
              </Routes>
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
