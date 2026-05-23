require('dotenv').config()

const PRODUCTS = [
  { name: 'Prismatic Evolutions ETB', tcin: '1011206804', retailPrice: 49.99 },
  { name: 'Ascended Heroes ETB', tcin: '95082118', retailPrice: 49.99 },
  { name: 'Ascended Heroes Booster Bundle', tcin: '95120834', retailPrice: 19.99 },
]

// { [tcin]: { online: boolean } }
const lastKnownStock = {}

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'

function ts() {
  return new Date().toISOString()
}

async function fetchTargetOnline(tcin) {
  const url = new URL('https://redsky.target.com/redsky_aggregations/v1/web/pdp_client_v1')
  url.searchParams.set('tcin', tcin)
  url.searchParams.set('pricing_store_id', '3991')
  url.searchParams.set('visitor_id', 'pullrate')
  url.searchParams.set('channel', 'WEB')
  url.searchParams.set('page', `/p/A-${tcin}`)

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
  })

  if (res.status === 403 || res.status === 429) {
    console.warn(`[${ts()}] [target] Rate limited (${res.status}) for TCIN ${tcin} — skipping cycle`)
    return null
  }

  if (!res.ok) {
    throw new Error(`Target API returned ${res.status} for TCIN ${tcin}`)
  }

  const data = await res.json()
  const network = data?.data?.product?.available_to_promise_network
  if (!network) {
    throw new Error(`Missing availability data in Target response for TCIN ${tcin}`)
  }

  return {
    inStock: network.availability === 'IN_STOCK',
    qty: Number(network.available_to_promise_quantity ?? 0),
  }
}

async function notifyRestock(product, qty) {
  const analyzeUrl = process.env.VERCEL_ANALYZE_URL
  const agentSecret = process.env.AGENT_SECRET_KEY

  if (!analyzeUrl || !agentSecret) {
    console.error(`[${ts()}] [agent] VERCEL_ANALYZE_URL or AGENT_SECRET_KEY not set`)
    return
  }

  const payload = {
    productName: product.name,
    targetTcin: product.tcin,
    retailPrice: product.retailPrice,
    qty,
    type: 'online',
    detectedAt: new Date().toISOString(),
  }

  const res = await fetch(analyzeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-agent-secret': agentSecret,
    },
    body: JSON.stringify(payload),
  })

  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`[${ts()}] [analyze] Response ${res.status}:`, body)
  } else {
    console.log(`[${ts()}] [analyze] Sent — recommendation: ${body.recommendation}, profit: $${body.profit?.toFixed(2)}`)
  }
}

async function poll() {
  for (const product of PRODUCTS) {
    try {
      const current = await fetchTargetOnline(product.tcin)

      // null means rate-limited — skip this product this cycle
      if (current === null) continue

      const prev = lastKnownStock[product.tcin]
      const wasOutOfStock = !prev || !prev.online
      const nowInStock = current.inStock

      if (wasOutOfStock && nowInStock) {
        console.log(`[${ts()}] ⚡ RESTOCK DETECTED: ${product.name} (qty: ${current.qty})`)
        try {
          await notifyRestock(product, current.qty)
        } catch (notifyErr) {
          console.error(`[${ts()}] [agent] Failed to notify for ${product.name}:`, notifyErr.message)
        }
      } else {
        const status = nowInStock ? `in stock (qty: ${current.qty})` : 'out of stock'
        console.log(`[${ts()}] ${product.name}: ${status}`)
      }

      lastKnownStock[product.tcin] = { online: current.inStock }
    } catch (err) {
      console.error(`[${ts()}] [agent] Error polling ${product.name}:`, err.message)
    }
  }
}

const INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '10000', 10)
setInterval(poll, INTERVAL)
poll()
console.log(`[${ts()}] PullRate agent started — polling every ${INTERVAL / 1000}s`)
