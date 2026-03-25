import { NextRequest, NextResponse } from "next/server";
import { normalizeAnnouncementType } from "@/lib/announcement";

export const runtime = "edge";

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

function getUpstreamBaseUrl() {
  const baseUrl = process.env.ANNOUNCEMENT_DATA_SERVICE_URL?.trim();
  if (!baseUrl) return null;
  return baseUrl.replace(/\/$/, "");
}

function buildUpstreamHeaders() {
  const token = process.env.ANNOUNCEMENT_DATA_SERVICE_TOKEN?.trim();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function GET(request: NextRequest) {
  if (!isServiceAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const upstream = getUpstreamBaseUrl();
  if (!upstream) {
    return NextResponse.json({ message: "Announcement upstream service is not configured" }, { status: 500 });
  }

  try {
    const response = await fetch(`${upstream}/announcements`, {
      method: "GET",
      headers: buildUpstreamHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json({ message: "Failed to query announcements", detail }, { status: response.status });
    }

    const payload = (await response.json()) as {
      data?: Array<{ id: number; title: string; content: string; type: string; created_at?: string; date?: string }>;
      announcements?: Array<{ id: number; title: string; content: string; type: string; created_at?: string; date?: string }>;
    };

    const rows = payload.data ?? payload.announcements ?? [];
    const data = rows.map((row) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      type: normalizeAnnouncementType(row.type),
      date: (row.date || row.created_at || new Date().toISOString()).slice(0, 10),
      created_at: row.created_at || new Date().toISOString(),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upstream error";
    return NextResponse.json({ message: "Failed to query announcements", detail: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isServiceAuthorized(request)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const upstream = getUpstreamBaseUrl();
  if (!upstream) {
    return NextResponse.json({ message: "Announcement upstream service is not configured" }, { status: 500 });
  }

  const payload = (await request.json()) as CreateAnnouncementPayload;
  const title = (payload.title || "").trim();
  const content = (payload.content || "").trim();
  const type = normalizeAnnouncementType((payload.type || "update").trim());

  if (!title || !content) {
    return NextResponse.json({ message: "Title and content are required" }, { status: 400 });
  }

  try {
    const response = await fetch(`${upstream}/announcements`, {
      method: "POST",
      headers: buildUpstreamHeaders(),
      body: JSON.stringify({ title, content, type }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      return NextResponse.json({ message: "Failed to create announcement", detail }, { status: response.status });
    }

    const payload = (await response.json()) as {
      data?: { id: number; title: string; content: string; type: string; created_at?: string; date?: string };
      announcement?: { id: number; title: string; content: string; type: string; created_at?: string; date?: string };
    };

    const row = payload.data ?? payload.announcement;
    if (!row) {
      return NextResponse.json({ message: "Announcement created but response payload missing" }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        id: row.id,
        title: row.title,
        content: row.content,
        type: normalizeAnnouncementType(row.type),
        date: (row.date || row.created_at || new Date().toISOString()).slice(0, 10),
        created_at: row.created_at || new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upstream error";
    return NextResponse.json({ message: "Failed to create announcement", detail: message }, { status: 500 });
  }
}
