import { normalizeAnnouncementType } from "@/lib/announcement";
import { createAnnouncementViaService, deleteAnnouncementViaService } from "@/lib/announcement-data-service";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

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
    const created = await createAnnouncementViaService({ title, content, type });

    if (!created) {
      return NextResponse.json(
        { message: "No announcement backend configured (set JSONBIN_BIN_ID + JSONBIN_MASTER_KEY or ANNOUNCEMENT_DATA_SERVICE_URL)" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Announcement created", data: created });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { message: "Failed to create announcement", detail: message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = (await request.json()) as { id?: string | number };
  if (!id) {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }

  try {
    const ok = await deleteAnnouncementViaService(id);
    if (!ok) {
      return NextResponse.json({ message: "Not found or backend not configured" }, { status: 404 });
    }
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ message: "Failed to delete", detail: message }, { status: 500 });
  }
}
