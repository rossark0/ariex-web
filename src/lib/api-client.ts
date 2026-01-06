import axios from 'axios';
import { auth } from '@/lib/firebase-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Hook to get authenticated API client
export function useApiClient() {
  // Configure interceptor to add Firebase token
  apiClient.interceptors.request.use(
    async config => {
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => {
      return Promise.reject(error);
    }
  );

  return apiClient;
}

// API methods - Note: Most API calls should use ORPC client instead
export const api = {
  users: {
    getMe: () => apiClient.get('/users/me'),
    getAll: () => apiClient.get('/users'),
    getById: (id: string) => apiClient.get(`/users/${id}`),
    update: (id: string, data: any) => apiClient.patch(`/users/${id}`, data),
    delete: (id: string) => apiClient.delete(`/users/${id}`),
  },
  subscriptions: {
    getAll: () => apiClient.get('/subscriptions'),
    getById: (id: string) => apiClient.get(`/subscriptions/${id}`),
    create: (data: any) => apiClient.post('/subscriptions', data),
    update: (id: string, data: any) => apiClient.patch(`/subscriptions/${id}`, data),
    cancel: (id: string) => apiClient.delete(`/subscriptions/${id}`),
  },
};
