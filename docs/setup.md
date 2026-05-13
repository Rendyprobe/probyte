# ProByte Setup

1. Copy `.env.example` to `.env`.
2. Fill `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `XENDIT_SECRET_KEY`, and `XENDIT_WEBHOOK_TOKEN`.
3. Keep `SUPABASE_SERVICE_ROLE_KEY`, `XENDIT_SECRET_KEY`, and `XENDIT_WEBHOOK_TOKEN` server-only. Do not prefix secret values with `VITE_` or commit them.
4. Install and verify:

```bash
npm ci
npm run typecheck
npm test
npm run build
```

Run locally:

```bash
npm run api:dev
npm run dev
```
