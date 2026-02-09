import { NextRequest, NextResponse } from "next/server";
import { sanityWriteClient } from "@/lib/cms/sanity-write-client";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");

  if (!email) {
    return NextResponse.json(
      { error: "email query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const notifications = await sanityWriteClient.fetch<
      Array<{
        _id: string;
        alertType: string;
        message: string;
        previousPrice?: number;
        newPrice?: number;
        read: boolean;
        createdAt: string;
        surfboardName: string;
        surfboardSlug: string;
      }>
    >(
      `*[_type == "notification" && email == $email] | order(createdAt desc) {
        _id,
        alertType,
        message,
        previousPrice,
        newPrice,
        read,
        createdAt,
        "surfboardName": surfboard->name,
        "surfboardSlug": surfboard->slug.current
      }`,
      { email }
    );

    return NextResponse.json(notifications);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
