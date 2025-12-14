# Railway Environment Configuration

To fix the `419 CSRF token mismatch` error and ensure your app works correctly on your custom domain `pann.khazifire.com`, you need to configure the following environment variables in your **Railway Project Settings** for the **Backend** service.

## Required Variables

| Variable | Value | Description |
| :--- | :--- | :--- |
| `APP_URL` | `https://pann.khazifire.com` | The full URL of your backend. |
| `FRONTEND_URL` | `https://pann.khazifire.com` | The full URL of your frontend. |
| `SANCTUM_STATEFUL_DOMAINS` | `pann.khazifire.com` | The domain of your frontend (without `https://`). |
| `SESSION_DOMAIN` | `.pann.khazifire.com` | The domain for cookies (leading dot allows subdomains). |
| `SESSION_SECURE_COOKIE` | `true` | Must be true for HTTPS. |
| `SESSION_SAME_SITE` | `lax` | Recommended for same-site requests. |

## Frontend Configuration

Ensure your **Frontend** service on Railway also has the correct environment variable:

| Variable | Value |
| :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `https://pann.khazifire.com/api` | Points to your backend API. |

*Note: If your backend is hosted on a different domain (e.g., `api.pann.khazifire.com` or the default Railway URL), update `APP_URL` and `NEXT_PUBLIC_API_URL` accordingly. However, for cookie-based authentication to work, the frontend and backend MUST share the same top-level domain (e.g., `pann.khazifire.com`).*

## How to Apply

1.  Go to your [Railway Dashboard](https://railway.app/).
2.  Select your project.
3.  Click on the **Backend** service -> **Variables**.
4.  Add/Update the variables listed above.
5.  **Redeploy** the backend service.

