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
  id: string;
  student_id?: string;
  username?: string;
  name: string;
  email: string;
  role: 'admin' | 'supervisor' | 'coordinator' | 'student';
  profile_picture?: string;
  profile_picture_url?: string;
  promised_hours_per_week?: string;
  remaining_hours_this_week?: string;
  remaining_hours?: number;
  hours_worked_this_week?: number;
  hours_completion_percentage?: number;
  has_remaining_hours?: boolean;
  email_verified_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  pivot?: {
    status: string;
    checked_in: number;
    position?: string;
  };
}

export interface Assignment {
  id: number;
  assignment_name: string;
  event_name: string;
  event_location: string;
  event_start_datetime: string;
  event_end_datetime: string;
  description?: string;
  status: 'pending' | 'confirmed' | 'complete';
  created_by: string;
  creator?: User;
  users?: User[];
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  pivot?: {
    status: string;
    checked_in: number;
    position?: string;
  };
}

export interface Availability {
  id: number;
  student_id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'unavailable' | 'class';
  user?: User;
  created_at: string;
  updated_at: string;
}

export interface Position {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  profile_picture?: File;
}

// Helper function to initialize Sanctum CSRF cookie
export const initializeSanctum = async (): Promise<void> => {
  try {
    await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
      method: 'GET',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Failed to initialize Sanctum:', error);
  }
};

// Helper function to get CSRF token
export const getCSRFToken = async (): Promise<string | null> => {
  try {
    // Initialize Sanctum first
    await initializeSanctum();
    
    const response = await fetch(`${API_BASE_URL}/csrf-token`, {
      credentials: 'include',
    });
    const data = await response.json();
    return data.csrf_token;
  } catch (error) {
    console.error('Failed to get CSRF token:', error);
    return null;
  }
};

// Helper function to store token (legacy - for removing stored tokens)
export const setAuthToken = (token: string): void => {
  // No longer needed for session-based auth, but kept for cleanup
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
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

  console.log('Making API call to:', url);

  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // Get CSRF token for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET')) {
    const csrfToken = await getCSRFToken();
    if (csrfToken) {
      defaultHeaders['X-CSRF-TOKEN'] = csrfToken;
    }
  }

  const config: RequestInit = {
    ...options,
    credentials: 'include', // Include cookies for session authentication
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

    // Handle CSRF token mismatch
    if (response.status === 419) {
      throw new APIError('CSRF token mismatch.', 419);
    }

    // Handle unauthorized
    if (response.status === 401) {
      removeAuthToken(); // Clean up any stored tokens
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
    // Only log unexpected errors
    if (!(error instanceof APIError)) {
      console.error('API call error:', error);
    }
    
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

    // Store user data (no token needed for session auth)
    if (response.user) {
      setStoredUser(response.user);
    }

    return response;
  },

  // Register user
  async register(userData: RegisterData | FormData): Promise<ApiResponse> {
    const isFormData = userData instanceof FormData;
    
    const config: RequestInit = {
      method: 'POST',
    };

    if (isFormData) {
      // For FormData, don't set Content-Type header - let browser set it
      config.body = userData;
      config.headers = {
        'Accept': 'application/json',
      };

      // Get CSRF token for form data
      const csrfToken = await getCSRFToken();
      if (csrfToken) {
        config.headers = {
          ...config.headers,
          'X-CSRF-TOKEN': csrfToken,
        };
      }

      const url = `${API_BASE_URL}/auth/register`;
      const response = await fetch(url, {
        ...config,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new APIError(
          errorData.message || 'An error occurred',
          response.status,
          errorData.errors
        );
      }

      const result = await response.json();
      
      // Store user data
      if (result.user) {
        setStoredUser(result.user);
      }

      return result;
    } else {
      // For regular JSON data
      const response = await apiCall<ApiResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      // Store user data
      if (response.user) {
        setStoredUser(response.user);
      }

      return response;
    }
  },

  // Logout user
  async logout(): Promise<void> {
    try {
      await apiCall('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
      // Don't throw error - we still want to clean up local storage
    } finally {
      removeAuthToken(); // Clean up both token and user data
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

  // Refresh session
  async refreshToken(): Promise<ApiResponse> {
    const response = await apiCall<ApiResponse>('/auth/refresh', {
      method: 'POST',
    });

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

// Check if user is authenticated (now relies on stored user data and server session)
export const isAuthenticated = (): boolean => {
  // For session-based auth, we check if there's stored user data
  // The actual authentication is verified on each API call
  return !!getStoredUser();
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
      // Return all validation errors joined by newlines
      return Object.values(error.errors).flat().join('\n');
    }
    return error.message;
  }
  return 'An unexpected error occurred';
};

// User management API
export interface UsersListResponse {
  data: User[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

export interface AssignmentsListResponse {
  data: Assignment[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

export interface AvailabilityListResponse {
  data: Availability[];
  meta: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from: number;
    to: number;
  };
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
}

export interface PositionsListResponse {
  positions: Position[];
  message?: string;
}

export interface UsersQueryParams {
  page?: number;
  per_page?: number;
  role?: string;
  search?: string;
}

export interface AssignmentsQueryParams {
  page?: number;
  per_page?: number;
  status?: string;
  created_by?: number;
  start_date?: string;
  end_date?: string;
  upcoming?: boolean;
  past?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface AvailabilityQueryParams {
  page?: number;
  per_page?: number;
  student_id?: string;
  date_from?: string;
  date_to?: string;
  status?: string;
  date?: string;
}

export const userAPI = {
  // Get all users with pagination and filters
  async getUsers(params: UsersQueryParams = {}): Promise<UsersListResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params.role) queryParams.append('role', params.role);
    if (params.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/users?${queryString}` : '/users';
    
    return apiCall<UsersListResponse>(endpoint);
  },

  // Get specific user
  async getUser(id: string): Promise<{ user: User }> {
    return apiCall<{ user: User }>(`/users/${id}`);
  },

  // Create new user
  async createUser(userData: Partial<User> & { password: string } | FormData): Promise<{ message: string; user: User }> {
    const isFormData = userData instanceof FormData;
    
    const config: RequestInit = {
      method: 'POST',
    };

    if (isFormData) {
      // For FormData with file uploads, use the special file upload endpoint
      config.body = userData;
      config.headers = {
        'Accept': 'application/json',
      };

      // Get CSRF token for form data
      const csrfToken = await getCSRFToken();
      if (csrfToken) {
        config.headers = {
          ...config.headers,
          'X-CSRF-TOKEN': csrfToken,
        };
      }

      const url = `${API_BASE_URL}/users/create-with-files`;
      const response = await fetch(url, {
        ...config,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new APIError(
          errorData.message || 'An error occurred',
          response.status,
          errorData.errors
        );
      }

      return response.json();
    } else {
      // For regular JSON data, use standard endpoint
      return apiCall<{ message: string; user: User }>('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    }
  },

  // Update user
  async updateUser(id: string, userData: Partial<User> | FormData): Promise<{ message: string; user: User }> {
    const isFormData = userData instanceof FormData;
    
    if (isFormData) {
      // For FormData with file uploads, use the special file upload endpoint
      const config: RequestInit = {
        method: 'POST',
        body: userData,
        headers: {
          'Accept': 'application/json',
        }
      };

      // Get CSRF token for form data
      const csrfToken = await getCSRFToken();
      if (csrfToken) {
        config.headers = {
          ...config.headers,
          'X-CSRF-TOKEN': csrfToken,
        };
      }

      const url = `${API_BASE_URL}/users/${id}/update-with-files`;
      const response = await fetch(url, {
        ...config,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new APIError(
          errorData.message || 'An error occurred',
          response.status,
          errorData.errors
        );
      }

      return response.json();
    } else {
      // For regular JSON data, use standard PUT method
      return apiCall<{ message: string; user: User }>(`/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(userData),
      });
    }
  },

  // Delete user (soft delete)
  async deleteUser(id: number | string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  // Restore user
  async restoreUser(id: number | string): Promise<{ message: string; user: User }> {
    return apiCall<{ message: string; user: User }>(`/users/${id}/restore`, {
      method: 'POST',
    });
  },

  // Force delete user (permanent)
  async forceDeleteUser(id: number | string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/users/${id}/force-delete`, {
      method: 'DELETE',
    });
  },

  // Get trashed users
  async getTrashedUsers(params: UsersQueryParams = {}): Promise<UsersListResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/users/trashed?${queryString}` : '/users/trashed';
    
    return apiCall<UsersListResponse>(endpoint);
  }
};

// Assignment management API
export const assignmentAPI = {
  // Get all assignments with pagination and filters
  async getAssignments(params: AssignmentsQueryParams = {}): Promise<AssignmentsListResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.created_by) queryParams.append('created_by', params.created_by.toString());
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    if (params.upcoming) queryParams.append('upcoming', 'true');
    if (params.past) queryParams.append('past', 'true');
    if (params.search) queryParams.append('search', params.search);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/assignments?${queryString}` : '/assignments';
    
    return apiCall<AssignmentsListResponse>(endpoint);
  },

  // Get my assignments (for students)
  async getMyAssignments(params: AssignmentsQueryParams = {}): Promise<AssignmentsListResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/my-assignments?${queryString}` : '/my-assignments';
    
    return apiCall<AssignmentsListResponse>(endpoint);
  },

  // Get specific assignment
  async getAssignment(id: number): Promise<{ assignment: Assignment }> {
    return apiCall<{ assignment: Assignment }>(`/assignments/${id}`);
  },

  // Create new assignment (coordinator only)
  async createAssignment(assignmentData: Partial<Assignment>): Promise<{ message: string; assignment: Assignment }> {
    return apiCall<{ message: string; assignment: Assignment }>('/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  },

  // Update assignment (coordinator only)
  async updateAssignment(id: number, assignmentData: Partial<Assignment>): Promise<{ message: string; assignment: Assignment }> {
    return apiCall<{ message: string; assignment: Assignment }>(`/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(assignmentData),
    });
  },

  // Delete assignment (coordinator only)
  async deleteAssignment(id: number): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/assignments/${id}`, {
      method: 'DELETE',
    });
  },

  // Assign user to assignment (coordinator only)
  async assignUser(assignmentId: number, userId: string | number, data: { status?: string; position?: string } = {}): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/assignments/${assignmentId}/assign-user`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, ...data }),
    });
  },

  // Unassign user from assignment (coordinator only)
  async unassignUser(assignmentId: number, userId: string | number): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/assignments/${assignmentId}/unassign-user`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  },

  // Update user position in assignment (coordinator only)
  async updateUserPosition(assignmentId: number, userId: string | number, position: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/assignments/${assignmentId}/update-user-position`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, position }),
    });
  },

  // Check in user (students can check themselves in)
  async checkInUser(assignmentId: number, userId?: number): Promise<{ message: string }> {
    const endpoint = userId 
      ? `/assignments/${assignmentId}/check-in-user`
      : `/assignments/${assignmentId}/check-in`;
    
    const body = userId ? { user_id: userId } : {};
    
    return apiCall<{ message: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Check out user (students can check themselves out)
  async checkOutUser(assignmentId: number, userId?: number): Promise<{ message: string }> {
    const endpoint = userId 
      ? `/assignments/${assignmentId}/check-out-user`
      : `/assignments/${assignmentId}/check-out`;
    
    const body = userId ? { user_id: userId } : {};
    
    return apiCall<{ message: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // Accept assignment (student only)
  async acceptAssignment(assignmentId: number): Promise<{ message: string; assignment: Assignment }> {
    return apiCall<{ message: string; assignment: Assignment }>(`/assignments/${assignmentId}/accept`, {
      method: 'POST',
    });
  },

  // Reject assignment (student only)
  async rejectAssignment(assignmentId: number): Promise<{ message: string; assignment: Assignment }> {
    return apiCall<{ message: string; assignment: Assignment }>(`/assignments/${assignmentId}/reject`, {
      method: 'POST',
    });
  }
};

// Availability management API
export const availabilityAPI = {
  // Get all availability (coordinator/supervisor)
  async getAvailability(params: AvailabilityQueryParams = {}): Promise<AvailabilityListResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params.student_id) queryParams.append('student_id', params.student_id.toString());
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.status) queryParams.append('status', params.status);
    if (params.date) queryParams.append('date', params.date);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/availability?${queryString}` : '/availability';
    
    return apiCall<AvailabilityListResponse>(endpoint);
  },

  // Get my availability (for students)
  async getMyAvailability(params: AvailabilityQueryParams = {}): Promise<AvailabilityListResponse> {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.per_page) queryParams.append('per_page', params.per_page.toString());
    if (params.date_from) queryParams.append('date_from', params.date_from);
    if (params.date_to) queryParams.append('date_to', params.date_to);
    if (params.status) queryParams.append('status', params.status);
    if (params.date) queryParams.append('date', params.date);
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/my-availability?${queryString}` : '/my-availability';
    
    return apiCall<AvailabilityListResponse>(endpoint);
  },

  // Create availability (students and coordinators)
  async createAvailability(availabilityData: Partial<Availability>): Promise<{ message: string; availability: Availability }> {
    const endpoint = availabilityData.student_id ? '/availability' : '/my-availability';
    return apiCall<{ message: string; availability: Availability }>(endpoint, {
      method: 'POST',
      body: JSON.stringify(availabilityData),
    });
  },

  // Update availability
  async updateAvailability(id: number, availabilityData: Partial<Availability>): Promise<{ message: string; availability: Availability }> {
    const endpoint = availabilityData.student_id ? `/availability/${id}` : `/my-availability/${id}`;
    return apiCall<{ message: string; availability: Availability }>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(availabilityData),
    });
  },

  // Delete availability
  async deleteAvailability(id: number, isMyAvailability = false): Promise<{ message: string }> {
    const endpoint = isMyAvailability ? `/my-availability/${id}` : `/availability/${id}`;
    return apiCall<{ message: string }>(endpoint, {
      method: 'DELETE',
    });
  },

  // Bulk create availability
  async bulkCreateAvailability(availabilityData: Partial<Availability>[], isMyAvailability = false): Promise<{ message: string }> {
    const endpoint = isMyAvailability ? '/my-availability/bulk' : '/availability/bulk';
    return apiCall<{ message: string }>(endpoint, {
      method: 'POST',
      body: JSON.stringify({ availability: availabilityData }),
    });
  }
};

// Position management API
export const positionAPI = {
  // Get all positions
  async getPositions(): Promise<PositionsListResponse> {
    return apiCall<PositionsListResponse>('/positions');
  },

  // Get active positions only
  async getActivePositions(): Promise<PositionsListResponse> {
    return apiCall<PositionsListResponse>('/positions-active');
  },

  // Get specific position
  async getPosition(id: string): Promise<{ position: Position }> {
    return apiCall<{ position: Position }>(`/positions/${id}`);
  },

  // Create new position (coordinator only)
  async createPosition(positionData: Partial<Position>): Promise<{ message: string; position: Position }> {
    return apiCall<{ message: string; position: Position }>('/positions', {
      method: 'POST',
      body: JSON.stringify(positionData),
    });
  },

  // Update position (coordinator only)
  async updatePosition(id: string, positionData: Partial<Position>): Promise<{ message: string; position: Position }> {
    return apiCall<{ message: string; position: Position }>(`/positions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(positionData),
    });
  },

  // Delete position (coordinator only)
  async deletePosition(id: string): Promise<{ message: string }> {
    return apiCall<{ message: string }>(`/positions/${id}`, {
      method: 'DELETE',
    });
  }
};