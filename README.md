# ParcelTrack

A unified shipment tracking PWA built with Next.js 14, Tailwind CSS, Zustand, and Framer Motion. Add it to your iOS or Android home screen for a native-like tracking experience across all carriers and platforms.

---

## Overview & Architecture

```
parceltrack/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Dashboard (list + history)
│   ├── layout.tsx              # Root layout + PWA meta
│   ├── globals.css             # Design tokens + animations
│   └── api/track/route.ts     # Serverless tracking lookup
├── components/
│   ├── layout/                 # Header, BottomNav, SearchBar, Modals
│   ├── orders/                 # OrderCard, EditOrderModal, SuggestionCard
│   └── ui/                     # StatusBadge, ProgressBar, PlatformInput
├── lib/
│   ├── store/orders.ts         # Zustand store (persisted to localStorage)
│   ├── tracking/api.ts         # Carrier API client (AfterShip / 17TRACK)
│   └── utils/
│       ├── status.ts           # Design tokens, status config
│       └── validation.ts       # Full tracking code validator
├── types/index.ts              # Shared TypeScript types
└── public/manifest.json        # PWA manifest
```

**Stack:**
- **Framework:** Next.js 14 App Router (TypeScript)
- **Styling:** Tailwind CSS + CSS custom properties
- **Animation:** Framer Motion
- **State:** Zustand with `persist` middleware (localStorage)
- **PWA:** `manifest.json` + `viewport` meta for iOS standalone mode
- **Icons:** Lucide React

**Color Palette (v2):**
| Token | Hex | Usage |
|---|---|---|
| `--bg-base` | `#0D0D0E` | App background |
| Brand Primary | `#3447AA` | Buttons, active states, processing status |
| Brand Tint | `#FBEAEB` | Soft accent highlights |
| `--bg-card` | `#161618` | Cards, modals |
| `--border` | `#232326` | Dividers and card borders |

---

## Order Processing Lifecycle

```
User Input (tracking number / URL)
    ↓
Step A: Normalize  →  trim, remove hyphens/invisibles, uppercase
    ↓
Step B: Regex Match  →  test against UPS / FedEx / USPS / DHL / UPU S10 / Amazon / GLS patterns
    ↓
Step C: Check Digit  →  UPU S10 (weighted mod-11), GS1 SSCC-18 (mod-10)
    ↓
   Valid?
   ├── YES → call /api/track → auto-detect carrier → save as "Processed"
   └── NO  → show warning toast + "Add Anyway" button (regional carriers)
    ↓
Zustand store → persisted to localStorage
    ↓
Background: poll /api/track every N minutes → updateOrder() → UI re-renders
```

**Status lifecycle:**
1. `processed` — Order confirmed, no movement yet (progress 10%)
2. `in_transit` — Moving between hubs / in customs (progress 50%)
3. `out_for_delivery` — On the courier's vehicle today (progress 85%)
4. `delivered` — Complete → auto-moved to History (progress 100%)
5. `issue` — Exception: address error, customs hold, absent recipient

---

## Tracking API Integration Guide (Free Options)

### Option 1: 17TRACK Free Tier (Recommended)

**Free tier:** 100 tracking queries/month, 40+ supported carriers.

**Setup:**
1. Register at [https://www.17track.net/en/apicenter](https://www.17track.net/en/apicenter)
2. Create an API key in the dashboard
3. Add to `.env.local`:

```env
TRACKING_PROVIDER=17track
TRACKING_API_KEY=your_17track_api_key
```

**Usage in `/app/api/track/route.ts`:**

```ts
const res = await fetch('https://api.17track.net/track/v2.2/register', {
  method: 'POST',
  headers: {
    '17token': process.env.TRACKING_API_KEY!,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify([{ number: trackingNumber }]),
});
const data = await res.json();
// data.data.accepted[0].number → confirmed
```

Then poll status:
```ts
const status = await fetch('https://api.17track.net/track/v2.2/gettrackinfo', {
  method: 'POST',
  headers: { '17token': process.env.TRACKING_API_KEY! },
  body: JSON.stringify([{ number: trackingNumber }]),
});
```

---

### Option 2: Ship24 Free Tier

**Free tier:** 50 queries/month, 1200+ carriers auto-detected.

```env
TRACKING_PROVIDER=ship24
TRACKING_API_KEY=your_ship24_api_key
```

```ts
const res = await fetch('https://api.ship24.com/public/v1/trackers/track', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${process.env.TRACKING_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ trackingNumber }),
});
const { data } = await res.json();
// data.trackings[0].events → status history array
```

---

### Option 3: Karrio (Open Source, Self-Hosted, Unlimited)

**Best for:** Full control, no API limits, self-hosted on Railway/Fly.io.

```bash
# Docker one-liner
docker run -p 5002:5002 karrio/server:latest
```

```env
TRACKING_PROVIDER=karrio
TRACKING_API_URL=http://localhost:5002
TRACKING_API_KEY=your_karrio_api_key
```

```ts
const res = await fetch(`${process.env.TRACKING_API_URL}/v1/trackers`, {
  method: 'POST',
  headers: {
    Authorization: `Token ${process.env.TRACKING_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ tracking_number: trackingNumber }),
});
```

Docs: [https://docs.karrio.io](https://docs.karrio.io)

---

## Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Add environment variables
cp .env.example .env.local
# → set TRACKING_API_KEY

# 3. Start dev server
npm run dev

# 4. Open http://localhost:3000
# → "Add to Home Screen" in Safari for PWA mode
```

## PWA / iOS Setup

The app is pre-configured for iOS standalone mode:
- `manifest.json` with `"display": "standalone"`
- `viewport-fit=cover` for safe areas
- `apple-mobile-web-app-capable` meta
- Overscroll bounce disabled via `overscroll-behavior: none`

Add icons to `public/icons/icon-192.png` and `icon-512.png` for full PWA compliance.
