# Deployment

Current local ports:

- Frontend Vite: `5173`
- Backend API: `8787`

For production, deploy frontend and backend separately or behind one reverse proxy. Set:

```env
VITE_API_BASE_URL=https://api.your-domain.com
PUBLIC_APP_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com
TRUST_PROXY=true
```

Only set `TRUST_PROXY=true` when the API is reachable exclusively through your reverse proxy or platform load balancer. If the API is directly reachable, leave it unset so clients cannot spoof `x-forwarded-for` to bypass rate limits.

For a local webhook tunnel, run the API server first, then expose port `8787` with Cloudflare Tunnel. Use the generated HTTPS URL in Xendit.
