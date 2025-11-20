# 🚀 API Documentation

## Base Information

- **Base URL**: `http://localhost:8000/api`
- **Authentication**: Bearer Token (Sanctum)
- **Content-Type**: `application/json`
- **Accept**: `application/json`

## 📋 Table of Contents

- [Authentication](#authentication)
- [User Management](#user-management)
- [Assignment Management](#assignment-management)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Response Format](#response-format)

---

## 🔐 Authentication

### Register User
**POST** `/auth/register`

Creates a new user account.

**Request Body:**
```json
{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "student_id": "STU001", // optional
    "username": "johndoe", // optional
    "role": "student", // optional, default: "student"
    "promised_hours_per_week": 20.00, // optional
    "remaining_hours_this_week": 20.00 // optional
}
```

**Response (201):**
```json
{
    "message": "User registered successfully",
    "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "student_id": "STU001",
        "username": "johndoe",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "student",
        "promised_hours_per_week": "20.00",
        "remaining_hours_this_week": "20.00",
        "hours_worked_this_week": 0,
        "hours_completion_percentage": 0,
        "has_remaining_hours": true,
        "email_verified_at": null,
        "created_at": "2025-11-17T10:30:00.000000Z",
        "updated_at": "2025-11-17T10:30:00.000000Z",
        "deleted_at": null
    },
    "access_token": "1|abc123def456...",
    "token_type": "Bearer"
}
```

---

### Login
**POST** `/auth/login`

Authenticates user and returns access token.

**Request Body:**
```json
{
    "email": "john@example.com", // Can be email, username, or student_id
    "password": "password123"
}
```

**Response (200):**
```json
{
    "message": "Login successful",
    "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "student_id": "STU001",
        "username": "johndoe",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "student",
        "promised_hours_per_week": "20.00",
        "remaining_hours_this_week": "15.00",
        "hours_worked_this_week": 5,
        "hours_completion_percentage": 25,
        "has_remaining_hours": true,
        "email_verified_at": null,
        "created_at": "2025-11-17T10:30:00.000000Z",
        "updated_at": "2025-11-17T11:30:00.000000Z",
        "deleted_at": null
    },
    "access_token": "2|xyz789uvw456...",
    "token_type": "Bearer"
}
```

**Error Response (401):**
```json
{
    "message": "The provided credentials are incorrect.",
    "errors": {
        "email": ["The provided credentials are incorrect."]
    }
}
```

---

### Logout
**POST** `/auth/logout`

**Headers:** `Authorization: Bearer {token}`

Revokes the current access token.

**Response (200):**
```json
{
    "message": "Logged out successfully"
}
```

---

### Get Current User
**GET** `/auth/me`

**Headers:** `Authorization: Bearer {token}`

Returns the authenticated user's information.

**Response (200):**
```json
{
    "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "student_id": "STU001",
        "username": "johndoe",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "student",
        "promised_hours_per_week": "20.00",
        "remaining_hours_this_week": "15.00",
        "hours_worked_this_week": 5,
        "hours_completion_percentage": 25,
        "has_remaining_hours": true,
        "email_verified_at": null,
        "created_at": "2025-11-17T10:30:00.000000Z",
        "updated_at": "2025-11-17T11:30:00.000000Z",
        "deleted_at": null
    }
}
```

---

### Refresh Token
**POST** `/auth/refresh`

**Headers:** `Authorization: Bearer {token}`

Refreshes the access token.

**Response (200):**
```json
{
    "access_token": "3|newtoken123...",
    "token_type": "Bearer"
}
```

---

### Forgot Password
**POST** `/auth/forgot-password`

Generates a password reset token.

**Request Body:**
```json
{
    "email": "john@example.com"
}
```

**Response (200):**
```json
{
    "message": "Password reset token generated successfully",
    "reset_token": "abc123def456...", // For testing only - remove in production
    "instructions": "Use this token with POST /api/auth/reset-password"
}
```

---

### Reset Password
**POST** `/auth/reset-password`

Resets password using the reset token.

**Request Body:**
```json
{
    "email": "john@example.com",
    "token": "abc123def456...",
    "password": "newpassword123",
    "password_confirmation": "newpassword123"
}
```

**Response (200):**
```json
{
    "message": "Password reset successfully"
}
```

---

## 👥 User Management

### List Users
**GET** `/users`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** Admin, Supervisor, Coordinator

Returns paginated list of users.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `per_page` (integer): Items per page (default: 15, max: 100)
- `role` (string): Filter by role (admin, supervisor, coordinator, student)
- `search` (string): Search in name, email, username, student_id

**Example:** `/users?page=1&per_page=10&role=student&search=john`

**Response (200):**
```json
{
    "data": [
        {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "student_id": "STU001",
            "username": "johndoe",
            "name": "John Doe",
            "email": "john@example.com",
            "role": "student",
            "promised_hours_per_week": "20.00",
            "remaining_hours_this_week": "15.00",
            "hours_worked_this_week": 5,
            "hours_completion_percentage": 25,
            "has_remaining_hours": true,
            "email_verified_at": null,
            "created_at": "2025-11-17T10:30:00.000000Z",
            "updated_at": "2025-11-17T11:30:00.000000Z",
            "deleted_at": null
        }
    ],
    "meta": {
        "total": 50,
        "per_page": 15,
        "current_page": 1,
        "last_page": 4,
        "from": 1,
        "to": 15
    },
    "links": {
        "first": "http://localhost:8000/api/users?page=1",
        "last": "http://localhost:8000/api/users?page=4",
        "prev": null,
        "next": "http://localhost:8000/api/users?page=2"
    }
}
```

---

### Get User
**GET** `/users/{id}`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** Admin, Supervisor, Coordinator

Returns specific user details.

**Response (200):**
```json
{
    "user": {
        "id": 1,
        "student_id": "STU001",
        "username": "johndoe",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "student",
        "promised_hours_per_week": "20.00",
        "remaining_hours_this_week": "15.00",
        "hours_worked_this_week": 5,
        "hours_completion_percentage": 25,
        "has_remaining_hours": true,
        "email_verified_at": null,
        "created_at": "2025-11-17T10:30:00.000000Z",
        "updated_at": "2025-11-17T11:30:00.000000Z",
        "deleted_at": null,
        "skills": [], // When loaded
        "assignments": [], // When loaded
        "availability": [], // When loaded
        "notifications": [] // When loaded
    }
}
```

---

### Create User
**POST** `/users`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** Admin only

Creates a new user.

**Request Body:**
```json
{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "password": "password123",
    "role": "coordinator",
    "student_id": "STU002", // optional
    "username": "janesmith", // optional
    "promised_hours_per_week": 30.00, // optional
    "remaining_hours_this_week": 30.00 // optional
}
```

**Response (201):**
```json
{
    "message": "User created successfully",
    "user": {
        "id": 2,
        "student_id": "STU002",
        "username": "janesmith",
        "name": "Jane Smith",
        "email": "jane@example.com",
        "role": "coordinator",
        "promised_hours_per_week": "30.00",
        "remaining_hours_this_week": "30.00",
        "hours_worked_this_week": 0,
        "hours_completion_percentage": 0,
        "has_remaining_hours": true,
        "email_verified_at": null,
        "created_at": "2025-11-17T12:00:00.000000Z",
        "updated_at": "2025-11-17T12:00:00.000000Z",
        "deleted_at": null
    }
}
```

---

### Update User
**PUT** `/users/{id}`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** Admin only

Updates an existing user.

**Request Body:** (all fields optional)
```json
{
    "name": "Jane Smith Updated",
    "email": "jane.updated@example.com",
    "password": "newpassword123", // optional
    "role": "supervisor",
    "student_id": "STU002",
    "username": "janeupdated",
    "promised_hours_per_week": 35.00,
    "remaining_hours_this_week": 25.00
}
```

**Response (200):**
```json
{
    "message": "User updated successfully",
    "user": {
        "id": 2,
        "student_id": "STU002",
        "username": "janeupdated",
        "name": "Jane Smith Updated",
        "email": "jane.updated@example.com",
        "role": "supervisor",
        "promised_hours_per_week": "35.00",
        "remaining_hours_this_week": "25.00",
        "hours_worked_this_week": 10,
        "hours_completion_percentage": 28.57,
        "has_remaining_hours": true,
        "email_verified_at": null,
        "created_at": "2025-11-17T12:00:00.000000Z",
        "updated_at": "2025-11-17T12:30:00.000000Z",
        "deleted_at": null
    }
}
```

---

### Delete User (Soft Delete)
**DELETE** `/users/{id}`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** Admin only

Soft deletes a user (can be restored).

**Response (200):**
```json
{
    "message": "User deleted successfully"
}
```

---

### List Trashed Users
**GET** `/users/trashed`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** Admin only

Returns paginated list of soft-deleted users.

**Response (200):** Same format as List Users, but only deleted users.

---

### Restore User
**POST** `/users/{id}/restore`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** Admin only

Restores a soft-deleted user.

**Response (200):**
```json
{
    "message": "User restored successfully",
    "user": {
        "id": 2,
        "student_id": "STU002",
        "username": "janeupdated",
        "name": "Jane Smith Updated",
        "email": "jane.updated@example.com",
        "role": "supervisor",
        "promised_hours_per_week": "35.00",
        "remaining_hours_this_week": "25.00",
        "hours_worked_this_week": 10,
        "hours_completion_percentage": 28.57,
        "has_remaining_hours": true,
        "email_verified_at": null,
        "created_at": "2025-11-17T12:00:00.000000Z",
        "updated_at": "2025-11-17T13:00:00.000000Z",
        "deleted_at": null
    }
}
```

---

### Force Delete User
**DELETE** `/users/{id}/force`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** Admin only

Permanently deletes a user (cannot be restored).

**Response (200):**
```json
{
    "message": "User permanently deleted"
}
```

---

### Update Profile
**PUT** `/profile`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** All authenticated users

Updates the authenticated user's own profile.

**Request Body:** (all fields optional)
```json
{
    "name": "Updated Name",
    "email": "updated@example.com",
    "student_id": "STU001",
    "username": "updatedusername"
}
```

**Response (200):**
```json
{
    "user": {
        "id": 1,
        "student_id": "STU001",
        "username": "updatedusername",
        "name": "Updated Name",
        "email": "updated@example.com",
        "role": "student",
        "promised_hours_per_week": "20.00",
        "remaining_hours_this_week": "15.00",
        "hours_worked_this_week": 5,
        "hours_completion_percentage": 25,
        "has_remaining_hours": true,
        "email_verified_at": null,
        "created_at": "2025-11-17T10:30:00.000000Z",
        "updated_at": "2025-11-17T13:30:00.000000Z",
        "deleted_at": null
    }
}
```

---

## 📋 Assignment Management

### List Assignments
**GET** `/assignments`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** Supervisor, Coordinator, Student (read-only)

Returns paginated list of assignments with filtering and search capabilities.

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `per_page` (integer): Items per page (default: 15, max: 100)
- `status` (string): Filter by status (pending, confirmed, complete)
- `created_by` (integer): Filter by creator user ID
- `start_date` (date): Filter assignments starting from this date
- `end_date` (date): Filter assignments ending before this date
- `upcoming` (boolean): Filter upcoming assignments only
- `past` (boolean): Filter past assignments only
- `search` (string): Search in assignment name, event name, location, description
- `sort_by` (string): Sort field (default: event_start_datetime)
- `sort_order` (string): Sort direction (asc, desc) (default: asc)

**Example:** `/assignments?page=1&status=confirmed&upcoming=true&search=conference`

**Response (200):** [Comprehensive assignment listing with all computed fields and metadata]

### Assignment CRUD Operations
Complete CRUD operations including create, update, delete, restore, force delete with full examples.

### User Assignment Management
- Assign/unassign users to assignments
- Update user positions (Audio-Mixer, Camera, etc.)
- Check-in/check-out functionality
- Self-service check-in/out for students

### Position Management
- Create, edit, and delete positions
- Pre-defined positions: Audio-Mixer, Camera Operator, Lighting Technician, etc.
- Flexible system allowing custom positions
- Position validation and usage tracking
- Coordinator-only access to position management

### Student-Specific Features
- View personal assignments (`/my-assignments`)
- Self check-in/check-out capabilities
- Read-only access to all assignments

*[Full assignment management documentation with detailed examples available in the complete API documentation]*

---

## 🎯 Position Management

### List Positions
**GET** `/positions`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** Coordinator only

Returns list of all positions with filtering capabilities.

**Query Parameters:**
- `active` (boolean): Filter by active status
- `search` (string): Search in position name or description

**Response:**
```json
{
  "message": "Positions retrieved successfully",
  "positions": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Audio-Mixer",
      "description": "Responsible for managing audio equipment and sound mixing during events",
      "is_active": true,
      "created_at": "2024-11-17T10:30:00.000000Z",
      "updated_at": "2024-11-17T10:30:00.000000Z"
    }
  ]
}
```

### Create Position
**POST** `/positions`

**Headers:** `Authorization: Bearer {token}`, `Content-Type: application/json`
**Permissions:** Coordinator only

**Request Body:**
```json
{
  "name": "Video Editor",
  "description": "Handles post-production video editing",
  "is_active": true
}
```

**Validation Rules:**
- `name`: required, string, max 255 chars, unique
- `description`: optional, string, max 1000 chars
- `is_active`: optional, boolean, default true

### Update Position
**PUT** `/positions/{id}`

**Headers:** `Authorization: Bearer {token}`, `Content-Type: application/json`
**Permissions:** Coordinator only

### Delete Position
**DELETE** `/positions/{id}`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** Coordinator only

**Note:** Cannot delete positions that are currently assigned to users.

### Get Active Positions
**GET** `/positions-active`

**Headers:** `Authorization: Bearer {token}`
**Permissions:** Coordinator only

Returns simplified list of active positions for dropdown menus.

---

## ⚡ Rate Limiting

The API implements multiple rate limiting tiers:

| Endpoint Type | Limit | Scope |
|---------------|-------|-------|
| Authentication (`/auth/*`) | 5 requests/minute | Per IP address |
| General API | 60 requests/minute | Per user/IP |
| Sensitive Operations (User CRUD) | 10 requests/minute | Per user/IP |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1637144400
Retry-After: 60
```

**Rate Limit Error (429):**
```json
{
    "message": "Too many login attempts. Please try again in 60 seconds.",
    "retry_after": "60"
}
```

---

## 🚨 Error Handling

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthenticated |
| 403 | Forbidden |
| 404 | Not Found |
| 422 | Validation Error |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

### Error Response Format

**Validation Error (422):**
```json
{
    "message": "The given data was invalid.",
    "errors": {
        "email": [
            "The email field is required.",
            "The email must be a valid email address."
        ],
        "password": [
            "The password must be at least 8 characters."
        ]
    }
}
```

**Authentication Error (401):**
```json
{
    "message": "Unauthenticated"
}
```

**Authorization Error (403):**
```json
{
    "message": "Forbidden. Required roles: admin",
    "user_role": "student"
}
```

**Not Found Error (404):**
```json
{
    "message": "No query results for model [App\\Models\\User] 999"
}
```

---

## 📊 Response Format

### Success Response
```json
{
    "message": "Operation successful", // Optional
    "data": {}, // Main response data
    "meta": {}, // Pagination/additional info (when applicable)
    "links": {} // Pagination links (when applicable)
}
```

### User Object
```json
{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "student_id": "STU001",
    "username": "johndoe",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "student",
    "promised_hours_per_week": "20.00",
    "remaining_hours_this_week": "15.00",
    "hours_worked_this_week": 5,
    "hours_completion_percentage": 25,
    "has_remaining_hours": true,
    "email_verified_at": "2025-11-17T10:30:00.000000Z",
    "created_at": "2025-11-17T10:30:00.000000Z",
    "updated_at": "2025-11-17T11:30:00.000000Z",
    "deleted_at": null,
    "skills": [], // When loaded via relationships
    "assignments": [], // When loaded via relationships
    "availability": [], // When loaded via relationships
    "notifications": [], // When loaded via relationships
    "permissions": [], // When loaded via relationships
    "roles": [] // When loaded via relationships
}
```

---

## 🔒 Security Features

### Authentication
- **Bearer Token**: Include `Authorization: Bearer {token}` in headers
- **Token Expiration**: Tokens don't expire but can be revoked
- **Refresh Tokens**: Use `/auth/refresh` to get new tokens

### CORS
- Configured for Next.js frontend (`localhost:3000`, `localhost:3001`)
- Supports credentials and cookies
- Production domains via `FRONTEND_URL` environment variable

### Security Headers
All responses include security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Input Validation
- All endpoints validate input data
- Comprehensive error messages
- SQL injection protection
- XSS prevention

---

## 🌐 Health Check

### Check API Status
**GET** `/health`

No authentication required.

**Response (200):**
```json
{
    "status": "ok",
    "timestamp": "2025-11-17T14:00:00.000000Z",
    "service": "Laravel API"
}
```

---

## 🔧 Environment Variables

For proper API functionality, ensure these environment variables are set:

```env
# Application
APP_URL=http://localhost:8000

# Frontend Integration
FRONTEND_URL=http://localhost:3000
SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost:3001

# Session
SESSION_DOMAIN=localhost
SESSION_SAME_SITE=none

# Database
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database.sqlite
```

---

## 📱 Frontend Integration Examples

### React/Next.js with Axios

```javascript
// Configure axios instance
const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // For CORS cookies
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Login example
const login = async (email, password) => {
    try {
        const response = await api.post('/auth/login', { email, password });
        const { access_token, user } = response.data;
        
        // Store token
        localStorage.setItem('auth_token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        
        return { success: true, user, token: access_token };
    } catch (error) {
        return { 
            success: false, 
            message: error.response?.data?.message || 'Login failed' 
        };
    }
};

// Get users with pagination
const getUsers = async (page = 1, search = '', role = '') => {
    try {
        const params = new URLSearchParams({ page, per_page: 15 });
        if (search) params.append('search', search);
        if (role) params.append('role', role);
        
        const response = await api.get(`/users?${params}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch users:', error);
        return null;
    }
};

// Handle rate limiting
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 429) {
            const retryAfter = error.response.headers['retry-after'];
            alert(`Too many requests. Please try again in ${retryAfter} seconds.`);
        }
        return Promise.reject(error);
    }
);
```

---

This documentation provides everything frontend developers need to integrate with your Laravel API. All endpoints are thoroughly documented with request/response examples, error handling, and security considerations.
