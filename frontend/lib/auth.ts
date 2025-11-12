import { api } from './api';

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export const auth = {
  async login(email: string, password: string) {
    const response = await api.post('/login', { email, password });
    
    if (response.token) {
      localStorage.setItem('auth-token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },

  async register(name: string, email: string, password: string, password_confirmation: string) {
    const response = await api.post('/register', { 
      name, 
      email, 
      password, 
      password_confirmation 
    });
    
    if (response.token) {
      localStorage.setItem('auth-token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    
    return response;
  },

  async logout() {
    try {
      await api.post('/logout');
    } finally {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth-token');
  },

  async getProfile() {
    return api.get('/profile');
  },
};