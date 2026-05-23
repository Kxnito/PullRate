const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const STORE_KEY = 'ff457966e64d5e877fdbad070f276d18ecec4a01';

type StoreResult = {
  storeId: string;
  storeName: string;
  storeAddress: string;
  lat: number;
  lng: number;
  inStock: boolean;
  qty: number;
};

export type TargetInventory = {
  online: boolean;
  onlineQty: number;
  price: number;
  stores: StoreResult[];
};

async function fetchOnlineInventory(tcin: string): Promise<{ online: boolean; onlineQty: number; price: number }> {
  const url = new URL('https://redsky.target.com/redsky_aggregations/v1/web/pdp_client_v1');
  url.searchParams.set('tcin', tcin);
  url.searchParams.set('pricing_store_id', '3991');
  url.searchParams.set('visitor_id', 'pullrate');
  url.searchParams.set('channel', 'WEB');
  url.searchParams.set('page', `/p/A-${tcin}`);

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Target online inventory fetch failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const network = data?.data?.product?.available_to_promise_network;
  const price = data?.data?.product?.price?.current_retail;

  if (!network) {
    throw new Error(`Unexpected Target API response for TCIN ${tcin}: missing availability data`);
  }

  return {
    online: network.availability === 'IN_STOCK',
    onlineQty: Number(network.available_to_promise_quantity ?? 0),
    price: Number(price ?? 0),
  };
}

async function fetchNearbyStores(): Promise<{ storeId: string; storeName: string; storeAddress: string; lat: number; lng: number }[]> {
  const zip = process.env.HOME_ZIP ?? '92843';
  const url = new URL('https://redsky.target.com/v3/stores/nearby');
  url.searchParams.set('place', zip);
  url.searchParams.set('within', '25');
  url.searchParams.set('unit', 'mile');
  url.searchParams.set('limit', '10');
  url.searchParams.set('key', STORE_KEY);

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Target store locator failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const locations: unknown[] = data?.data?.stores ?? [];

  return locations.map((s) => {
    const store = s as Record<string, unknown>;
    const address = store.address as Record<string, unknown> | undefined;
    const location = store.location as Record<string, unknown> | undefined;
    return {
      storeId: String(store.store_id ?? store.id ?? ''),
      storeName: String(store.store_name ?? ''),
      storeAddress: String(address?.address_line1 ?? ''),
      lat: Number(location?.latitude ?? 0),
      lng: Number(location?.longitude ?? 0),
    };
  });
}

async function fetchStoreStock(storeId: string, tcin: string): Promise<{ inStock: boolean; qty: number }> {
  const url = new URL(`https://redsky.target.com/v3/stores/${storeId}/aisles`);
  url.searchParams.set('tcin', tcin);
  url.searchParams.set('key', STORE_KEY);

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!res.ok) {
    throw new Error(`Store ${storeId} aisle fetch failed: ${res.status}`);
  }

  const data = await res.json();
  // Response structure varies; look for quantity at known paths
  const locations: unknown[] = data?.data?.product_locations ?? [];
  const qty = locations.reduce((sum: number, loc) => {
    const entry = loc as Record<string, unknown>;
    return sum + Number(entry.quantity ?? 0);
  }, 0);

  return { inStock: qty > 0, qty };
}

export async function fetchTargetInventory(tcin: string): Promise<TargetInventory> {
  const [online, nearbyStores] = await Promise.all([
    fetchOnlineInventory(tcin),
    fetchNearbyStores(),
  ]);

  const stores: StoreResult[] = [];
  for (const store of nearbyStores) {
    try {
      const stock = await fetchStoreStock(store.storeId, tcin);
      stores.push({ ...store, ...stock });
    } catch {
      // Skip stores that fail rather than aborting the whole check
    }
  }

  return { ...online, stores };
}
