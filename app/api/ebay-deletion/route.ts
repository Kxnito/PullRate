import { createHash } from 'crypto'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const challengeCode = searchParams.get('challenge_code') || ''
  const verificationToken = process.env.EBAY_VERIFICATION_TOKEN || ''
  const endpoint = 'https://pull-rate-two.vercel.app/api/ebay-deletion'

  const hash = createHash('sha256')
  hash.update(challengeCode)
  hash.update(verificationToken)
  hash.update(endpoint)
  const challengeResponse = hash.digest('hex')

  return Response.json({ challengeResponse })
}

export async function POST() {
  return Response.json({ ok: true })
}
