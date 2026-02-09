import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sanity Studio | BoardSource Dashboard",
  description: "Content management studio for BoardSource Dashboard",
};

export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
