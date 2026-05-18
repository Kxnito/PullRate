export type DropAlert = {
  productName: string;
  retailer: string;
  type: 'online' | 'in-store';
  storeId?: string;
  storeName?: string;
  storeAddress?: string;
  lat?: number;
  lng?: number;
  qty: number;
  retailPrice: number;
  marketPrice: number;
  profit: number;
  demandRating: string;
  recommendation: string;
  aiMessage: string;
  detectedAt: Date;
};

export async function sendDropAlert(drop: DropAlert): Promise<void> {
  // TODO: POST a formatted embed to process.env.DISCORD_WEBHOOK_URL.
  // Include all drop fields as embed fields, color-code by recommendation tier.
  throw new Error('Not implemented');
}
