import { NextRequest, NextResponse } from "next/server";
import { sanityWriteClient } from "@/lib/cms/sanity-write-client";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Check the alert exists
    const alert = await sanityWriteClient.fetch<{ _id: string } | null>(
      `*[_type == "priceAlert" && _id == $id][0]{ _id }`,
      { id }
    );

    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Deactivate the alert
    await sanityWriteClient.patch(id).set({ active: false }).commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
