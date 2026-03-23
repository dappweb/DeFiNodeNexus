import { NextRequest, NextResponse } from "next/server";
import { normalizeAnnouncementType } from "@/lib/announcement";
import { getMysqlPool } from "@/lib/mysql/server";

export const runtime = "nodejs";

type CreateAnnouncementPayload = {
  title?: string;
  content?: string;
  type?: string;
};

function isServiceAuthorized(request: NextRequest) {
  const expectedToken = process.env.ANNOUNCEMENT_DATA_SERVICE_TOKEN;
  if (!expectedToken) {
    return true;
  }

  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  return token === expectedToken;
}

export async function GET(request: NextRequest) {
  if (!isServiceAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const pool = getMysqlPool();
  if (!pool) {
    return NextResponse.json({ message: "MySQL is not configured" }, { status: 500 });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, title, content, type, created_at FROM announcements ORDER BY created_at DESC LIMIT 50"
    );

    const data = (rows as Array<{ id: number; title: string; content: string; type: string; created_at: Date | string }>).map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: normalizeAnnouncementType(row.type),
      date: new Date(row.created_at).toISOString().slice(0, 10),
      created_at: new Date(row.created_at).toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({ message: "Failed to query announcements", detail: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isServiceAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const pool = getMysqlPool();
  if (!pool) {
    return NextResponse.json({ message: "MySQL is not configured" }, { status: 500 });
  }

  const payload = (await request.json()) as CreateAnnouncementPayload;
  const title = (payload.title || "").trim();
  const content = (payload.content || "").trim();
  const type = normalizeAnnouncementType((payload.type || "update").trim());

  if (!title || !content) {
    return NextResponse.json({ message: "Title and content are required" }, { status: 400 });
  }

  try {
    const [insertResult] = await pool.query(
      "INSERT INTO announcements (title, content, type) VALUES (?, ?, ?)",
      [title, content, type]
    );

    const insertedId = Number((insertResult as { insertId?: number }).insertId || 0);
    const [rows] = await pool.query(
      "SELECT id, title, content, type, created_at FROM announcements WHERE id = ? LIMIT 1",
      [insertedId]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ message: "Announcement created but failed to read back" }, { status: 500 });
    }

    const row = rows[0] as { id: number; title: string; content: string; type: string; created_at: Date | string };
    return NextResponse.json({
      data: {
        id: row.id,
        title: row.title,
        content: row.content,
        type: normalizeAnnouncementType(row.type),
        date: new Date(row.created_at).toISOString().slice(0, 10),
        created_at: new Date(row.created_at).toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";
    return NextResponse.json({ message: "Failed to create announcement", detail: message }, { status: 500 });
  }
}
