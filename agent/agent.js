require('dotenv').config()

const PRODUCTS = [
  { name: 'Prismatic Evolutions ETB', tcin: '1011206804', retailPrice: 49.99 },
  { name: 'Ascended Heroes ETB', tcin: '95082118', retailPrice: 49.99 },
  { name: 'Ascended Heroes Booster Bundle', tcin: '95120834', retailPrice: 19.99 },
]

const TEST_MODE = process.argv.includes('--test')
if (TEST_MODE) console.log('[agent] Running in TEST MODE')

// { [tcin]: { online: boolean } }
const lastKnownStock = {}

const TARGET_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://www.target.com',
  'Referer': 'https://www.target.com/',
}

function ts() {
  return new Date().toISOString()
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchTargetOnline(tcin) {
  const url = new URL('https://redsky.target.com/redsky_aggregations/v1/web/product_summary_with_fulfillment_v1')
  url.searchParams.set('key', '9f36aeafbe60771e321a7cc95a78140772ab3e96')
  url.searchParams.set('tcins', tcin)
  url.searchParams.set('zip', '92843')
  url.searchParams.set('state', 'CA')
  url.searchParams.set('latitude', '33.77')
  url.searchParams.set('longitude', '-117.94')
  url.searchParams.set('has_required_store_id', 'false')
  url.searchParams.set('skip_price_promo', 'true')
  url.searchParams.set('visitor_id', 'pullrate')
  url.searchParams.set('channel', 'WEB')
  url.searchParams.set('page', `/p/A-${tcin}`)

  await sleep(Math.floor(Math.random() * 2000) + 1000)

  const res = await fetch(url.toString(), {
    headers: TARGET_HEADERS,
  })

  if (res.status === 403 || res.status === 429) {
    console.warn(`[${ts()}] [target] Rate limited (${res.status}) for TCIN ${tcin} — skipping cycle`)
    return null
  }

  if (!res.ok) {
    throw new Error(`Target API returned ${res.status} for TCIN ${tcin}`)
  }

  const data = await res.json()
  console.log('Target raw response:', JSON.stringify(data).substring(0, 2000))

  const product = data?.data?.product_summaries?.[0]
  const fulfillment = product?.fulfillment
  console.log('fulfillment path:', JSON.stringify(fulfillment))

  if (!fulfillment) {
    throw new Error(`Missing fulfillment data in Target response for TCIN ${tcin}`)
  }

  return {
    inStock: fulfillment.availability_status === 'IN_STOCK',
    qty: Number(fulfillment.available_to_promise_quantity ?? 0),
    price: Number(product?.price?.current_retail ?? 0),
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
  if (TEST_MODE) {
    console.log(`[${ts()}] [test] Sending fake restock event to analyze endpoint...`)
    try {
      await notifyRestock(
        { name: 'Prismatic Evolutions ETB', tcin: '1011206804', retailPrice: 49.99 },
        3
      )
    } catch (err) {
      console.error(`[${ts()}] [test] notifyRestock failed:`, err.message)
    }
    clearInterval(pollInterval)
    return
  }

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

    await sleep(3000)
  }
}

const INTERVAL = parseInt(process.env.POLL_INTERVAL_MS || '10000', 10)
const pollInterval = setInterval(poll, INTERVAL)
poll()
console.log(`[${ts()}] PullRate agent started — polling every ${INTERVAL / 1000}s`)
