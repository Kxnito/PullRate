import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest) {
  // TODO: Query Firestore "products" collection and return all documents
  return Response.json({ products: [] });
}

export async function POST(request: NextRequest) {
  // TODO: Parse product from request body
  // TODO: Validate required fields (name, targetTcin, retailPrice)
  // TODO: Add new product document to Firestore "products" collection
  return Response.json({ ok: true }, { status: 201 });
}
