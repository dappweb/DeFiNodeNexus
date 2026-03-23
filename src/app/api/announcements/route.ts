import { NextResponse } from "next/server";
import { MOCK_USER_DATA } from "@/lib/mock-data";
import { normalizeAnnouncementType } from "@/lib/announcement";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "edge";

type DbAnnouncementRow = {
  id: string;
  title: string;
  content: string;
  type: string;
  created_at: string;
};

export async function GET() {
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({
      data: MOCK_USER_DATA.announcements,
      source: "mock",
    });
  }

  const { data, error } = await supabase
    .from("announcements")
    .select("id,title,content,type,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json(
      {
        message: "Failed to load announcements",
        detail: error.message,
      },
      { status: 500 }
    );
  }

  const mapped = ((data as DbAnnouncementRow[] | null) ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    type: normalizeAnnouncementType(row.type),
    date: (row.created_at || "").slice(0, 10),
  }));

  return NextResponse.json({ data: mapped, source: "supabase" });
}
