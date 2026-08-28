import { NextResponse } from "next/server";

// STEP 0/1 stub — accepts an order and returns a confirmation number.
// Nothing is persisted or sent to the kitchen yet: there is no database
// and no n8n webhook wired up at this point in the plan (that's Phase 2:
// this is where `order.created` would fire out to n8n for staff
// notification, and where the order would be written to Postgres via
// Prisma once Supabase is connected).

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json(
      { error: "Order must include at least one item" },
      { status: 400 }
    );
  }

  // Simple readable order number for the demo — not guaranteed unique
  // across restarts, replace with a real sequence/DB id in Phase 2.
  const orderNumber = String(Math.floor(1000 + Math.random() * 9000));

  console.log("[demo order received]", {
    orderNumber,
    venueSlug: body.venueSlug,
    locale: body.locale,
    items: body.items,
  });

  return NextResponse.json({ orderNumber, status: "received" });
}
