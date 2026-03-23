export const ANNOUNCEMENT_TYPES = ["update", "news", "maintenance", "event"] as const;

export type AnnouncementType = (typeof ANNOUNCEMENT_TYPES)[number];

export type AnnouncementItem = {
  id: string | number;
  title: string;
  date: string;
  type: AnnouncementType;
  content: string;
};

export function normalizeAnnouncementType(value: string): AnnouncementType {
  if (ANNOUNCEMENT_TYPES.includes(value as AnnouncementType)) {
    return value as AnnouncementType;
  }
  return "update";
}
