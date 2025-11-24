# 🚀 API Quick Reference

## Base URL
```
http://localhost:8000/api
```

## Authentication
```bash
# Login
POST /auth/login
Body: {"email": "user@email.com", "password": "password123"}

# Get CSRF token for state-changing requests
GET /csrf-token
Header: X-CSRF-TOKEN: {csrf_token}

# Authentication is handled via HTTP-only session cookies
```

## 📋 Quick Endpoints Reference

### 🔐 Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | Login user | ❌ |
| POST | `/auth/logout` | Logout user | 🍪 |
| GET | `/auth/me` | Get current user | 🍪 |
| POST | `/auth/refresh` | Refresh session | 🍪 |
| POST | `/auth/forgot-password` | Request reset token | ❌ |
| POST | `/auth/reset-password` | Reset password | ❌ |
| GET | `/csrf-token` | Get CSRF token | ❌ |

### 👥 User Management
| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| GET | `/users` | List users | Admin, Supervisor, Coordinator |
| GET | `/users/{id}` | Get specific user | Admin, Supervisor, Coordinator |
| POST | `/users` | Create user | Admin only |
| PUT | `/users/{id}` | Update user | Admin only |
| DELETE | `/users/{id}` | Soft delete user | Admin only |
| GET | `/users/trashed` | List deleted users | Admin only |
| POST | `/users/{id}/restore` | Restore user | Admin only |
| DELETE | `/users/{id}/force` | Permanently delete | Admin only |
| GET | `/profile` | Get own profile | All authenticated |
| PUT | `/profile` | Update own profile | All authenticated |

### 📋 Assignment Management
| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| GET | `/assignments` | List assignments | Supervisor, Coordinator, Student |
| GET | `/assignments/{id}` | Get specific assignment | Supervisor, Coordinator, Student |
| POST | `/assignments` | Create assignment | Coordinator only |
| PUT | `/assignments/{id}` | Update assignment | Coordinator only |
| DELETE | `/assignments/{id}` | Soft delete assignment | Coordinator only |
| GET | `/assignments/trashed` | List deleted assignments | Coordinator only |
| POST | `/assignments/{id}/restore` | Restore assignment | Coordinator only |
| DELETE | `/assignments/{id}/force` | Permanently delete | Coordinator only |
| POST | `/assignments/{id}/assign-user` | Assign user to assignment | Coordinator only |
| POST | `/assignments/{id}/unassign-user` | Remove user from assignment | Coordinator only |
| POST | `/assignments/{id}/update-user-position` | Update user position | Coordinator only |
| POST | `/assignments/{id}/check-in-user` | Check in user | Coordinator only |
| POST | `/assignments/{id}/check-out-user` | Check out user | Coordinator only |
| GET | `/my-assignments` | Get student's assignments | Student only |
| POST | `/assignments/{id}/check-in` | Self check in | Student only |
| POST | `/assignments/{id}/check-out` | Self check out | Student only |

### 📅 Availability Management
| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| GET | `/my-availability` | Get student's own availability | Student only |
| POST | `/my-availability` | Create student's availability | Student only |
| PUT | `/my-availability/{id}` | Update student's availability | Student only (own) |
| DELETE | `/my-availability/{id}` | Delete student's availability | Student only (own) |
| POST | `/my-availability/bulk` | Bulk create student's availability | Student only |
| GET | `/my-availability/schedule` | Get student's own schedule | Student only |
| GET | `/availability` | Get all availability | Coordinator, Supervisor |
| POST | `/availability` | Create availability for any student | Coordinator only |
| GET | `/availability/{id}` | Get specific availability | Coordinator, Supervisor |
| PUT | `/availability/{id}` | Update any availability | Coordinator only |
| DELETE | `/availability/{id}` | Delete any availability | Coordinator only |
| GET | `/availability/schedule` | Get schedule overview | Coordinator, Supervisor |
| POST | `/availability/bulk` | Bulk create availability | Coordinator only |

### 🎯 Position Management
| Method | Endpoint | Description | Permissions |
|--------|----------|-------------|-------------|
| GET | `/positions` | List all positions | Coordinator only |
| POST | `/positions` | Create new position | Coordinator only |
| GET | `/positions/{id}` | Get specific position | Coordinator only |
| PUT | `/positions/{id}` | Update position | Coordinator only |
| DELETE | `/positions/{id}` | Delete position | Coordinator only |
| GET | `/positions-active` | Get active positions | Coordinator only |

### 📊 System
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | API health check | ❌ |

## ⚡ Rate Limits
- **Auth endpoints**: 5/minute per IP
- **API endpoints**: 60/minute per user
- **Sensitive ops**: 10/minute per user

## 🎭 User Roles & Permissions

### Student
- ✅ View/edit own profile
- ✅ View assignments (read-only)
- ✅ View own assignments
- ✅ Self check-in/check-out
- ✅ Full CRUD on own availability
- ✅ Bulk create own availability
- ❌ View other users
- ❌ User management
- ❌ Assignment management
- ❌ View other students' availability

### Coordinator
- ✅ View/edit own profile
- ✅ View all users
- ✅ Full assignment management
- ✅ User assignment operations
- ✅ Check-in/out management
- ✅ Full position management
- ✅ Create/edit/delete positions
- ✅ Assign positions to users
- ✅ Full CRUD on all student availability
- ✅ View schedule overview
- ✅ Bulk availability operations
- ❌ Create/edit/delete users

### Supervisor
- ✅ View/edit own profile
- ✅ View all users
- ✅ View assignments (read-only)
- ✅ View all student availability (read-only)
- ✅ View schedule overview (read-only)
- ❌ Create/edit/delete users
- ❌ Assignment management
- ❌ Availability management

### Admin
- ✅ Full user management
- ✅ View/edit own profile
- ✅ System administration
- ❌ Assignment management (by design)
- ❌ Availability management (by design)

## 📝 Common Request Examples

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```

### Get Users (with session)
```bash
curl -X GET http://localhost:8000/api/users \
  -H "Accept: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt
```

### Create User
```bash
# First get CSRF token
CSRF_TOKEN=$(curl -X GET http://localhost:8000/api/csrf-token \
  -H "Accept: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt \
  -s | jq -r '.csrf_token')

# Then create user
curl -X POST http://localhost:8000/api/users \
  -H "X-CSRF-TOKEN: $CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --cookie-jar cookies.txt \
  --cookie cookies.txt \
  -d '{
    "name": "New User",
    "email": "new@example.com",
    "password": "password123",
    "role": "student"
  }'
```

### Filter Users
```bash
curl -X GET "http://localhost:8000/api/users?role=student&search=john&page=1" \
  -H "Authorization: Bearer 1|abc123..." \
  -H "Accept: application/json"
```

### Create Assignment
```bash
curl -X POST http://localhost:8000/api/assignments \
  -H "Authorization: Bearer 1|abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "assignment_name": "Tech Conference 2025",
    "event_name": "Annual Technology Conference",
    "event_location": "Convention Center",
    "event_start_datetime": "2025-12-15T09:00:00",
    "event_end_datetime": "2025-12-15T17:00:00",
    "status": "pending"
  }'
```

### Assign User to Assignment
```bash
curl -X POST http://localhost:8000/api/assignments/1/assign-user \
  -H "Authorization: Bearer 1|abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 3,
    "position": "Audio-Mixer",
    "status": "assigned"
  }'
```

### Create New Position
```bash
curl -X POST http://localhost:8000/api/positions \
  -H "Authorization: Bearer 1|coordinatortoken..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Video Editor",
    "description": "Handles post-production video editing",
    "is_active": true
  }'
```

### Update User Position
```bash
curl -X POST http://localhost:8000/api/assignments/1/update-user-position \
  -H "Authorization: Bearer 1|coordinatortoken..." \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 3,
    "position": "Camera Operator"
  }'
```

### Get Active Positions
```bash
curl -X GET http://localhost:8000/api/positions-active \
  -H "Authorization: Bearer 1|coordinatortoken..." \
  -H "Accept: application/json"
```

### Student Self Check-In
```bash
curl -X POST http://localhost:8000/api/assignments/1/check-in \
  -H "Authorization: Bearer 1|studenttoken..." \
  -H "Accept: application/json"
```

### Get My Availability
```bash
curl -X GET "http://localhost:8000/api/my-availability?date_from=2025-11-25&status=available" \
  -H "Authorization: Bearer 1|studenttoken..." \
  -H "Accept: application/json"
```

### Create My Availability
```bash
curl -X POST http://localhost:8000/api/my-availability \
  -H "Authorization: Bearer 1|studenttoken..." \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2025-11-25",
    "start_time": "09:00:00",
    "end_time": "12:00:00",
    "status": "available"
  }'
```

### Bulk Create Availability
```bash
curl -X POST http://localhost:8000/api/my-availability/bulk \
  -H "Authorization: Bearer 1|studenttoken..." \
  -H "Content-Type: application/json" \
  -d '{
    "availability": [
      {
        "date": "2025-11-25",
        "start_time": "09:00:00",
        "end_time": "12:00:00",
        "status": "available"
      },
      {
        "date": "2025-11-25",
        "start_time": "13:00:00",
        "end_time": "15:00:00",
        "status": "class"
      }
    ]
  }'
```

### Get My Schedule (Student)
```bash
curl -X GET "http://localhost:8000/api/my-availability/schedule?date_from=2025-11-25&date_to=2025-12-01" \
  -H "Authorization: Bearer 1|studenttoken..." \
  -H "Accept: application/json"
```

### Get All Availability (Coordinator)
```bash
curl -X GET "http://localhost:8000/api/availability?student_id=123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer 1|coordinatortoken..." \
  -H "Accept: application/json"
```

### Get Schedule Overview
```bash
curl -X GET "http://localhost:8000/api/availability/schedule?date_from=2025-11-25&date_to=2025-12-01" \
  -H "Authorization: Bearer 1|coordinatortoken..." \
  -H "Accept: application/json"
```

### Create Availability for Student (Coordinator)
```bash
curl -X POST http://localhost:8000/api/availability \
  -H "Authorization: Bearer 1|coordinatortoken..." \
  -H "Content-Type: application/json" \
  -d '{
    "student_id": "123e4567-e89b-12d3-a456-426614174000",
    "date": "2025-11-25",
    "start_time": "14:00:00",
    "end_time": "18:00:00",
    "status": "available"
  }'
```

## 🚨 Error Responses

### 401 - Unauthenticated
```json
{"message": "Unauthenticated"}
```

### 403 - Forbidden
```json
{
  "message": "Forbidden. Required roles: admin",
  "user_role": "student"
}
```

### 422 - Validation Error
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "email": ["The email field is required."],
    "password": ["The password must be at least 8 characters."]
  }
}
```

### 429 - Rate Limited
```json
{
  "message": "Too many login attempts. Please try again in 60 seconds.",
  "retry_after": "60"
}
```

## 🔧 Frontend Setup (Next.js/React)

```javascript
// api.js
const API_BASE_URL = 'http://localhost:8000/api';

// Get CSRF token
const getCSRFToken = async () => {
  const response = await fetch(`${API_BASE_URL}/csrf-token`, {
    credentials: 'include'
  });
  const data = await response.json();
  return data.csrf_token;
};

// Generic API call
const apiCall = async (endpoint, options = {}) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
  
  // Add CSRF token for state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase())) {
    const csrfToken = await getCSRFToken();
    if (csrfToken) {
      defaultHeaders['X-CSRF-TOKEN'] = csrfToken;
    }
  }
  
  return fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};

export { apiCall };
```

## 🎯 Quick Integration Checklist

- [ ] Set up fetch API with credentials: 'include' for session cookies
- [ ] Implement CSRF token handling for state-changing requests
- [ ] Implement login/logout functionality with session management
- [ ] Store user data (not tokens) for UI state management
- [ ] Handle rate limiting (429 responses)
- [ ] Implement error handling for all status codes
- [ ] Set up role-based UI components
- [ ] Configure CORS with credentials support for your frontend domain
- [ ] Test all endpoints with different user roles
- [ ] Verify session persistence across browser tabs

## 📞 Support

For detailed documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---
*Generated for final-project-p-e-koko API v1.0*
