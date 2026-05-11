# Frontend

Manual Next.js scaffold for the Smart Play dashboard and explorer.

Install dependencies from `frontend/`:

```bash
npm install
```

Run locally:

```bash
npm run dev
```

Expected backend:

```bash
uvicorn backend.main:app --reload
```

The app uses `NEXT_PUBLIC_API_BASE_URL`, defaulting to `http://127.0.0.1:8000`.

Create a local env file when the backend runs somewhere else:

```bash
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

The API client lives in `app/api-client.ts` so pages do not hard-code the backend host.
