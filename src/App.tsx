import { Routes, Route } from "react-router";
import { HomePage, SettingsPage } from "./pages";
import { NavBar } from "./layout";
import { SongProvider } from "./providers/SongProvider";

import "./App.css";

function App() {
  return (
    <>
      <NavBar />
      <main className="content-area">
        <SongProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </SongProvider>
      </main>
    </>
  );
}

export default App;
