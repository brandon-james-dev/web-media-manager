import { Routes, Route } from "react-router-dom";
import "./App.css";
import { HomePage, SettingsPage } from "./pages";
import { NavBar } from "./layout";

function App() {
  return (
    <>
      <NavBar />
      <main className="content-area">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </>
  );
}

export default App;
