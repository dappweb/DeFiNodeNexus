import { NextResponse } from "next/server";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { fetchAnnouncementsFromService } from "@/lib/announcement-data-service";

export const runtime = "edge";

export async function GET() {
  try {
    const rows = await fetchAnnouncementsFromService();
    if (!rows) {
      return NextResponse.json({
        data: MOCK_USER_DATA.announcements,
        source: "mock",
      });
    }

    return NextResponse.json({ data: rows, source: "http-service" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json(
      {
        message: "Failed to load announcements",
        detail: message,
      },
      { status: 500 }
    );
  }
}
