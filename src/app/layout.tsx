import type { Metadata } from "next";
import { AppProviders } from "@/components/AppProviders";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Campus Notifications",
  description: "Real-time campus notification dashboard"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

