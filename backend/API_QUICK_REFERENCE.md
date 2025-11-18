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

# Use token in headers
Authorization: Bearer 1|abc123...
```

## 📋 Quick Endpoints Reference

### 🔐 Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | ❌ |
| POST | `/auth/login` | Login user | ❌ |
| POST | `/auth/logout` | Logout user | ✅ |
| GET | `/auth/me` | Get current user | ✅ |
| POST | `/auth/refresh` | Refresh token | ✅ |
| POST | `/auth/forgot-password` | Request reset token | ❌ |
| POST | `/auth/reset-password` | Reset password | ❌ |

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
- ❌ View other users
- ❌ User management

### Coordinator
- ✅ View/edit own profile
- ✅ View all users
- ❌ Create/edit/delete users

### Supervisor
- ✅ View/edit own profile
- ✅ View all users
- ❌ Create/edit/delete users

### Admin
- ✅ Full user management
- ✅ View/edit own profile
- ✅ System administration

## 📝 Common Request Examples

### Login
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
```

### Get Users (with token)
```bash
curl -X GET http://localhost:8000/api/users \
  -H "Authorization: Bearer 1|abc123..." \
  -H "Accept: application/json"
```

### Create User
```bash
curl -X POST http://localhost:8000/api/users \
  -H "Authorization: Bearer 1|abc123..." \
  -H "Content-Type: application/json" \
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
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  withCredentials: true,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

## 🎯 Quick Integration Checklist

- [ ] Set up axios with base URL and interceptors
- [ ] Implement login/logout functionality
- [ ] Store and use authentication tokens
- [ ] Handle rate limiting (429 responses)
- [ ] Implement error handling for all status codes
- [ ] Set up role-based UI components
- [ ] Configure CORS for your frontend domain
- [ ] Test all endpoints with different user roles

## 📞 Support

For detailed documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

---
*Generated for final-project-p-e-koko API v1.0*
