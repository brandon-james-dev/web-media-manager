import { Routes, Route } from "react-router";
import { HomePage, SettingsPage } from "./pages";
import { NavBar } from "./layout";
import "./App.css";

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
