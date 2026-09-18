import "./App.css";

import { Routes, Route } from "react-router";
import { Songs, Albums, Settings, SongEdit, SongPlayback } from "./pages";
import { NavBar } from "./layout";
import { SongProvider } from "./providers/SongProvider";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/toast";
import { MainLayout } from "./pages/Main/MainLayout";
import { PlaybackProvider } from "./providers/PlaybackProvider";

function App() {
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
                  <Route path="/" element={<Songs />}>
                    <Route path="/" element={<SongEdit />} />
                    <Route path="/playback" element={<SongPlayback />} />
                  </Route>
                  <Route path="/songs" element={<Songs />}>
                    <Route path="" element={<SongEdit />} />
                    <Route path="playback" element={<SongPlayback />} />
                  </Route>
                  <Route path="/albums" element={<Albums />} />
                </Route>
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </PlaybackProvider>
          </SongProvider>
        </main>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
