import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Routines Timer Builder",
  description: "Build timer routines and import them to your watch",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
