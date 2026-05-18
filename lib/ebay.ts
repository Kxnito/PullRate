export async function fetchMarketPrice(
  productName: string
): Promise<{ marketPrice: number; avgSales: number; demandRating: string }> {
  // TODO: Call eBay Browse API to find recently sold listings for productName.
  // Compute average sold price (marketPrice), average daily sales volume (avgSales),
  // and derive a demandRating (e.g. "High" / "Medium" / "Low") from sell-through velocity.
  throw new Error('Not implemented');
}
