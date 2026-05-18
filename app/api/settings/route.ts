import { NextRequest } from 'next/server';

export async function GET(_request: NextRequest) {
  // TODO: Fetch settings document from Firestore "settings" collection
  return Response.json({ settings: null });
}

export async function PUT(request: NextRequest) {
  // TODO: Parse updated settings from request body
  // TODO: Validate fields (discordWebhookUrl, homeZip, radiusMiles, alertType)
  // TODO: Upsert settings document in Firestore "settings" collection
  return Response.json({ ok: true });
}
