import { create } from 'zustand';
import api from '../services/api';
import socket from '../services/socket';

const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token'),
  loading: false,
  error: null,

  register: async (username, email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/register', { username, email, password });
      localStorage.setItem('token', res.data.token);
      socket.connect();
      socket.emit('user:online', res.data.user.id);
      set({ user: res.data.user, token: res.data.token, isAuthenticated: true, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Registration failed', loading: false });
    }
  },

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      socket.connect();
      socket.emit('user:online', res.data.user.id);
      set({ user: res.data.user, token: res.data.token, isAuthenticated: true, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || 'Login failed', loading: false });
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    localStorage.removeItem('token');
    socket.disconnect();
    set({ user: null, token: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  getMe: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ user: res.data.user, isAuthenticated: true });
    } catch (_) {
      localStorage.removeItem('token');
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;