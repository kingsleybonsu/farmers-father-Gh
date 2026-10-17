import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { getStoredSession } from './api/axios.js';
import './index.css';

const initialSession = getStoredSession();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App initialSession={initialSession} />
    </BrowserRouter>
  </React.StrictMode>
);
