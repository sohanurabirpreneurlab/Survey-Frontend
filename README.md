# Survey Frontend

React + TypeScript frontend scaffold for the survey platform business-owner flow.

## Included

- Authentication session restoration against `GET /api/v1/auth/me`
- Registration and login screens
- Pending approval, rejected, and suspended account experiences
- Approved-user dashboard shell with responsive navigation
- Route protection that waits for restoration before rendering protected UI
- Shared API client, toast handling, and lightweight design system primitives

## Environment

Use a local `.env` file:

```env
VITE_API_BASE_URL=http://localhost:4000/api/v1
VITE_APP_NAME=Survey Platform
```

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## Notes

- Session tokens are persisted locally, but access decisions are always restored from the backend via `/auth/me` or `/auth/refresh`.
- Password reset is intentionally disabled for now and can be re-enabled later from the preserved auth module files.
- The sidebar includes placeholder navigation entries for future survey and settings flows without triggering inactive-route requests.
