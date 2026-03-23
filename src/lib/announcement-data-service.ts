import { AnnouncementItem, normalizeAnnouncementType } from "@/lib/announcement";

type ServiceAnnouncement = {
  id: string | number;
  title: string;
  content: string;
  type: string;
  created_at?: string;
  date?: string;
};

function getServiceConfig() {
  const baseUrl = process.env.ANNOUNCEMENT_DATA_SERVICE_URL?.trim();
  const token = process.env.ANNOUNCEMENT_DATA_SERVICE_TOKEN?.trim();
  if (!baseUrl) {
    return null;
  }

  return {
    baseUrl: baseUrl.replace(/\/$/, ""),
    token,
  };
}

function buildHeaders(token?: string) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function mapServiceAnnouncement(item: ServiceAnnouncement): AnnouncementItem {
  const date = item.date || item.created_at || new Date().toISOString();
  return {
    id: item.id,
    title: item.title,
    content: item.content,
    type: normalizeAnnouncementType(item.type || "update"),
    date: date.slice(0, 10),
  };
}

export async function fetchAnnouncementsFromService() {
  const cfg = getServiceConfig();
  if (!cfg) {
    return null;
  }

  const response = await fetch(`${cfg.baseUrl}/announcements`, {
    method: "GET",
    headers: buildHeaders(cfg.token),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Service request failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: ServiceAnnouncement[];
    announcements?: ServiceAnnouncement[];
  };

  const rows = payload.data ?? payload.announcements ?? [];
  return rows.map(mapServiceAnnouncement);
}

export async function createAnnouncementViaService(input: {
  title: string;
  content: string;
  type: string;
}) {
  const cfg = getServiceConfig();
  if (!cfg) {
    return null;
  }

  const response = await fetch(`${cfg.baseUrl}/announcements`, {
    method: "POST",
    headers: buildHeaders(cfg.token),
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Service request failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    data?: ServiceAnnouncement;
    announcement?: ServiceAnnouncement;
  };

  const item = payload.data ?? payload.announcement;
  if (!item) {
    throw new Error("Service response missing announcement payload");
  }

  return mapServiceAnnouncement(item);
}
