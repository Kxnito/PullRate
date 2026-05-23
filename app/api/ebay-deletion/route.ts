import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const challenge_code = request.nextUrl.searchParams.get('challenge_code');
  return Response.json({ challengeResponse: challenge_code });
}

export async function POST(_request: NextRequest) {
  return Response.json({ ok: true });
}
