# Xendit

Required server env:

```env
XENDIT_SECRET_KEY=xnd_development_or_production_key
XENDIT_WEBHOOK_TOKEN=callback_verification_token
```

Webhook endpoint:

```text
/api/xendit/webhook
```

For local development, expose the API server with Cloudflare Tunnel and set the Xendit webhook URL to:

```text
https://<tunnel-host>/api/xendit/webhook
```

For production behind your own domain or Cloudflare proxy, use:

```text
https://api.your-domain.com/api/xendit/webhook
```

The backend validates the `x-callback-token` header against `XENDIT_WEBHOOK_TOKEN`.
