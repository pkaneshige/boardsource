import { NextRequest, NextResponse } from "next/server";
import { sanityWriteClient } from "@/lib/cms/sanity-write-client";

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "email is required" },
        { status: 400 }
      );
    }

    // Fetch all unread notifications for this email
    const unread = await sanityWriteClient.fetch<Array<{ _id: string }>>(
      `*[_type == "notification" && email == $email && read == false]{ _id }`,
      { email }
    );

    // Mark all as read
    for (const notif of unread) {
      await sanityWriteClient.patch(notif._id).set({ read: true }).commit();
    }

    return NextResponse.json({ marked: unread.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
