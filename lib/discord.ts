export type DropAlert = {
  productName: string;
  retailer: string;
  type: 'online' | 'instore';
  storeName?: string;
  storeAddress?: string;
  lat?: number;
  lng?: number;
  qty: number;
  retailPrice: number;
  marketPrice: number;
  profit: number;
  demandRating: string;
  recommendation: 'Buy Now' | 'Buy if Convenient' | 'Skip';
  urgency: string;
  alertMessage: string;
  targetUrl?: string;
};

const COLORS: Record<DropAlert['recommendation'], number> = {
  'Buy Now': 0x00ff00,
  'Buy if Convenient': 0xffff00,
  Skip: 0xff0000,
};

export async function sendDropAlert(drop: DropAlert): Promise<void> {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error('[discord] DISCORD_WEBHOOK_URL is not set');
      return;
    }

    const storeDisplay = drop.type === 'instore' && drop.storeName ? drop.storeName : 'Online';

    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: '🏪 Store',            value: storeDisplay,                          inline: true },
      { name: '📦 Qty',              value: String(drop.qty),                      inline: true },
      { name: '💵 Retail',           value: `$${drop.retailPrice}`,                inline: true },
      { name: '📈 eBay Market',      value: `$${drop.marketPrice}`,                inline: true },
      { name: '💰 Est. Profit',      value: `$${drop.profit.toFixed(2)}`,          inline: true },
      { name: '🔥 Demand',           value: drop.demandRating,                     inline: true },
      { name: '🤖 AI Recommendation',value: drop.recommendation,                   inline: true },
      { name: '⏱ Urgency',          value: drop.urgency,                          inline: false },
      { name: '💬 Alert',            value: drop.alertMessage,                     inline: false },
    ];

    if (drop.type === 'instore' && drop.lat != null && drop.lng != null) {
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${drop.lat},${drop.lng}&travelmode=driving`;
      fields.push({ name: '🗺️ Directions', value: mapsUrl, inline: false });
    }

    if (drop.targetUrl) {
      fields.push({ name: '🛒 Buy Online', value: drop.targetUrl, inline: false });
    }

    const body = {
      embeds: [
        {
          title: `⚡ RESTOCK — ${drop.productName}`,
          color: COLORS[drop.recommendation],
          fields,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`[discord] Webhook POST failed: ${res.status} ${await res.text()}`);
    }
  } catch (err) {
    console.error('[discord] sendDropAlert threw, alert suppressed:', err);
  }
}
