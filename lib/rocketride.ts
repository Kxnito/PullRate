export type RestockData = {
  productName: string;
  retailPrice: number;
  marketPrice: number;
  profit: number;
  demandRating: string;
  avgSales: number;
  daysSinceLastRestock: number;
};

export async function analyzeRestock(
  data: RestockData
): Promise<{ recommendation: string; aiMessage: string; urgency: string }> {
  // TODO: Connect to RocketRide pipeline (pipeline/analyze.pipe) via the TypeScript SDK.
  // Send data as a question, receive parsed JSON response with recommendation, aiMessage, urgency.
  throw new Error('Not implemented');
}
