import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Packet Prep | Networking Final Reviewer",
  description:
    "A playful, self-paced networking finals reviewer with casual and serious quiz modes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
