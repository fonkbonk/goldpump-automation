# GoldPump automation (v1)

Self-hosted **goldpump.com** rain joiner — **separate repo** from [RoRush automation](https://github.com/primary-yk/rorush-automation). Uses the site’s public API and Socket.io streams only; captchas go through **CapMonster Cloud** (Turnstile), not NoneCap or RoRush’s captcha stack.

## What v1 does

- Stores multiple accounts (nickname + **browser session cookie**, encrypted at rest).
- One shared Socket.io listener (`rain-stream` / `rain-value-stream`) on the first rain-enabled account.
- When rain is **in progress** and not joined, solves **Cloudflare Turnstile** once via CapMonster and calls `POST /api/rain/rain-join` for each account.
- Optional limbo wager after join (`AUTO_WAGER_LIMBO_FRACTION` in `.env`) to help clear rain playthrough rules.

GoldPump uses **Turnstile** for rain join (sitekey `0x4AAAAAACLmkLF8v68bkhrE` in the bundled client), not RoRush hCaptcha/NoneCap.

## Requirements

- Node.js 20+
- [CapMonster Cloud](https://capmonster.cloud) API key
- Session cookies from a logged-in goldpump.com tab (same approach as token login bots use)

## Setup

```bash
cd goldpump-automation
cp .env.example .env
openssl rand -base64 32   # → ENCRYPTION_KEY=
# CAPMONSTER_API_KEY=...

npm install
npm run doctor
npm run add-account
npm run test-session
npm run test-captcha   # optional — spends CapMonster credits
npm run dev
```

### Getting cookies

1. Log in on [goldpump.com](https://goldpump.com) in Chrome.
2. DevTools → **Network** → filter `api.goldpump.com`.
3. Click any request → **Headers** → copy the full **Cookie** value.
4. `npm run add-account` and paste it (repeat when the session expires).

Do not commit `.env` or cookies.

## Configuration

| Variable | Purpose |
|----------|---------|
| `CAPMONSTER_API_KEY` | CapMonster only |
| `ENCRYPTION_KEY` | AES-GCM for stored cookies |
| `GOLDPUMP_PROXY_URL` | Optional proxy for API/socket |
| `AUTO_WAGER_LIMBO_FRACTION` | `0` = off; e.g. `1` = bet full balance once after join |
| `LIMBO_MULTIPLIER` | Limbo target multiplier (default `2`) |

## Not mixed with RoRush

This package has its own `package.json`, database, env vars, and CapMonster integration. The RoRush repo’s NoneCap / SignalR / `api.rorush.com` code is not imported here.

## API reference (from public web client)

- REST base: `https://api.goldpump.com`
- Socket.io (websocket): same host — `rain-join`, `rain-leave`, `rain-ping`, streams `rain-stream`, `rain-value-stream`
- Auth socket: `POST api/account/auth-socket?socketId=…` with session cookie
- Rain join: `POST /api/rain/rain-join?captchaToken=…`
- Limbo: `POST /api/limbo/limbo-play?betAmount=…&multiplier=…`
