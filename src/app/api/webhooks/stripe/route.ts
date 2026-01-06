export async function POST(request: Request) {
  // TODO: validate Stripe signature using STRIPE_WEBHOOK_SECRET
  const body = await request.text();
  return new Response(body, { status: 200 });
}
