import { useState } from 'react';
import { Link } from 'react-router-dom';

function HamburgerMenu({
  isAuthenticated,
  farmerName,
  isBuyerAuthenticated,
  buyerName,
  onLogout,
  onBuyerLogout,
  theme,
  onThemeToggle,
  itemCount,
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mobile-nav">
      <Link className="cart-nav-link mobile-cart-link" to="/cart" aria-label={`Shopping cart, ${itemCount} items`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 4h2l2.2 11.1a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 8H6" />
          <circle cx="10" cy="20" r="1.2" />
          <circle cx="18" cy="20" r="1.2" />
        </svg>
        <span className="cart-count-badge">{itemCount > 99 ? '99+' : itemCount}</span>
      </Link>
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
          {isBuyerAuthenticated ? (
            <>
              <div className="mobile-farmer mobile-menu-heading">Hello, {buyerName}</div>
              <Link to="/cart" onClick={() => setOpen(false)}>Cart</Link>
              <Link to="/my-orders" onClick={() => setOpen(false)}>My orders</Link>
              <button type="button" className="mobile-menu-theme-toggle" onClick={onThemeToggle}>
                {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
              </button>
              <button className="nav-button mobile-logout" onClick={() => { setOpen(false); onBuyerLogout(); }}>
                Logout
              </button>
            </>
          ) : isAuthenticated ? (
            <>
              <div className="mobile-farmer mobile-menu-heading">Hello, {farmerName}</div>
              <Link to="/sell" onClick={() => setOpen(false)}>
                Sell Produce
              </Link>
              <Link to="/dashboard" onClick={() => setOpen(false)}>
                Dashboard
              </Link>
              <Link to="/produce" onClick={() => setOpen(false)}>My produce</Link>
              <Link to="/profile" onClick={() => setOpen(false)}>Profile</Link>
              <Link to="/settings" onClick={() => setOpen(false)}>Settings</Link>
              <button type="button" className="mobile-menu-theme-toggle" onClick={onThemeToggle}>
                {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
              </button>
              <button className="nav-button mobile-logout" onClick={onLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <button type="button" className="mobile-menu-theme-toggle" onClick={onThemeToggle}>
                {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
              </button>
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
