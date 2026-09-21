import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "JNMulee News",
  description: "Independent digital news and current affairs.",
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