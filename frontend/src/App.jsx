import { useEffect, useMemo, useRef, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import FarmerNavigation from './components/FarmerNavigation.jsx';
import Marketplace from './pages/Marketplace.jsx';
import FarmerPage from './pages/FarmerPage.jsx';
import Register from './pages/Register.jsx';
import Login from './pages/Login.jsx';
import SellProduce from './pages/SellProduce.jsx';
import Dashboard from './pages/Dashboard.jsx';
import HomeHero from './pages/HomeHero.jsx';
import NotFound from './pages/NotFound.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import Cart from './pages/Cart.jsx';
import OrderSuccess from './pages/OrderSuccess.jsx';
import MyOrders from './pages/MyOrders.jsx';
import { clearStoredSession, SESSION_EXPIRED_EVENT } from './api/axios.js';
import {
  BUYER_SESSION_EXPIRED_EVENT,
  clearStoredBuyerSession,
} from './api/buyerApi.js';

const PrivateRoute = ({ children, isAuthenticated, sessionExpired }) => {
  const location = useLocation();

  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" state={{ from: location, sessionExpired }} replace />
  );
};

function App({ initialSession, initialBuyerSession }) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialSession.isAuthenticated);
  const [sessionExpired, setSessionExpired] = useState(initialSession.sessionExpired);
  const [farmerName, setFarmerName] = useState(() => localStorage.getItem('farmerName'));
  const [isBuyerAuthenticated, setIsBuyerAuthenticated] = useState(
    initialBuyerSession.isAuthenticated,
  );
  const [buyerName, setBuyerName] = useState(initialBuyerSession.name);
  const [buyerSessionExpired, setBuyerSessionExpired] = useState(
    initialBuyerSession.sessionExpired,
  );
  const [theme, setTheme] = useState(() => localStorage.getItem('farmTheme') || 'light');
  const [marketplaceSuggestions, setMarketplaceSuggestions] = useState([]);
  const [activeMarketplaceSuggestion, setActiveMarketplaceSuggestion] = useState(-1);
  const [marketplaceSuggestionsDismissed, setMarketplaceSuggestionsDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const startupExpirationHandled = useRef(false);
  const startupBuyerExpirationHandled = useRef(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('farmTheme', theme);
  }, [theme]);

  useEffect(() => {
    const handleSessionExpired = () => {
      setIsAuthenticated(false);
      setSessionExpired(true);
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true, state: { sessionExpired: true } });
      }
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [location.pathname, navigate]);

  useEffect(() => {
    const handleBuyerSessionExpired = () => {
      clearStoredBuyerSession();
      setIsBuyerAuthenticated(false);
      setBuyerName(null);
      setBuyerSessionExpired(true);
      const isBuyerLogin =
        location.pathname === '/login' &&
        new URLSearchParams(location.search).get('role') === 'buyer';
      if (!isBuyerLogin) {
        navigate('/login?role=buyer', {
          replace: true,
          state: { sessionExpired: true, expiredRole: 'buyer' },
        });
      }
    };

    window.addEventListener(
      BUYER_SESSION_EXPIRED_EVENT,
      handleBuyerSessionExpired,
    );
    return () =>
      window.removeEventListener(
        BUYER_SESSION_EXPIRED_EVENT,
        handleBuyerSessionExpired,
      );
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (initialSession.sessionExpired && !startupExpirationHandled.current) {
      startupExpirationHandled.current = true;
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true, state: { sessionExpired: true } });
      }
    }
  }, [initialSession.sessionExpired, location.pathname, navigate]);

  useEffect(() => {
    if (
      initialBuyerSession.sessionExpired &&
      !startupBuyerExpirationHandled.current
    ) {
      startupBuyerExpirationHandled.current = true;
      const isBuyerLogin =
        location.pathname === '/login' &&
        new URLSearchParams(location.search).get('role') === 'buyer';
      if (!isBuyerLogin) {
        navigate('/login?role=buyer', {
          replace: true,
          state: { sessionExpired: true, expiredRole: 'buyer' },
        });
      }
    }
  }, [
    initialBuyerSession.sessionExpired,
    location.pathname,
    location.search,
    navigate,
  ]);

  const isFarmerWorkspace = isAuthenticated
    && location.pathname !== '/'
    && location.pathname !== '/cart'
    && !location.pathname.startsWith('/farmers/');

  const handleLogout = (redirectTo = '/', redirectState) => {
    clearStoredSession();
    setIsAuthenticated(false);
    setFarmerName(null);
    setSessionExpired(false);
    navigate(redirectTo, redirectState ? { state: redirectState } : undefined);
  };

  const handleBuyerLogout = () => {
    clearStoredBuyerSession();
    setIsBuyerAuthenticated(false);
    setBuyerName(null);
    setBuyerSessionExpired(false);
    navigate('/');
  };

  const handleAuthenticated = (authenticated) => {
    setIsAuthenticated(authenticated);
    if (!authenticated) {
      setFarmerName(null);
      setSessionExpired(false);
      return;
    }

    setSessionExpired(false);
    setFarmerName(localStorage.getItem('farmerName'));
    setIsBuyerAuthenticated(false);
    setBuyerName(null);
    setBuyerSessionExpired(false);
  };

  const handleBuyerAuthenticated = (buyer) => {
    setIsAuthenticated(false);
    setFarmerName(null);
    setSessionExpired(false);
    setIsBuyerAuthenticated(true);
    setBuyerName(buyer.name);
    setBuyerSessionExpired(false);
  };

  const authProps = useMemo(
    () => ({ isAuthenticated, farmerName, setIsAuthenticated }),
    [isAuthenticated, farmerName]
  );

  return (
    <div className="app-shell">
      <Navbar
        {...authProps}
        isBuyerAuthenticated={isBuyerAuthenticated}
        buyerName={buyerName}
        theme={theme}
        onThemeToggle={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))}
        onLogout={handleLogout}
        onBuyerLogout={handleBuyerLogout}
        suggestions={marketplaceSuggestions}
        activeSuggestion={activeMarketplaceSuggestion}
        setActiveSuggestion={setActiveMarketplaceSuggestion}
        suggestionsDismissed={marketplaceSuggestionsDismissed}
        setSuggestionsDismissed={setMarketplaceSuggestionsDismissed}
      />
      <main className={isFarmerWorkspace ? 'page-content farmer-workspace' : 'page-content'}>
        {isFarmerWorkspace && <FarmerNavigation />}
        <div className={isFarmerWorkspace ? 'farmer-workspace-content' : ''}>
        <Routes>
          <Route path="/" element={<><HomeHero isAuthenticated={isAuthenticated} /><Marketplace setSuggestions={setMarketplaceSuggestions} setActiveSuggestion={setActiveMarketplaceSuggestion} setSuggestionsDismissed={setMarketplaceSuggestionsDismissed} /></>} />
          <Route path="/farmers/:farmerId" element={<FarmerPage />} />
          <Route path="/cart" element={<Cart isAuthenticated={isAuthenticated} isBuyerAuthenticated={isBuyerAuthenticated} onFarmerLogout={handleLogout} />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/register" element={<Register setIsAuthenticated={handleAuthenticated} onBuyerAuthenticated={handleBuyerAuthenticated} />} />
          <Route path="/login" element={<Login setIsAuthenticated={handleAuthenticated} onBuyerAuthenticated={handleBuyerAuthenticated} sessionExpired={sessionExpired} buyerSessionExpired={buyerSessionExpired} />} />
          <Route
            path="/my-orders"
            element={
              isBuyerAuthenticated ? (
                <MyOrders />
              ) : (
                <Navigate
                  to="/login?role=buyer"
                  state={{ from: '/my-orders' }}
                  replace
                />
              )
            }
          />
          <Route
            path="/sell"
            element={
             <PrivateRoute isAuthenticated={isAuthenticated} sessionExpired={sessionExpired}>
                <SellProduce />
              </PrivateRoute>
            }
          />
          
          <Route path="/dashboard" element={
              <PrivateRoute isAuthenticated={isAuthenticated} sessionExpired={sessionExpired}>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route path="/produce" element={<PrivateRoute isAuthenticated={isAuthenticated} sessionExpired={sessionExpired}><Dashboard /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute isAuthenticated={isAuthenticated} sessionExpired={sessionExpired}><Profile onProfileUpdated={setFarmerName} /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute isAuthenticated={isAuthenticated} sessionExpired={sessionExpired}><Settings onLogout={handleLogout} /></PrivateRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </div>
      </main>
      <Footer />
      </div>
  );
}

export default App;
      
