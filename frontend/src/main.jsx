import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { clearStoredSession, getStoredSession } from './api/axios.js';
import { getStoredBuyerSession } from './api/buyerApi.js';
import { CartProvider } from './context/CartContext.jsx';
import './index.css';

const initialSession = getStoredSession();
const initialBuyerSession = getStoredBuyerSession();

if (initialBuyerSession.isAuthenticated) {
  clearStoredSession();
  initialSession.isAuthenticated = false;
  initialSession.sessionExpired = false;
} else if (initialSession.isAuthenticated) {
  initialBuyerSession.sessionExpired = false;
} else if (initialBuyerSession.sessionExpired) {
  initialSession.sessionExpired = false;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <CartProvider>
        <App
          initialSession={initialSession}
          initialBuyerSession={initialBuyerSession}
        />
      </CartProvider>
    </BrowserRouter>
  </React.StrictMode>
);
