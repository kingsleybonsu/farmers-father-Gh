import axios from "axios";

export const SESSION_EXPIRED_EVENT = "farmer:session-expired";

const SESSION_STORAGE_KEYS = ["farmerToken", "farmerName", "farmerAvatar"];

export function clearStoredSession() {
  SESSION_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function getStoredSession() {
  const token = localStorage.getItem("farmerToken");
  if (!token) return { isAuthenticated: false, sessionExpired: false };

  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1]) throw new Error("Malformed JWT");

    const base64Payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = base64Payload.padEnd(
      Math.ceil(base64Payload.length / 4) * 4,
      "=",
    );
    const payload = JSON.parse(window.atob(paddedPayload));
    const expiresAt = Number(payload.exp);

    if (!Number.isFinite(expiresAt) || expiresAt * 1000 <= Date.now()) {
      throw new Error("Expired or invalid JWT");
    }

    return { isAuthenticated: true, sessionExpired: false };
  } catch {
    clearStoredSession();
    return { isAuthenticated: false, sessionExpired: true };
  }
}

const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("farmerToken");
  config.hadStoredToken = Boolean(token);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { config, response } = error;
    const isAuthRequest = /\/auth\/(?:login|register)(?:[?#]|$)/i.test(
      config?.url || "",
    );

    if (response?.status === 401 && config?.hadStoredToken && !isAuthRequest) {
      clearStoredSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }

    return Promise.reject(error);
  },
);

export default api;
