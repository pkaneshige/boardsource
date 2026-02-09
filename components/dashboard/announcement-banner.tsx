import { sanityFetch } from "@/lib/cms";
import type { Announcement } from "@/types";

export interface AnnouncementBannerProps {
  className?: string;
}

const typeStyles: Record<Announcement["type"], string> = {
  info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200",
  warning:
    "bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-200",
  error:
    "bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-200",
};

const typeIcons: Record<Announcement["type"], React.ReactNode> = {
  info: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
        clipRule="evenodd"
      />
    </svg>
  ),
  warning: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
        clipRule="evenodd"
      />
    </svg>
  ),
  error: (
    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  ),
};

async function getActiveAnnouncements(): Promise<Announcement[]> {
  const query = `*[_type == "announcement" && active == true] | order(_createdAt desc) {
    _id,
    _type,
    title,
    message,
    type,
    active
  }`;
  return sanityFetch<Announcement[]>(query);
}

export async function AnnouncementBanner({ className }: AnnouncementBannerProps) {
  const announcements = await getActiveAnnouncements();

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {announcements.map((announcement) => (
        <div
          key={announcement._id}
          className={`flex items-start gap-3 border-b p-4 ${typeStyles[announcement.type]}`}
          role="alert"
        >
          <div className="flex-shrink-0">{typeIcons[announcement.type]}</div>
          <div className="flex-1">
            <h3 className="font-medium">{announcement.title}</h3>
            <p className="mt-1 text-sm opacity-90">{announcement.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
