# ProByte Setup

1. Copy `.env.example` to `.env`.
2. Fill `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `XENDIT_SECRET_KEY`, and `XENDIT_WEBHOOK_TOKEN`.
3. Set `VITE_SUPPORT_WHATSAPP` for the invoice support button. Use international format without `+`, for example `6281234567890`.
4. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `ADMIN_ALERT_EMAIL` if you want invoice receipt email and restock alert email.
5. If you deploy behind Cloudflare or a custom domain, also set `VITE_API_BASE_URL`, `VITE_APP_PUBLIC_URL`, `PUBLIC_APP_URL`, and `CORS_ORIGIN` to your live origins.
6. Keep `VITE_DEMO_MODE=false` for production. Set it to `true` only if you intentionally want the legacy local demo data.
7. Apply Supabase migrations before using checkout, wallet top up, warranty refund, and admin wallet adjustment.
8. Keep `SUPABASE_SERVICE_ROLE_KEY`, `XENDIT_SECRET_KEY`, and `XENDIT_WEBHOOK_TOKEN` server-only. Do not prefix secret values with `VITE_` or commit them.
9. Install and verify:

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

Admin saldo:

- Tab `Saldo` shows wallet summary, pending top up, and latest ledger.
- Use `Tambah saldo` for manual credit, bonus, or refund outside warranty flow.
- Use `Kurangi saldo` only for correction; the API rejects debit that would make balance negative.
