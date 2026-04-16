import { AnnouncementItem, normalizeAnnouncementType } from "@/lib/announcement";

type ServiceAnnouncement = {
  id: string | number;
  title: string;
  content: string;
  type: string;
  created_at?: string;
  date?: string;
};

// --------------- JSONBin backend ---------------

function getJsonBinConfig() {
  const binId = process.env.JSONBIN_BIN_ID?.trim();
  const masterKey = process.env.JSONBIN_MASTER_KEY?.trim();
  if (!binId || !masterKey) return null;
  return { binId, masterKey };
}

async function jsonBinRead(): Promise<ServiceAnnouncement[] | null> {
  const cfg = getJsonBinConfig();
  if (!cfg) return null;

  const res = await fetch(`https://api.jsonbin.io/v3/b/${cfg.binId}/latest`, {
    headers: { "X-Master-Key": cfg.masterKey },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const payload = await res.json();
  const record = payload?.record ?? payload;
  return record?.announcements ?? [];
}

async function jsonBinWrite(announcements: ServiceAnnouncement[]): Promise<boolean> {
  const cfg = getJsonBinConfig();
  if (!cfg) return false;

  const res = await fetch(`https://api.jsonbin.io/v3/b/${cfg.binId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Master-Key": cfg.masterKey,
    },
    body: JSON.stringify({ announcements }),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(`[jsonBinWrite] PUT failed: ${res.status} ${text}`);
  }
  return res.ok;
}

// --------------- Generic HTTP backend ---------------

function getServiceConfig() {
  const baseUrl = process.env.ANNOUNCEMENT_DATA_SERVICE_URL?.trim();
  const token = process.env.ANNOUNCEMENT_DATA_SERVICE_TOKEN?.trim();
  if (!baseUrl) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), token };
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

// --------------- Public API ---------------

export async function fetchAnnouncementsFromService(): Promise<AnnouncementItem[] | null> {
  // Priority 1: JSONBin
  const jbRows = await jsonBinRead();
  if (jbRows && jbRows.length > 0) {
    return jbRows.map(mapServiceAnnouncement);
  }

  // Priority 2: Generic HTTP service
  const cfg = getServiceConfig();
  if (!cfg) return null;

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
}): Promise<AnnouncementItem | null> {
  // Priority 1: JSONBin – read-modify-write
  const jbCfg = getJsonBinConfig();
  if (jbCfg) {
    const existing = (await jsonBinRead()) ?? [];
    const newItem: ServiceAnnouncement = {
      id: String(Date.now()),
      title: input.title,
      content: input.content,
      type: input.type,
      date: new Date().toISOString().slice(0, 10),
    };
    existing.unshift(newItem);
    const ok = await jsonBinWrite(existing);
    if (!ok) throw new Error("Failed to write to JSONBin");
    return mapServiceAnnouncement(newItem);
  }

  // Priority 2: Generic HTTP service
  const cfg = getServiceConfig();
  if (!cfg) return null;

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
  if (!item) throw new Error("Service response missing announcement payload");
  return mapServiceAnnouncement(item);
}

export async function deleteAnnouncementViaService(id: string | number): Promise<boolean> {
  // JSONBin: read-modify-write
  const jbCfg = getJsonBinConfig();
  if (jbCfg) {
    const existing = (await jsonBinRead()) ?? [];
    const filtered = existing.filter((a) => String(a.id) !== String(id));
    if (filtered.length === existing.length) return false;
    return jsonBinWrite(filtered);
  }
  return false;
}
