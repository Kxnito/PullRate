import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // TODO: Parse optional query params from request.nextUrl.searchParams
  //   e.g. productId, limit, since (date filter)
  // TODO: Query Firestore "drops" collection with filters and return results
  return Response.json({ drops: [] });
}
