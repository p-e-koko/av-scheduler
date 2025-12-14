# Railway Environment Configuration

To fix the `419 CSRF token mismatch` error, your Frontend and Backend **MUST share the same top-level domain** (e.g., `pann.khazifire.com`).

## 🚨 Critical Domain Setup
You cannot use `pann.khazifire.com` for the frontend and `av-scheduler.up.railway.app` for the backend. **Cookies will be blocked.**

1.  **Frontend Domain:** `pann.khazifire.com` (Already set up)
2.  **Backend Domain:** You **MUST** set up a subdomain for your backend, e.g., `api.pann.khazifire.com`.
    *   Go to Railway -> Backend Service -> Settings -> Domains.
    *   Add `api.pann.khazifire.com` (or similar).
    *   Update your DNS records as instructed by Railway.

## Backend Variables (Railway)
Once you have `api.pann.khazifire.com` set up:

| Variable | Value |
| :--- | :--- |
| `APP_URL` | `https://api.pann.khazifire.com` |
| `FRONTEND_URL` | `https://pann.khazifire.com` |
| `SANCTUM_STATEFUL_DOMAINS` | `pann.khazifire.com` |
| `SESSION_DOMAIN` | `.pann.khazifire.com` |
| `SESSION_SECURE_COOKIE` | `true` |

## Frontend Variables (Railway)
Update your **Frontend** service variables:

| Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://api.pann.khazifire.com/api` |

## Why?
Browsers block cookies between different domains (like `khazifire.com` and `railway.app`) for security. By using `api.pann.khazifire.com`, both your frontend and backend share the `khazifire.com` root domain, allowing them to share the login session securely.

