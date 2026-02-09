import { NextRequest, NextResponse } from "next/server";
import { sanityWriteClient } from "@/lib/cms/sanity-write-client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, surfboardId, alertType, targetPrice } = body;

    // Validate required fields
    if (!email || !surfboardId || !alertType) {
      return NextResponse.json(
        { error: "email, surfboardId, and alertType are required" },
        { status: 400 }
      );
    }

    if (!["price_drop", "back_in_stock"].includes(alertType)) {
      return NextResponse.json(
        { error: "alertType must be 'price_drop' or 'back_in_stock'" },
        { status: 400 }
      );
    }

    if (alertType === "price_drop" && (targetPrice == null || targetPrice <= 0)) {
      return NextResponse.json(
        { error: "targetPrice is required and must be > 0 for price_drop alerts" },
        { status: 400 }
      );
    }

    // Check for duplicate active alert
    const existing = await sanityWriteClient.fetch<{ _id: string } | null>(
      `*[_type == "priceAlert" && email == $email && surfboard._ref == $surfboardId && alertType == $alertType && active == true][0]{ _id }`,
      { email, surfboardId, alertType }
    );

    if (existing) {
      return NextResponse.json(
        { error: "An active alert already exists for this board and alert type" },
        { status: 409 }
      );
    }

    // Create the alert
    const doc = await sanityWriteClient.create({
      _type: "priceAlert",
      email,
      surfboard: { _type: "reference", _ref: surfboardId },
      alertType,
      targetPrice: alertType === "price_drop" ? targetPrice : undefined,
      active: true,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ id: doc._id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "email query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const alerts = await sanityWriteClient.fetch<
      Array<{
        _id: string;
        alertType: string;
        targetPrice?: number;
        active: boolean;
        createdAt: string;
        surfboardName: string;
        surfboardSlug: string;
      }>
    >(
      `*[_type == "priceAlert" && email == $email && active == true] | order(createdAt desc) {
        _id,
        alertType,
        targetPrice,
        active,
        createdAt,
        "surfboardName": surfboard->name,
        "surfboardSlug": surfboard->slug.current
      }`,
      { email }
    );

    return NextResponse.json(alerts);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
