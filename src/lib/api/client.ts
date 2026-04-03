import axios from 'axios';
import { CONFIG, STORAGE_KEYS } from '../config';

// Create Axios instance with base URL
export const apiClient = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle 401 (expired/invalid token)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect on auth endpoints (login/register return 401 for bad credentials)
      const isAuthEndpoint = error.config?.url?.startsWith('/api/auth/');
      if (!isAuthEndpoint) {
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);
