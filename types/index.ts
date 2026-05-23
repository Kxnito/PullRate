export interface Product {
  id: string;
  name: string;
  targetTcin: string;
  retailPrice: number;
  active: boolean;
  createdAt: Date;
}

export interface Drop {
  id: string;
  productId: string;
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
  alertSent: boolean;
}

export interface Prediction {
  id: string;
  productId: string;
  probability: number;
  estimatedWindow: string;
  reasoning: string;
  avgDaysBetweenRestocks: number;
  daysSinceLastRestock: number;
  generatedAt: Date;
}

export interface Settings {
  discordWebhookUrl: string;
  homeZip: string;
  radiusMiles: number;
  alertType: 'online' | 'in-store' | 'both';
}

export interface AnalysisResult {
  recommendation: 'Buy Now' | 'Buy if Convenient' | 'Skip';
  demandSummary: string;
  urgency: string;
  alertMessage: string;
}
