import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PromptTemplate } from '@langchain/core/prompts';
import { JsonOutputParser } from '@langchain/core/output_parsers';
import type { AnalysisResult } from '@/types';

export type RestockInput = {
  productName: string;
  retailPrice: number;
  marketPrice: number;
  profit: number;
  demandRating: string;
  daysSinceLastRestock: number;
  qty: number;
  timeOfDay: string;
};

const model = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash',
  apiKey: process.env.GEMINI_API_KEY,
});

const prompt = PromptTemplate.fromTemplate(
  `You are an expert Pokemon TCG resell analyst.

Product: {productName}
Retail Price: \${retailPrice}
eBay Market Price: \${marketPrice}
Estimated Profit after 12.55% fees: \${profit}
Demand Rating: {demandRating}
Days Since Last Restock: {daysSinceLastRestock}
Units In Stock: {qty}
Time of Day: {timeOfDay}

Respond ONLY with a raw JSON object with these exact keys:
- recommendation: one of Buy Now, Buy if Convenient, or Skip
- demandSummary: one sentence about current demand
- urgency: how fast it will likely sell out
- alertMessage: one natural sentence for a Discord alert

No markdown, no backticks, just raw JSON.`
);

const chain = prompt.pipe(model).pipe(new JsonOutputParser());

export async function analyzeRestock(data: RestockInput): Promise<AnalysisResult> {
  try {
    const result = await chain.invoke({
      productName: data.productName,
      retailPrice: data.retailPrice,
      marketPrice: data.marketPrice,
      profit: data.profit,
      demandRating: data.demandRating,
      daysSinceLastRestock: data.daysSinceLastRestock,
      qty: data.qty,
      timeOfDay: data.timeOfDay,
    });
    return result as AnalysisResult;
  } catch (err) {
    console.error('[langchain] analyzeRestock failed, using fallback:', err);
    const { productName, retailPrice, marketPrice, profit, demandRating } = data;
    return {
      recommendation: profit > 20 ? 'Buy Now' : profit > 5 ? 'Buy if Convenient' : 'Skip',
      demandSummary: `${demandRating} demand based on recent eBay sales.`,
      urgency: 'Sell-through time unknown.',
      alertMessage: `${productName} restocked. Retail: $${retailPrice}. Market: $${marketPrice}. Est. profit: $${profit.toFixed(2)}.`,
    };
  }
}
