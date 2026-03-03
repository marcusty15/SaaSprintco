import { create } from 'zustand';
import { api } from '../lib/api';

const TOKEN_KEY = 'printos_token';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem(TOKEN_KEY) || null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const data = await api.post('/auth/login', { email, password });
      localStorage.setItem(TOKEN_KEY, data.token);
      set({ token: data.token, user: data.user, loading: false });
      return data;
    } catch (err) {
      set({ loading: false, error: err.message });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, error: null });
  },

  fetchMe: async () => {
    if (!get().token) return;
    set({ loading: true });
    try {
      const user = await api.get('/auth/me');
      set({ user, loading: false });
    } catch {
      // token expirado o inválido
      localStorage.removeItem(TOKEN_KEY);
      set({ user: null, token: null, loading: false });
    }
  },

  hasRole: (...roles) => {
    const { user } = get();
    return user ? roles.includes(user.role) : false;
  },
}));
