import { Routes, Route } from "react-router";
import { Main, Settings } from "./pages";
import { NavBar } from "./layout";
import { SongProvider } from "./providers/SongProvider";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "@/components/ui/toast";

import "./App.css";

function App() {
  return (
    <>
      <ThemeProvider>
        <div className="flex flex-col h-screen">
          <header className="shrink-0 border-b">
            <NavBar />
          </header>

          <main className="flex-1 overflow-hidden">
            <SongProvider>
              <Routes>
                <Route path="/" element={<Main />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </SongProvider>
          </main>
        </div>
        <Toaster />
      </ThemeProvider>
    </>
  );
}

export default App;
