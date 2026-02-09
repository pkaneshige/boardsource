import { NextRequest, NextResponse } from "next/server";
import { sanityWriteClient } from "@/lib/cms/sanity-write-client";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const doc = await sanityWriteClient.fetch<{ _id: string } | null>(
      `*[_type == "notification" && _id == $id][0]{ _id }`,
      { id }
    );

    if (!doc) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    await sanityWriteClient.patch(id).set({ read: true }).commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
