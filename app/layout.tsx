import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hallaton Church of England Primary School",
  description:
    "A warm welcome to Hallaton Church of England Primary School. Discover our school, our learning and how to get in touch.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
