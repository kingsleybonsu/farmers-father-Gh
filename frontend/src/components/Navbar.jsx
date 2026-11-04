import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import HamburgerMenu from './HamburgerMenu.jsx';
import logoIcon from '../assets/images/logo-icon-white.png';

const suggestionIcons = {
  produce: '🌿',
  farmer: '👤',
  farm: '🏡',
  location: '📍',
};

const avatarStyles = {
  male: { symbol: '👨‍🌾', color: '#d9f0ff' },
  female: { symbol: '👩‍🌾', color: '#fce7f3' },
  neutral: { symbol: '🌾', color: '#e7f6e9' },
  farm: { symbol: '🚜', color: '#fff0d5' },
};

function Navbar({ isAuthenticated, farmerName, onLogout, theme, onThemeToggle, suggestions, activeSuggestion, setActiveSuggestion, suggestionsDismissed, setSuggestionsDismissed }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState('');
  const accountMenuRef = useRef(null);
  const accountButtonRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isMarketplace = location.pathname === '/';
  const searchQuery = searchParams.get('q') || '';
  const searchValue = isMarketplace ? searchQuery : draftSearch;
  const suggestionsVisible = isMarketplace
    && searchQuery.trim().length >= 2
    && suggestions.length > 0
    && !suggestionsDismissed;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!accountOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [accountOpen]);

  const closeAccountMenu = () => setAccountOpen(false);

  const updateMarketplaceQuery = (value) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value) nextParams.set('q', value);
    else nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    setSuggestionsDismissed(false);
    setActiveSuggestion(-1);
    if (isMarketplace) updateMarketplaceQuery(value);
    else setDraftSearch(value);
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const value = searchValue.trim();
    setSuggestionsDismissed(true);
    setActiveSuggestion(-1);
    if (isMarketplace) updateMarketplaceQuery(value);
    else navigate(value ? `/?q=${encodeURIComponent(value)}` : '/');
  };

  const clearSearch = () => {
    setSuggestionsDismissed(false);
    setActiveSuggestion(-1);
    if (isMarketplace) updateMarketplaceQuery('');
    else setDraftSearch('');
  };

  const selectSuggestion = (suggestion) => {
    updateMarketplaceQuery(suggestion.value);
    setSuggestionsDismissed(true);
    setActiveSuggestion(-1);
  };

  const handleSearchKeyDown = (event) => {
    if (!suggestionsVisible) {
      if (event.key === 'Escape') setSuggestionsDismissed(true);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      setActiveSuggestion((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === 'Enter' && activeSuggestion >= 0) {
      event.preventDefault();
      selectSuggestion(suggestions[activeSuggestion]);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setSuggestionsDismissed(true);
      setActiveSuggestion(-1);
    }
  };

  const firstName = farmerName?.trim().split(/\s+/)[0] || 'Account';
  const farmerAvatar = avatarStyles[localStorage.getItem('farmerAvatar')] || avatarStyles.neutral;

  return (
    <header className="navbar">
      <div className="nav-brand">
        <Link to="/" aria-label="Farmers Father home">
          <img src={logoIcon} alt="" className="brand-logo" />
          <span>FARMERS FATHER <small>GH</small></span>
        </Link>
      </div>

      <div className="navbar-search-area">
        <form className="navbar-search-form" role="search" onSubmit={handleSearchSubmit}>
          <label className="navbar-search-input-wrap">
            <span className="sr-only">Search farmers, produce or location</span>
            <input
              className={`navbar-search-input${searchValue ? ' has-value' : ''}`}
              type="search"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={suggestionsVisible}
              aria-controls="marketplace-suggestions"
              aria-activedescendant={activeSuggestion >= 0 && suggestionsVisible ? `marketplace-suggestion-${activeSuggestion}` : undefined}
              value={searchValue}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search farmers, produce or location"
              maxLength={100}
            />
            {searchValue && (
              <button className="navbar-search-clear" type="button" onClick={clearSearch} aria-label="Clear search">×</button>
            )}
          </label>
          <button className="navbar-search-submit" type="submit" aria-label="Search" title="Search">
            <span aria-hidden="true">⌕</span>
          </button>
        </form>
        <div
          id="marketplace-suggestions"
          className={`marketplace-suggestions${suggestionsVisible ? ' is-visible' : ' is-hidden'}`}
          role="listbox"
          aria-label="Search suggestions"
        >
          {suggestionsVisible && suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.type}-${suggestion.value}`}
              id={`marketplace-suggestion-${index}`}
              className={`suggestion-chip${index === activeSuggestion ? ' active' : ''}`}
              type="button"
              role="option"
              aria-selected={index === activeSuggestion}
              title={suggestion.value}
              onMouseEnter={() => setActiveSuggestion(index)}
              onClick={() => selectSuggestion(suggestion)}
            >
              <span aria-hidden="true">{suggestionIcons[suggestion.type]}</span>
              <span className="suggestion-chip-text">{suggestion.value}</span>
            </button>
          ))}
        </div>
      </div>

      <nav className={`nav-links${isAuthenticated ? ' authenticated-nav-links' : ' public-nav-links'}`}>
        {isAuthenticated ? (
          <>
            <Link className="nav-link" to="/sell">Sell produce</Link>
            <Link className="nav-link" to="/dashboard">Dashboard</Link>
            <div className="nav-dropdown account-dropdown-wrap" ref={accountMenuRef}>
              <button
                ref={accountButtonRef}
                className="account-trigger"
                type="button"
                onClick={() => setAccountOpen((open) => !open)}
                aria-label={`Account menu for ${firstName}`}
                aria-haspopup="menu"
                aria-expanded={accountOpen}
                aria-controls="account-menu"
              >
                <span className="account-avatar" style={{ backgroundColor: farmerAvatar.color }} aria-hidden="true">{farmerAvatar.symbol}</span>
                <span className="account-first-name">{firstName}</span>
                <span aria-hidden="true">⌄</span>
              </button>
              {accountOpen && (
                <div className="nav-dropdown-menu account-dropdown-menu" id="account-menu" role="menu">
                  <Link role="menuitem" to="/" onClick={closeAccountMenu}>Marketplace</Link>
                  <Link role="menuitem" to="/produce" onClick={closeAccountMenu}>My produce</Link>
                  <Link role="menuitem" to="/profile" onClick={closeAccountMenu}>Profile</Link>
                  <Link role="menuitem" to="/settings" onClick={closeAccountMenu}>Settings</Link>
                  <button role="menuitem" type="button" onClick={onThemeToggle}>
                    {theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode'}
                  </button>
                  <div className="account-menu-separator" role="separator" />
                  <button role="menuitem" className="account-menu-logout" type="button" onClick={() => { closeAccountMenu(); onLogout(); }}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button type="button" className="theme-toggle nav-theme-icon" onClick={onThemeToggle} aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} title={theme === 'dark' ? 'Light mode' : 'Dark mode'}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <Link className="nav-link" to="/login">Login</Link>
            <Link className="nav-button nav-auth-button" to="/register">Become a farmer</Link>
          </>
        )}
      </nav>

      <HamburgerMenu isAuthenticated={isAuthenticated} farmerName={farmerName} onLogout={onLogout} theme={theme} onThemeToggle={onThemeToggle} />
    </header>
  );
}

export default Navbar;
