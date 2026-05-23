import { NextRequest } from 'next/server';
import { db } from '@/lib/firebase';
import { fetchMarketPrice } from '@/lib/ebay';
import { analyzeRestock } from '@/lib/langchain';
import { sendDropAlert } from '@/lib/discord';
import type { Drop } from '@/types';

type RestockPayload = {
  productName: string;
  targetTcin: string;
  retailPrice: number;
  qty: number;
  type: 'online' | 'instore';
  storeId?: string;
  storeName?: string;
  storeAddress?: string;
  lat?: number;
  lng?: number;
  detectedAt: string;
};

async function getDaysSinceLastRestock(productId: string, now: Date): Promise<number> {
  const snap = await db
    .collection('drops')
    .where('productId', '==', productId)
    .orderBy('detectedAt', 'desc')
    .limit(1)
    .get();

  if (snap.empty) return 0;

  const lastDrop = snap.docs[0].data();
  const lastDate: Date = lastDrop.detectedAt?.toDate?.() ?? new Date(lastDrop.detectedAt);
  const diffMs = now.getTime() - lastDate.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export async function POST(request: NextRequest) {
  try {
    // Step 1 — verify agent secret
    const secret = request.headers.get('x-agent-secret');
    if (!secret || secret !== process.env.AGENT_SECRET_KEY) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Step 2 — parse body
    const body: RestockPayload = await request.json();
    const {
      productName, targetTcin, retailPrice, qty, type,
      storeId, storeName, storeAddress, lat, lng, detectedAt,
    } = body;

    const detectedAt_ = new Date(detectedAt);

    // Step 3 — eBay market price + profit
    const { marketPrice, demandRating } = await fetchMarketPrice(productName);
    const profit = marketPrice - retailPrice - marketPrice * 0.1255;

    // Step 4 — days since last restock
    const daysSinceLastRestock = await getDaysSinceLastRestock(targetTcin, detectedAt_);

    // Step 5 — LangChain analysis
    const timeOfDay = detectedAt_.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Los_Angeles',
    });

    const analysis = await analyzeRestock({
      productName,
      retailPrice,
      marketPrice,
      profit,
      demandRating,
      daysSinceLastRestock,
      qty,
      timeOfDay,
    });

    // Step 6 — log drop to Firestore
    const dropData: Omit<Drop, 'id'> = {
      productId: targetTcin,
      productName,
      retailer: 'Target',
      type: type === 'instore' ? 'in-store' : 'online',
      ...(storeId && { storeId }),
      ...(storeName && { storeName }),
      ...(storeAddress && { storeAddress }),
      ...(lat != null && { lat }),
      ...(lng != null && { lng }),
      qty,
      retailPrice,
      marketPrice,
      profit,
      demandRating,
      recommendation: analysis.recommendation,
      aiMessage: analysis.alertMessage,
      detectedAt: detectedAt_,
      alertSent: false,
    };

    const dropRef = await db.collection('drops').add(dropData);

    // Step 7 — Discord alert
    const targetUrl = `https://www.target.com/p/-/A-${targetTcin}`;

    await sendDropAlert({
      productName,
      retailer: 'Target',
      type,
      storeName,
      storeAddress,
      lat,
      lng,
      qty,
      retailPrice,
      marketPrice,
      profit,
      demandRating,
      recommendation: analysis.recommendation,
      urgency: analysis.urgency,
      alertMessage: analysis.alertMessage,
      targetUrl,
    });

    // Mark alertSent now that Discord succeeded
    await dropRef.update({ alertSent: true });

    // Step 8 — respond
    return Response.json({
      ok: true,
      recommendation: analysis.recommendation,
      profit,
      marketPrice,
      demandRating,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[analyze] POST failed:', message);
    return Response.json({ error: message }, { status: 500 });
  }
}
