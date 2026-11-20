import axios from 'axios';

export const BUYER_SESSION_EXPIRED_EVENT = 'buyer:session-expired';
const BUYER_SESSION_KEYS = ['buyerToken', 'buyerName'];

export function clearStoredBuyerSession() {
  try {
    BUYER_SESSION_KEYS.forEach((key) => localStorage.removeItem(key));
    return true;
  } catch {
    return false;
  }
}

export function storeBuyerSession(token, name) {
  try {
    localStorage.setItem('buyerToken', token);
    localStorage.setItem('buyerName', name);
    return true;
  } catch {
    clearStoredBuyerSession();
    return false;
  }
}

export function getStoredBuyerSession() {
  let token;
  let name;
  try {
    token = localStorage.getItem('buyerToken');
    name = localStorage.getItem('buyerName');
  } catch {
    return { isAuthenticated: false, sessionExpired: false, name: null };
  }

  if (!token) {
    clearStoredBuyerSession();
    return { isAuthenticated: false, sessionExpired: false, name: null };
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) throw new Error('Malformed JWT');

    const base64Payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = base64Payload.padEnd(
      Math.ceil(base64Payload.length / 4) * 4,
      '=',
    );
    const payload = JSON.parse(window.atob(paddedPayload));
    const expiresAt = Number(payload.exp);

    if (
      payload.role !== 'buyer' ||
      !Number.isFinite(expiresAt) ||
      expiresAt * 1000 <= Date.now()
    ) {
      throw new Error('Expired or invalid buyer JWT');
    }

    return { isAuthenticated: true, sessionExpired: false, name };
  } catch {
    clearStoredBuyerSession();
    return { isAuthenticated: false, sessionExpired: true, name: null };
  }
}

const buyerApi = axios.create({
  baseURL: '/api',
});

buyerApi.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('buyerToken');
    config.hadStoredBuyerToken = Boolean(token);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    config.hadStoredBuyerToken = false;
  }
  return config;
});

buyerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const { config, response } = error;
    const isAuthRequest = /\/buyers\/(?:login|register)(?:[?#]|$)/i.test(
      config?.url || '',
    );

    if (
      response?.status === 401 &&
      config?.hadStoredBuyerToken &&
      !isAuthRequest
    ) {
      clearStoredBuyerSession();
      window.dispatchEvent(new Event(BUYER_SESSION_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  },
);

export default buyerApi;
