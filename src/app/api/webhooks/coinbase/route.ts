export async function POST(request: Request) {
  // TODO: validate Coinbase Commerce signature using webhook shared secret
  const body = await request.text();
  return new Response(body, { status: 200 });
}
