import { useState } from 'react';
import { Link } from 'react-router-dom';

function HamburgerMenu({ isAuthenticated, farmerName, onLogout, theme, onThemeToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-nav">
      <button type="button" className="theme-toggle mobile-theme-toggle" onClick={onThemeToggle}>
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
      <button className="hamburger-button" onClick={() => setOpen((prev) => !prev)}>
        <span className="sr-only">Toggle navigation menu</span>
        <span className="bar" />
        <span className="bar" />
        <span className="bar" />
      </button>
      {open && (
        <div className="mobile-menu">
          <Link to="/" onClick={() => setOpen(false)}>
            Marketplace
          </Link>
          {isAuthenticated ? (
            <>
              <div className="mobile-farmer mobile-menu-heading">Hello, {farmerName}</div>
              <Link to="/sell" onClick={() => setOpen(false)}>
                Sell Produce
              </Link>
              <Link to="/dashboard" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              <Link to="/produce" onClick={() => setOpen(false)}>My produce</Link>
              <Link to="/orders" onClick={() => setOpen(false)}>Orders</Link>
              <Link to="/sales" onClick={() => setOpen(false)}>Sales</Link>
              <Link to="/messages" onClick={() => setOpen(false)}>Messages</Link>
              <Link to="/profile" onClick={() => setOpen(false)}>Profile</Link>
              <Link to="/settings" onClick={() => setOpen(false)}>Settings</Link>
              <button className="nav-button mobile-logout" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={() => setOpen(false)}>
                Login
              </Link>
              <Link to="/register" onClick={() => setOpen(false)}>
                Become a Farmer
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default HamburgerMenu;
