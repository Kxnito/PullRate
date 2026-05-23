type TokenCache = { token: string; expiresAt: number };

let tokenCache: TokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }

  const clientId = process.env.EBAY_CLIENT_ID;
  const clientSecret = process.env.EBAY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET');
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://api.ebay.com/identity/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=https://api.ebay.com/oauth/api_scope',
  });

  if (!res.ok) {
    throw new Error(`eBay OAuth failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  // Subtract 60s from expiry as a safety buffer
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };

  return tokenCache.token;
}

function getDemandRating(avgSales: number): string {
  if (avgSales >= 50) return 'Very High';
  if (avgSales >= 20) return 'High';
  if (avgSales >= 5) return 'Medium';
  return 'Low';
}

export async function fetchMarketPrice(
  productName: string
): Promise<{ marketPrice: number; avgSales: number; demandRating: string }> {
  const token = await getAccessToken();

  const url = new URL('https://api.ebay.com/buy/browse/v1/item_summary/search');
  url.searchParams.set('q', productName);
  url.searchParams.set('filter', 'buyingOptions:{FIXED_PRICE}');
  url.searchParams.set('sort', 'endTimeSoonest');
  url.searchParams.set('limit', '10');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-EBAY-C-MARKETPLACE-ID': 'EBAY_US',
    },
  });

  if (!res.ok) {
    throw new Error(`eBay Browse API failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const items: { price?: { value?: string } }[] = data.itemSummaries ?? [];

  if (items.length === 0) {
    throw new Error(`No eBay listings found for "${productName}"`);
  }

  const prices = items
    .map((item) => parseFloat(item.price?.value ?? '0'))
    .filter((p) => p > 0);

  if (prices.length === 0) {
    throw new Error(`eBay listings for "${productName}" had no valid prices`);
  }

  const marketPrice = parseFloat(
    (prices.reduce((sum, p) => sum + p, 0) / prices.length).toFixed(2)
  );
  const avgSales = items.length;

  return { marketPrice, avgSales, demandRating: getDemandRating(avgSales) };
}
