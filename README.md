# ParcelTrack

A shipment tracking PWA built with Next.js 16, Tailwind CSS 4, Zustand and Framer Motion, with a small SQLite backend. Add it to your iOS or Android home screen and keep every parcel, from any store and any carrier, in one list that follows you across devices.

---

## Features

- **Paste anything:** a tracking number, a carrier link, or a whole "your order has shipped" email. The number is extracted automatically.
- **Carrier detection with check digits:** UPU S10 international post (Correos, Royal Mail, China Post, USPS…), UPS `1Z`, and USPS IMpb are verified mathematically, so typos are caught before you save. Other formats (Amazon `TBA`, Cainiao `LP`, YunExpress `YT`, DHL Parcel `JJD`, Correos `PQ`, and digit-only numbers) get a best guess you can override.
- **Full CRUD:** add, view, edit, archive, restore and delete orders. Archive and delete show an **Undo** toast.
- **Duplicate guard:** the same number can't be tracked twice.
- **One-tap carrier page:** every order links to the carrier's own tracking page (or 17TRACK when the carrier has no public link).
- **Smart list:** out-for-delivery and issues first, then by expected delivery date. Filters for *Arriving today*, *Issues* and each status.
- **History:** delivered and archived orders, newest first.
- **Search:** by name, store, carrier, notes or tracking number (spaces and dashes ignored). `Ctrl/⌘ + K` focuses it. Searching for a number you don't track yet offers to track it.
- **Accounts and sync:** sign in or create an account; orders are stored per user on the server (SQLite) and reload whenever the app comes back to the foreground. Orders saved in the browser by an older version are copied into an empty account once, and the browser copy is kept as a backup.

---

## Architecture

```
parceltrack/
├── app/
│   ├── page.tsx                # Tracking + History screens
│   ├── layout.tsx              # Root layout + PWA meta
│   ├── globals.css             # Design tokens, buttons, fields
│   ├── icon.png / apple-icon.png / favicon.ico
│   └── api/                    # Thin route files → lib/server/handlers.ts
│       ├── auth/{login,signup,logout,me}
│       ├── orders, orders/[id]  # list · create/replace · delete
│       ├── import               # one-time copy of browser orders
│       └── track                # validation + live lookup
├── components/
│   ├── layout/                 # Header, SearchBar, FilterTabs, BottomNav, AddOrderModal
│   ├── orders/                 # OrderCard, EditOrderModal (details + edit), SuggestionCard
│   ├── ui/                     # Sheet, StatusBadge, TrackingHint, PlatformInput, Toast
│   └── auth/                   # Login, AccountSheet
├── lib/
│   ├── api.ts                  # Browser → API client
│   ├── server/                 # accounts client, SQLite store, API handlers
│   ├── store/orders.ts         # Zustand store, synced to the server
│   ├── store/useSession.ts     # Sign-in check + reload on focus
│   ├── tracking/api.ts         # Live tracking providers (17TRACK, AfterShip)
│   ├── tracking/carriers.ts    # Carrier tracking-page links
│   └── utils/
│       ├── validation.ts       # Normalise, detect carrier, verify check digits, parse pasted input
│       ├── dates.ts            # Local-date ETA labels
│       └── status.ts           # Status palette and config
├── tests/                      # node:test: tracking logic, API/store, providers
├── types/index.ts
└── public/
    ├── manifest.json
    └── icons/                  # 192, 512 and maskable 512 PNGs
```

**Palette:**

| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#0B0D12` | App background |
| `--bg-card` | `#12151C` | Cards, sheets |
| `--brand` | `#2F6FE4` | Primary actions (from the app icon) |
| `--accent` | `#F2A23C` | Arriving today / out for delivery |
| `--color-danger` | `#F0616D` | Issues, delete |

---

## Tracking number logic

```
Input (number / URL / pasted email)
    ↓
Parse: URL → query or hash parameter; free text → best-scoring token
    ↓
Normalise: uppercase, keep only A–Z and 0–9; strip USPS "420 + ZIP" prefix
    ↓
Detect: S10 → UPS 1Z → USPS IMpb → prefixed formats → digit-only guesses
    ↓
Verify check digit where the format has one
    ├── verified → saved with the detected carrier
    ├── likely   → saved with a best-guess carrier (editable)
    ├── invalid  → "check digit doesn't match", needs "Add anyway"
    └── unknown  → allowed; set the carrier yourself
```

**Status lifecycle:** `processed` → `in_transit` → `out_for_delivery` → `delivered` (moves to History), plus `issue` for exceptions. Setting a delivered order back to any other status returns it to the active list.

---

## Accounts

Sign-in is delegated to a separate accounts service reached over a private network (`ACCOUNTS_URL`, authenticated with `ACCOUNTS_SERVICE_TOKEN`). It exposes `POST /v1/login`, `/v1/signup`, `/v1/verify` and `/v1/logout`; the app keeps the session token in an `HttpOnly`, `SameSite=Lax` cookie. Every API route except login/sign-up requires a session, mutations only accept JSON bodies, and each user only ever sees their own orders.

## Live tracking (optional)

Without an API key the app works fully with manual status. To fetch live status when adding an order:

```env
TRACKING_PROVIDER=17track        # or aftership (default)
TRACKING_API_KEY=your_key
```

- **17TRACK** (`17track`): the number is registered once (one quota) and then read with `gettrackinfo`.
- **AfterShip** (`aftership`): creates a tracking and maps its checkpoints.

`lib/tracking/api.ts` is the single place to add another provider. It must return `live: true` with a status, an optional `estimatedDeliveryDate` (`YYYY-MM-DD`) and events.

---

## Running locally

```bash
npm install
cp .env.example .env.local   # ACCOUNTS_URL, ACCOUNTS_SERVICE_TOKEN, COOKIE_SECURE=false, DB_PATH=./data/parceltrack.db
npm run dev                  # http://localhost:3000
npm test                     # all tests
npm run build                # production build (standalone output)
```

## Deploying with Docker

GitHub Actions builds `ghcr.io/<owner>/parceltrack` on every push to `main` (`.github/workflows/deploy.yml`). On the host:

```bash
cp .env.example .env         # fill in the accounts token; never commit it
mkdir -p data
docker compose pull && docker compose up -d
```

`docker-compose.yml` publishes the app on host port 1109, keeps the database in `./data`, and joins the external `accounts` Docker network where the accounts service runs.

Open the site in Safari (iOS) or Chrome (Android) and use **Add to Home Screen** for the standalone app.
