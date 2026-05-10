# Frontend

Manual Next.js scaffold for the Milestone 6 Smart Play dashboard and explorer.

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

