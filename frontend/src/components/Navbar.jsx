import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu.jsx';

function Navbar({ isAuthenticated, farmerName, onLogout, theme, onThemeToggle }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setMoreOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const closeMoreMenu = () => setMoreOpen(false);

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Link to="/" aria-label="Farmers Father home">
          <span className="brand-mark">✿</span>
          <span>FARMERS FATHER <small>GH</small></span>
        </Link>
      </div>

      <nav className="nav-links">
        <button type="button" className="theme-toggle" onClick={onThemeToggle} aria-label="Toggle color theme">
          {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
        </button>
        <Link className="nav-link" to="/">Marketplace</Link>
        {isAuthenticated ? (
          <>
            <Link className="nav-link" to="/sell">Sell produce</Link>
            <Link className="nav-link" to="/dashboard">Dashboard</Link>
            <div className="nav-dropdown" ref={moreMenuRef}>
              <button className="nav-link dropdown-trigger" type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen}>
                More <span aria-hidden="true">⌄</span>
              </button>
              {moreOpen && (
                <div className="nav-dropdown-menu">
                  <Link to="/produce" onClick={closeMoreMenu}>My produce</Link>
                  <Link to="/orders" onClick={closeMoreMenu}>Orders</Link>
                  <Link to="/sales" onClick={closeMoreMenu}>Sales</Link>
                  <Link to="/messages" onClick={closeMoreMenu}>Messages</Link>
                  <Link to="/profile" onClick={closeMoreMenu}>Profile</Link>
                  <Link to="/settings" onClick={closeMoreMenu}>Settings</Link>
                </div>
              )}
            </div>
            <span className="nav-farmer">Hello, {farmerName}</span>
            <button className="nav-button nav-auth-button" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link className="nav-link" to="/login">Login</Link>
            <Link className="nav-button nav-auth-button" to="/register">Become a farmer</Link>
          </>
        )}
      </nav>

      <HamburgerMenu isAuthenticated={isAuthenticated} farmName={farmerName} onLogout={onLogout} theme={theme} onThemeToggle={onThemeToggle} />
    </header>
  );
}

export default Navbar;
