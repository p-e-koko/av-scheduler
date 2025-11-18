// API configuration and utilities
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Response types
export interface ApiResponse<T = any> {
  message?: string;
  data?: T;
  user?: User;
  access_token?: string;
  token_type?: string;
}

export interface User {
  id: number;
  student_id?: string;
  username?: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'coordinator' | 'student';
  promised_hours_per_week?: string;
  remaining_hours_this_week?: string;
  hours_worked_this_week?: number;
  hours_completion_percentage?: number;
  has_remaining_hours?: boolean;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  student_id?: string;
  username?: string;
  role?: string;
  promised_hours_per_week?: number;
  remaining_hours_this_week?: number;
}

// Helper function to get stored token
export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

// Helper function to store token
export const setAuthToken = (token: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
};

// Helper function to remove token
export const removeAuthToken = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }
};

// Helper function to get stored user
export const getStoredUser = (): User | null => {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

// Helper function to store user
export const setStoredUser = (user: User): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

// Generic API call function
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getAuthToken();

  console.log('Making API call to:', url);

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (token) {
    defaultHeaders.Authorization = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    console.log('Response status:', response.status);
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      throw new APIError(
        `Too many requests. Please try again in ${retryAfter} seconds.`,
        429
      );
    }

    // Handle unauthorized
    if (response.status === 401) {
      removeAuthToken();
      throw new APIError('Invalid credentials. Please check your email and password.', 401);
    }

    const data = await response.json();
    console.log('Response data:', data);

    if (!response.ok) {
      throw new APIError(
        data.message || 'An error occurred',
        response.status,
        data.errors
      );
    }

    return data;
  } catch (error) {
    console.error('API call error:', error);
    
    if (error instanceof APIError) {
      throw error;
    }
    
    // Check if it's a network error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new APIError('Cannot connect to server. Please check if the backend is running on http://localhost:8000', 0);
    }
    
    throw new APIError('Network error. Please check your connection and ensure the backend server is running.', 0);
  }
}

// Test connection to backend
export const testConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing connection to:', `${API_BASE_URL}/health`);
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    console.log('Health check response:', response.status, response.ok);
    return response.ok;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
};

// Authentication API functions
export const authAPI = {
  // Login user
  async login(credentials: LoginCredentials): Promise<ApiResponse> {
    const response = await apiCall<ApiResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });

    // Store token and user data
    if (response.access_token && response.user) {
      setAuthToken(response.access_token);
      setStoredUser(response.user);
    }

    return response;
  },

  // Register user
  async register(userData: RegisterData): Promise<ApiResponse> {
    const response = await apiCall<ApiResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    // Store token and user data
    if (response.access_token && response.user) {
      setAuthToken(response.access_token);
      setStoredUser(response.user);
    }

    return response;
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await apiCall('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeAuthToken();
    }
  },

  // Get current user
  async getCurrentUser(): Promise<User> {
    const response = await apiCall<{ user: User }>('/auth/me');
    if (response.user) {
      setStoredUser(response.user);
    }
    return response.user;
  },

  // Refresh token
  async refreshToken(): Promise<ApiResponse> {
    const response = await apiCall<ApiResponse>('/auth/refresh', {
      method: 'POST',
    });

    if (response.access_token) {
      setAuthToken(response.access_token);
    }

    return response;
  },

  // Forgot password
  async forgotPassword(email: string): Promise<ApiResponse> {
    return apiCall<ApiResponse>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Reset password
  async resetPassword(data: {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
  }): Promise<ApiResponse> {
    return apiCall<ApiResponse>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// Legacy API object for backward compatibility
export const api = {
  async request(endpoint: string, options: RequestInit = {}) {
    return apiCall(endpoint, options);
  },

  get(endpoint: string) {
    return this.request(endpoint);
  },

  post(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  put(endpoint: string, data?: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete(endpoint: string) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  },
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

// Get user role
export const getUserRole = (): string | null => {
  const user = getStoredUser();
  return user?.role || null;
};

// Check if user has specific role
export const hasRole = (role: string): boolean => {
  const userRole = getUserRole();
  return userRole === role;
};

// Check if user has any of the specified roles
export const hasAnyRole = (roles: string[]): boolean => {
  const userRole = getUserRole();
  return userRole ? roles.includes(userRole) : false;
};

// Format API errors for display
export const formatAPIError = (error: unknown): string => {
  if (error instanceof APIError) {
    if (error.errors) {
      // Return first validation error
      const firstError = Object.values(error.errors)[0];
      return Array.isArray(firstError) ? firstError[0] : error.message;
    }
    return error.message;
  }
  return 'An unexpected error occurred';
};