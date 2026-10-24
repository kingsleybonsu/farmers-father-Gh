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
import DashboardPlaceholder from './pages/DashboardPlaceholder.jsx';
import NotFound from './pages/NotFound.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';
import { clearStoredSession, SESSION_EXPIRED_EVENT } from './api/axios.js';

const PrivateRoute = ({ children, isAuthenticated, sessionExpired }) => {
  const location = useLocation();

  return isAuthenticated ? (
    children
  ) : (
    <Navigate to="/login" state={{ from: location, sessionExpired }} replace />
  );
};

function App({ initialSession }) {
  const [isAuthenticated, setIsAuthenticated] = useState(initialSession.isAuthenticated);
  const [sessionExpired, setSessionExpired] = useState(initialSession.sessionExpired);
  const [farmerName, setFarmerName] = useState(() => localStorage.getItem('farmerName'));
  const [theme, setTheme] = useState(() => localStorage.getItem('farmTheme') || 'light');
  const navigate = useNavigate();
  const location = useLocation();
  const startupExpirationHandled = useRef(false);

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
    if (initialSession.sessionExpired && !startupExpirationHandled.current) {
      startupExpirationHandled.current = true;
      if (location.pathname !== '/login') {
        navigate('/login', { replace: true, state: { sessionExpired: true } });
      }
    }
  }, [initialSession.sessionExpired, location.pathname, navigate]);

  const isFarmerWorkspace = isAuthenticated && location.pathname !== '/' && !location.pathname.startsWith('/farmers/');

  const handleLogout = () => {
    clearStoredSession();
    setIsAuthenticated(false);
    setFarmerName(null);
    setSessionExpired(false);
    navigate('/');
  };

  const handleAuthenticated = (authenticated) => {
    setIsAuthenticated(authenticated);
    if (authenticated) {
      setSessionExpired(false);
      setFarmerName(localStorage.getItem('farmerName'));
    }
  };

  const authProps = useMemo(
    () => ({ isAuthenticated, farmerName, setIsAuthenticated }),
    [isAuthenticated, farmerName]
  );

  return (
    <div className="app-shell">
      <Navbar {...authProps} theme={theme} onThemeToggle={() => setTheme((current) => (current === 'light' ? 'dark' : 'light'))} onLogout={handleLogout} />
      <main className={isFarmerWorkspace ? 'page-content farmer-workspace' : 'page-content'}>
        {isFarmerWorkspace && <FarmerNavigation />}
        <div className={isFarmerWorkspace ? 'farmer-workspace-content' : ''}>
        <Routes>
          <Route path="/" element={<><HomeHero /><Marketplace /></>} />
          <Route path="/farmers/:farmerId" element={<FarmerPage />} />
          <Route path="/register" element={<Register setIsAuthenticated={handleAuthenticated} />} />
          <Route path="/login" element={<Login setIsAuthenticated={handleAuthenticated} sessionExpired={sessionExpired} />} />
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
      
