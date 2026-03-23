import { NextRequest, NextResponse } from "next/server";
import { normalizeAnnouncementType } from "@/lib/announcement";
import { createAnnouncementViaService } from "@/lib/announcement-data-service";

export const runtime = "edge";

type CreateAnnouncementPayload = {
  title?: string;
  content?: string;
  type?: string;
};

function isAuthorized(request: NextRequest) {
  const expectedToken = process.env.ANNOUNCEMENT_ADMIN_TOKEN;
  if (!expectedToken) {
    return true;
  }

  const providedToken = request.headers.get("x-admin-token");
  return providedToken === expectedToken;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const serviceUrl = process.env.ANNOUNCEMENT_DATA_SERVICE_URL;
  if (!serviceUrl) {
    return NextResponse.json(
      { message: "Announcement HTTP data service is not configured on server" },
      { status: 500 }
    );
  }

  const payload = (await request.json()) as CreateAnnouncementPayload;
  const title = (payload.title || "").trim();
  const content = (payload.content || "").trim();
  const type = normalizeAnnouncementType((payload.type || "update").trim());

  if (!title || !content) {
    return NextResponse.json(
      { message: "Title and content are required" },
      { status: 400 }
    );
  }

  try {
    const created = await createAnnouncementViaService({
      title,
      content,
      type,
    });

    if (!created) {
      return NextResponse.json(
        { message: "Announcement HTTP data service is not configured on server" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Announcement created",
      data: created,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json(
      {
        message: "Failed to create announcement",
        detail: message,
      },
      { status: 500 }
    );
  }
}
