import { NextRequest, NextResponse } from "next/server";
import { normalizeAnnouncementType } from "@/lib/announcement";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

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

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json(
      { message: "Supabase is not configured on server" },
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

  const { data, error } = await supabase
    .from("announcements")
    .insert({ title, content, type })
    .select("id,title,content,type,created_at")
    .single();

  if (error) {
    return NextResponse.json(
      {
        message: "Failed to create announcement",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    message: "Announcement created",
    data: {
      id: data.id,
      title: data.title,
      content: data.content,
      type: normalizeAnnouncementType(data.type),
      date: (data.created_at || "").slice(0, 10),
    },
  });
}
