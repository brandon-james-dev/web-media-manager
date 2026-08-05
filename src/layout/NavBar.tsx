import { NavLink } from "react-router-dom";

function NavBar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="nav-link">Home</NavLink> | <NavLink to="/settings" className="nav-link">Settings</NavLink>
    </nav>
  );
}

export default NavBar;