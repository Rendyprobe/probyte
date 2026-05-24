# Deployment

Current local ports:

- Frontend Vite: `5173`
- Backend API: `8787`

## Local development with Cloudflare Tunnel

If you want to expose the local API for Xendit webhooks, run the API server first, then expose port `8787` with Cloudflare Tunnel. Use the generated HTTPS URL in Xendit.

If you also want to preview the frontend through a tunnel, run `npm run dev` and expose port `5173` the same way. Vite already allows `*.trycloudflare.com` in `vite.config.ts`.

## Production / Cloudflare deployment

Deploy frontend and backend separately, or keep the backend behind a trusted reverse proxy / Cloudflare Tunnel. Set:

```env
VITE_API_BASE_URL=https://api.your-domain.com
VITE_APP_PUBLIC_URL=https://your-domain.com
PUBLIC_APP_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
TRUST_PROXY=true
VITE_SUPPORT_WHATSAPP=6281234567890
```

Only set `TRUST_PROXY=true` when the API is reachable exclusively through your reverse proxy, Cloudflare Tunnel, or platform load balancer. If the API is directly reachable, leave it unset so clients cannot spoof `x-forwarded-for` to bypass rate limits.

When `TRUST_PROXY=true`, the backend prefers Cloudflare's `cf-connecting-ip` header for rate limiting, then falls back to `x-forwarded-for`.

Set SMTP env vars when enabling invoice receipt email and restock alert email:

```env
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
ADMIN_ALERT_EMAIL=admin@your-domain.com
```
