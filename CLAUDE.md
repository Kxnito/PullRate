# PullRate — Claude Code Context Document
## Read this entire file before writing any code.

---

## What This Project Is

PullRate is a Pokemon TCG restock tracker. It monitors Target's inventory API every 10 seconds, detects when high-demand Pokemon products come back in stock, fetches real eBay resell prices, runs an AI analysis pipeline (LangChain + Gemini) to generate a buy/skip recommendation and profit estimate, and sends a rich Discord alert instantly.

There is also a Next.js web dashboard for managing tracked products, viewing drop history, and seeing AI restock predictions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Backend | Next.js API Routes (serverless, hosted on Vercel) |
| Polling Agent | Node.js script hosted on Railway.app (`agent/agent.js`) |
| AI Pipeline | LangChain + Google Gemini 2.0 Flash |
| Database | Firebase Firestore |
| Market Prices | eBay Browse API (completed listings) |
| Inventory Data | Target Redsky API (no key required) |
| Alerts | Discord Webhooks |
| Hosting | Vercel (frontend + API) + Railway.app (agent) |

---

## Project File Structure

```
PullRate/
├── app/
│   ├── page.tsx                     # Overview dashboard
│   ├── watchlist/page.tsx           # Product watchlist
│   ├── history/page.tsx             # Drop history table
│   ├── settings/page.tsx            # Settings page
│   ├── layout.tsx                   # Root layout with sidebar
│   ├── globals.css
│   └── api/
│       ├── analyze/route.ts         # POST — called by Railway agent on restock
│       ├── products/route.ts        # GET + POST — product CRUD
│       ├── drops/route.ts           # GET — drop history queries
│       ├── predict/route.ts         # GET — prediction engine (Vercel Cron daily)
│       └── settings/route.ts        # GET + PUT — settings CRUD
├── lib/
│   ├── target.ts                    # Target Redsky API client
│   ├── ebay.ts                      # eBay Browse API client
│   ├── langchain.ts                 # LangChain + Gemini analysis chain
│   ├── firebase.ts                  # Firestore client (admin SDK server-side)
│   └── discord.ts                   # Discord webhook client
├── components/
│   ├── Sidebar.tsx                  # Navigation sidebar
│   ├── ProductCard.tsx              # Watchlist product card
│   ├── AlertFeed.tsx                # Recent drops feed
│   ├── ProfitBadge.tsx             # Profit margin display
│   └── PredictionBanner.tsx         # AI prediction display
├── types/
│   └── index.ts                     # All TypeScript interfaces
├── agent/
│   └── agent.js                     # Railway.app polling script (plain JS, no TS)
├── .env                             # Server-side keys (never commit values)
├── .env.local                       # NEXT_PUBLIC_ keys (never commit values)
└── package.json
```

---

## Environment Variables

### `.env` (server-side only)
```
EBAY_CLIENT_ID=
EBAY_CLIENT_SECRET=
GEMINI_API_KEY=
DISCORD_WEBHOOK_URL=
AGENT_SECRET_KEY=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

### `.env.local` (client-side, NEXT_PUBLIC_ prefix)
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### Railway.app environment variables (set in Railway dashboard)
```
VERCEL_ANALYZE_URL=https://your-app.vercel.app/api/analyze
AGENT_SECRET_KEY=
HOME_ZIP=92843
STORE_RADIUS_MILES=25
POLL_INTERVAL_MS=10000
```

---

## TypeScript Interfaces (types/index.ts)

```typescript
export interface Product {
  id: string
  name: string
  targetTcin: string
  retailPrice: number
  active: boolean
  createdAt: FirebaseFirestore.Timestamp
}

export interface Drop {
  id: string
  productId: string
  productName: string
  retailer: string
  type: 'online' | 'instore'
  storeId?: string
  storeName?: string
  storeAddress?: string
  lat?: number
  lng?: number
  qty: number
  retailPrice: number
  marketPrice: number
  profit: number
  demandRating: string
  recommendation: string
  aiMessage: string
  detectedAt: FirebaseFirestore.Timestamp
  alertSent: boolean
}

export interface Prediction {
  id: string
  productId: string
  probability: string
  estimatedWindow: string
  reasoning: string
  avgDaysBetweenRestocks: number
  daysSinceLastRestock: number
  generatedAt: FirebaseFirestore.Timestamp
}

export interface Settings {
  discordWebhookUrl: string
  homeZip: string
  radiusMiles: number
  alertType: 'online' | 'instore' | 'both'
}

export interface AnalysisResult {
  recommendation: 'Buy Now' | 'Buy if Convenient' | 'Skip'
  demandSummary: string
  urgency: string
  alertMessage: string
}
```

---

## Firestore Collections

### `products`
Stores all tracked products. Written by dashboard, read by agent.

### `drops`
Every detected restock event. Written by `/api/analyze`, read by dashboard.

### `predictions`
Daily AI predictions per product. Written by `/api/predict`, read by dashboard.

### `settings`
Single document with user config. Written and read by dashboard settings page.

### `status`
Single document updated by Railway agent on each poll:
```
{ lastPollAt: timestamp, agentOnline: boolean }
```

---

## Tracked Products (v1)

| Product | Target TCIN | Retail Price |
|---|---|---|
| Prismatic Evolutions ETB | 1011206804 | $49.99 |
| Ascended Heroes ETB | 95082118 | $49.99 |
| Ascended Heroes Booster Bundle | 95120834 | $19.99 |

---

## Target API

No API key required. Use the Redsky API:

```
# Product inventory (online)
GET https://redsky.target.com/redsky_aggregations/v1/web/pdp_client_v1?tcin=TCIN&pricing_store_id=3991

# Store locator (find nearby store IDs)
GET https://redsky.target.com/v3/stores/nearby?place=ZIP&within=25&unit=mile&limit=10&key=ff457966e64d5e877fdbad070f276d18ecec4a01
```

The store locator key is a public key that Target uses on their own website.

Response shape for inventory:
```json
{
  "data": {
    "product": {
      "item": { "product_description": { "title": "..." } },
      "price": { "current_retail": 49.99 },
      "available_to_promise_network": {
        "availability": "IN_STOCK",
        "available_to_promise_quantity": 3
      }
    }
  }
}
```

---

## eBay Browse API

Used to fetch completed sold listings to determine real market price.

```
# Get OAuth token first
POST https://api.ebay.com/identity/v1/oauth2/token
Header: Authorization: Basic base64(CLIENT_ID:CLIENT_SECRET)
Body: grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope

# Search sold listings
GET https://api.ebay.com/buy/browse/v1/item_summary/search
  ?q=PRODUCT_NAME
  &filter=buyingOptions:{FIXED_PRICE},conditions:{USED|NEW}
  &sort=endTimeSoonest
  &limit=10
Header: Authorization: Bearer ACCESS_TOKEN
```

Calculate market price as average of `price.value` across returned items.

Demand rating based on `total` in response:
- Very High: 50+
- High: 20-49
- Medium: 5-19
- Low: <5

---

## LangChain Analysis Chain (lib/langchain.ts)

Use `@langchain/google-genai` with `gemini-2.0-flash`.

The chain takes a restock event and returns an `AnalysisResult`:

```typescript
import { ChatGoogleGenerativeAI } from '@langchain/google-genai'
import { PromptTemplate } from '@langchain/core/prompts'
import { JsonOutputParser } from '@langchain/core/output_parsers'

const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY,
})

const prompt = PromptTemplate.fromTemplate(`
You are an expert Pokemon TCG resell analyst.

Product: {productName}
Retail Price: ${'{retailPrice}'}
eBay Market Price: ${'{marketPrice}'}
Estimated Profit (after 12.55% fees): ${'{profit}'}
Demand Rating: {demandRating}
Days Since Last Restock: {daysSinceLastRestock}
Units In Stock: {qty}
Time of Day: {timeOfDay}

Respond ONLY with a JSON object with these exact keys:
- recommendation: one of "Buy Now", "Buy if Convenient", or "Skip"
- demandSummary: one sentence about current demand
- urgency: how fast it will likely sell out (e.g. "likely gone in 3-5 minutes")
- alertMessage: one natural sentence for a Discord alert combining the key facts

No markdown, no backticks, just raw JSON.
`)

const chain = prompt.pipe(model).pipe(new JsonOutputParser())

export async function analyzeRestock(data: RestockInput): Promise<AnalysisResult> {
  return await chain.invoke(data)
}
```

Always wrap in try/catch. If LangChain fails, fall back to:
```typescript
return {
  recommendation: profit > 20 ? 'Buy Now' : profit > 5 ? 'Buy if Convenient' : 'Skip',
  demandSummary: `${demandRating} demand based on recent eBay sales.`,
  urgency: 'Sell-through time unknown.',
  alertMessage: `${productName} restocked at ${retailer}. Retail: $${retailPrice}. Market: $${marketPrice}. Est. profit: $${profit.toFixed(2)}.`
}
```

---

## Discord Alert Format

Send a Discord embed via webhook POST:

```typescript
const embed = {
  embeds: [{
    title: `⚡ RESTOCK — ${productName}`,
    color: recommendation === 'Buy Now' ? 0x00ff00
           : recommendation === 'Buy if Convenient' ? 0xffff00
           : 0xff0000,
    fields: [
      { name: '🏪 Store', value: storeName || 'Online', inline: true },
      { name: '📦 Qty', value: String(qty), inline: true },
      { name: '💵 Retail', value: `$${retailPrice}`, inline: true },
      { name: '📈 eBay Market', value: `$${marketPrice}`, inline: true },
      { name: '💰 Est. Profit', value: `$${profit.toFixed(2)}`, inline: true },
      { name: '🔥 Demand', value: demandRating, inline: true },
      { name: '🤖 AI', value: alertMessage, inline: false },
      { name: '⏱ Urgency', value: urgency, inline: false },
    ],
    timestamp: new Date().toISOString(),
  }]
}

await fetch(process.env.DISCORD_WEBHOOK_URL!, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(embed),
})
```

---

## `/api/analyze` Route

This is the most important route. Called by the Railway agent when a restock is detected.

```
POST /api/analyze
Header: x-agent-secret: AGENT_SECRET_KEY
Body: {
  productName: string,
  targetTcin: string,
  retailPrice: number,
  qty: number,
  type: 'online' | 'instore',
  storeId?: string,
  storeName?: string,
  storeAddress?: string,
  lat?: number,
  lng?: number,
  detectedAt: string
}
```

Steps inside the route:
1. Verify `x-agent-secret` header matches `AGENT_SECRET_KEY` env var → 401 if mismatch
2. Fetch eBay market price via `lib/ebay.ts`
3. Calculate profit: `marketPrice - retailPrice - (marketPrice * 0.1255)`
4. Calculate demand rating from eBay sales count
5. Call `lib/langchain.ts` analyzeRestock()
6. Log drop to Firestore `drops` collection
7. Send Discord alert via `lib/discord.ts`
8. Return `{ ok: true, recommendation, profit }`

---

## Railway Agent (agent/agent.js)

Plain JavaScript (no TypeScript). Uses `dotenv`, `node-fetch` (or built-in fetch in Node 20+).

```javascript
const PRODUCTS = [
  { name: 'Prismatic Evolutions ETB', tcin: '1011206804', retailPrice: 49.99 },
  { name: 'Ascended Heroes ETB', tcin: '95082118', retailPrice: 49.99 },
  { name: 'Ascended Heroes Booster Bundle', tcin: '95120834', retailPrice: 19.99 },
]

// In-memory last known stock state
const lastKnownStock = {}

async function poll() {
  for (const product of PRODUCTS) {
    try {
      // 1. Fetch Target inventory
      // 2. Compare with lastKnownStock[product.tcin]
      // 3. If restock detected, POST to VERCEL_ANALYZE_URL
      // 4. Update lastKnownStock[product.tcin]
    } catch (e) {
      console.error(`Error polling ${product.name}:`, e.message)
    }
  }
}

// Poll every POLL_INTERVAL_MS (default 10000)
setInterval(poll, parseInt(process.env.POLL_INTERVAL_MS || '10000'))
poll() // run immediately on start
console.log('PullRate agent started')
```

The agent must never exit. All errors caught internally. Railway restarts it if it crashes anyway.

---

## Firebase Setup

Use Firebase Admin SDK server-side (not the client SDK):

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const db = getFirestore()
```

Install: `npm install firebase-admin`

For the frontend (client-side Firestore reads in dashboard):
```typescript
import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  // ... other NEXT_PUBLIC_ vars
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const db = getFirestore(app)
```

---

## Dashboard UI Guidelines

- **Dark theme:** background `bg-zinc-950`, cards `bg-zinc-900`, borders `border-zinc-800`
- **Sidebar navigation** with links to: Overview, Watchlist, History, Settings
- **Recommendation color coding:**
  - Buy Now → `text-green-400` / `border-green-500`
  - Buy if Convenient → `text-yellow-400` / `border-yellow-500`
  - Skip → `text-red-400` / `border-red-500`
- **Profit always green** when positive: `text-green-400`
- **Mobile-first** but designed for desktop dashboard use
- **No external UI component libraries** — Tailwind only

---

## Key Rules

1. **Never hardcode API keys** — always use `process.env.*`
2. **Never use NEXT_PUBLIC_ prefix for server-side secrets** — eBay, Gemini, Discord, Firebase admin keys are server-side only
3. **Always use Firebase Admin SDK in API routes** — not the client SDK
4. **Agent secret verification is mandatory** in `/api/analyze` — always check `x-agent-secret` header
5. **LangChain always has a template fallback** — never let AI failure block the alert
6. **Discord alerts never block** — wrap in try/catch, log error but continue
7. **agent/agent.js is plain JavaScript** — no TypeScript, no imports from `lib/`
8. **Do not modify** `app/layout.tsx`, `app/globals.css`, `next.config.ts`, or `tailwind.config.*` unless specifically asked
9. **Duplicate alert prevention** — before sending a Discord alert, check Firestore for a drop with the same `productId` within the last 30 minutes

---

## Installed Packages

```json
"dependencies": {
  "next": "16.x",
  "react": "19.x",
  "react-dom": "19.x",
  "firebase": "^12.x",
  "firebase-admin": "^12.x",
  "langchain": "latest",
  "@langchain/google-genai": "latest",
  "@langchain/core": "latest",
  "axios": "^1.x"
}
```

---

## Work Split

**Kenny (backend/infrastructure) owns:**
- `lib/target.ts`
- `lib/ebay.ts`
- `lib/langchain.ts`
- `lib/discord.ts`
- `lib/firebase.ts`
- `agent/agent.js`
- `app/api/analyze/route.ts`
- `app/api/predict/route.ts`

**Teammate (frontend) owns:**
- All `app/` pages (`page.tsx`, `watchlist/`, `history/`, `settings/`)
- All `components/`
- `app/api/products/route.ts`
- `app/api/drops/route.ts`
- `app/api/settings/route.ts`

**Do not edit the other person's files without coordinating first.**
