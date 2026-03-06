/**
 * Global axios configuration.
 *
 * Call setupAxiosInterceptors() once at app startup (root _layout.tsx).
 * It attaches a response interceptor to the default axios instance so every
 * 401 response across the whole app automatically logs the user out and
 * redirects to the login screen — no per-screen handling needed.
 */
import axios from 'axios';
import { router } from 'expo-router';
import { logout } from '@/lib/auth';

let _interceptorId: number | null = null;

export function setupAxiosInterceptors() {
  // Remove any previously registered interceptor (hot-reload safety)
  if (_interceptorId !== null) {
    axios.interceptors.response.eject(_interceptorId);
  }

  _interceptorId = axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error?.response?.status === 401) {
        await logout();
        // Replace the current route so the user cannot go back
        router.replace('/auth/login');
      }
      return Promise.reject(error);
    },
  );
}
