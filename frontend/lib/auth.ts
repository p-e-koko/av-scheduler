import { api, authAPI, getStoredUser, setStoredUser, removeAuthToken, type User } from './api';

export type { User };

export const auth = {
  async login(email: string, password: string) {
    const response = await authAPI.login({ email, password });
    
    // User data is automatically stored in authAPI.login
    return response;
  },

  async register(name: string, email: string, password: string, password_confirmation: string) {
    const response = await authAPI.register({ 
      name, 
      email, 
      password, 
      password_confirmation 
    });
    
    // User data is automatically stored in authAPI.register
    return response;
  },

  async logout() {
    try {
      await authAPI.logout();
    } finally {
      // Clean up any stored user data
      removeAuthToken();
    }
  },

  getCurrentUser(): User | null {
    return getStoredUser();
  },

  isAuthenticated(): boolean {
    // For session-based auth, we check if there's stored user data
    // The actual authentication is verified on each API call
    return !!getStoredUser();
  },

  async getProfile() {
    return authAPI.getCurrentUser();
  },

  async verifyEmail(url: string) {
    return authAPI.verifyEmail(url);
  },

  async resendVerificationEmail() {
    return authAPI.resendVerificationEmail();
  },
};