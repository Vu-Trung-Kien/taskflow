# TaskFlow frontend

Frontend MVP built with React, TypeScript and Vite. It consumes the backend APIs already implemented for authentication, projects/members, tasks/subtasks, comments and attachments. Notifications/email, analytics dashboard, CSV export, recurring tasks and feature flags are intentionally deferred until corresponding backend APIs exist.

## Local development

1. Start the API and its dependencies as described in the repository root README.
2. From `frontend/`, install dependencies and start Vite:

   ```bash
   npm ci
   npm run dev
   ```

3. Open the Vite URL shown in the terminal. The development server proxies `/auth`, `/projects`, `/health` and `/version` to `http://localhost:3000`, keeping refresh cookies same-origin. Set `VITE_API_BASE_URL` only when the API is available at a compatible same-origin route.

## Authentication and deployment integration

- The short-lived access token is held in memory only. Refresh tokens are handled by the backend's HttpOnly cookie; the browser client sends credentials for API requests.
- Production should serve the frontend and reverse-proxy the backend routes (`/auth`, `/projects`, `/health`, `/version`) on the same origin. If using separate origins instead, the backend must explicitly allow the frontend origin with credentials and the refresh cookie's SameSite/Secure policy must match the deployment.
- Attachment bytes are uploaded directly to the presigned S3-compatible URL. Configure bucket CORS to allow the frontend origin, `PUT`, and the signed `Content-Type` header. The frontend enforces the documented 10 MiB limit by API validation and provides the backend MIME allowlist as the file picker filter; server-side validation remains authoritative.
- Collaboration UI does not count as a verified end-to-end storage integration until upload, completion, download and deletion have been tested against SeaweedFS or AWS S3.

## Checks

```bash
npm test
npm run build
```
