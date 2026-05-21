require('dotenv').config();

const PRODUCTS = [
  { name: 'Prismatic Evolutions ETB', tcin: '1011206804' },
  { name: 'Ascended Heroes ETB', tcin: '95082118' },
  { name: 'Ascended Heroes Booster Bundle', tcin: '95120834' },
];

const POLL_INTERVAL_MS = 10_000;

async function checkProduct(product) {
  console.log(`[poll] Checking ${product.name} (TCIN: ${product.tcin})`);

  // TODO: Call Target API to get inventory for product.tcin
  // TODO: If in-stock, fetch eBay market price
  // TODO: If profitable, POST restock payload to /api/analyze with PI_SECRET_KEY header
  // TODO: Log result or alert
}

async function poll() {
  console.log('[poll] Starting PullRate polling agent...');

  while (true) {
    for (const product of PRODUCTS) {
      try {
        await checkProduct(product);
      } catch (err) {
        console.error(`[poll] Error checking ${product.name}:`, err.message);
      }
    }

    console.log(`[poll] Sleeping ${POLL_INTERVAL_MS / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

poll();
