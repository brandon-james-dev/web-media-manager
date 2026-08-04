import { Routes, Route, NavLink } from "react-router-dom";
import "./App.css";
import HomePage from "./pages/HomePage";

const SettingsPage = () => <h1 className="page-title">Settings</h1>;

function NavBar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-link">Home</NavLink> | <NavLink to="/settings" className="nav-link">Settings</NavLink>
    </nav>
  );
}

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
