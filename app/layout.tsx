import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MarketMood — what X thinks about any stock",
  description:
    "Type a ticker or topic and get the mood of the latest posts on X, plus an AI analyst report.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
