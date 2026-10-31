# ChillyFlakes API

Node.js 20+ · Express 5 · Prisma · PostgreSQL · Nodemailer (any SMTP)

## What's live (Phase 1 — Authentication)

| Endpoint (`/api/v1/buyer/auth/…`) | Purpose |
|---|---|
| `POST register/` | Create shopper account → emails 6-digit code |
| `POST verify-email/` · `verify-email/resend/` | Confirm email → returns `{ user, token }` |
| `POST login/` | Email **or** mobile + password |
| `GET me/` · `POST logout/` · `PATCH profile/` | Session (Bearer token) |
| `POST forgot-password/request/` · `verify/` · `reset/` | 3-step password reset by email code |
| `GET /health` | Liveness + DB check |

Security: bcrypt (12 rounds) · sessions stored as SHA-256 hashes (revocable, 30-day TTL) · one-time codes hashed, 10-min expiry, 5 attempts, 30 s resend cooldown · 5 wrong passwords → 15-min lock · per-IP rate limits · Helmet · strict CORS allow-list · no account enumeration on reset · all sessions revoked + email notice on password change.

## Run locally

```bash
cd server
npm install
cp .env.example .env          # defaults work out of the box
npm run db:dev                # terminal 1 – local PostgreSQL (no Docker needed)
npx prisma migrate dev        # first time only – creates tables
npm run dev                   # terminal 2 – API on http://localhost:4000
node scripts/smoke-auth.mjs   # optional – 22 end-to-end checks
```

Frontend (`/.env`): `VITE_API_BASE_URL=http://localhost:4000/api` and `VITE_BUYER_AUTH_API=true`.

Without SMTP configured, emails print in the API terminal and the code is also shown on screen (`EXPOSE_DEV_CODES=true`, dev only).

## Connect real email (your Gmail now, client's mailbox later)

1. Google Account → Security → turn on **2-Step Verification** → **App passwords** → create one.
2. In `server/.env`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=you@gmail.com
   SMTP_PASS=abcd efgh ijkl mnop
   MAIL_FROM="ChillyFlakes <you@gmail.com>"
   EXPOSE_DEV_CODES=false
   ```
3. Restart the API — the log shows `✉️ SMTP ready`.

Switching to the client later = change only these `SMTP_*` / `MAIL_FROM` values (Zoho, Hostinger, Google Workspace, Brevo, Resend, SES all work). No code changes.

## Deploy

### Backend on a VPS (FastPanel / any Ubuntu server)
```bash
# on the server (Node 20+, PostgreSQL 14+ installed — FastPanel can install both)
sudo -u postgres psql -c "CREATE USER chilly WITH PASSWORD 'strong-pass';"
sudo -u postgres psql -c "CREATE DATABASE chillyflakes OWNER chilly;"

git clone <repo> && cd <repo>/server
npm ci
cp .env.example .env   # set NODE_ENV=production, DATABASE_URL, CORS_ORIGINS, APP_URL, SMTP_*, TRUST_PROXY=true
npm run build
npm run db:deploy      # apply migrations
npm i -g pm2 && pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
```
In FastPanel create a site `api.yourdomain.com` → **reverse proxy** to `http://127.0.0.1:4000` → issue a Let's Encrypt SSL certificate.

### Or with Docker
```bash
docker build -t chillyflakes-api ./server
docker run -d --env-file server/.env -p 4000:4000 chillyflakes-api
```

### Frontend on Vercel
Environment variables:
```
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_BUYER_AUTH_API=true
```
And in the API `.env`: `CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com` and `APP_URL=https://yourdomain.com`.

## Production checklist
- [ ] `NODE_ENV=production` (dev codes are never exposed in production)
- [ ] Strong DB password, DB not exposed publicly
- [ ] `CORS_ORIGINS` = exact storefront domains
- [ ] HTTPS on the API domain, `TRUST_PROXY=true` behind the proxy
- [ ] SMTP verified (`✉️ SMTP ready` in logs); SPF/DKIM set for your sending domain
- [ ] Daily `pg_dump` backup

## Roadmap
Phase 2 vendor auth & onboarding · Phase 3 catalog & categories · Phase 4 orders & customers · Phase 5 admin, finance & settings.
