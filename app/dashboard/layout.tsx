import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { AnnouncementBanner } from "@/components/dashboard/announcement-banner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950">
      {/* Sidebar - hidden on mobile, visible on lg screens */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with mobile menu */}
        <Header />

        {/* Announcements banner */}
        <AnnouncementBanner />

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
