import type { Metadata } from "next";
import { AuthProvider } from "@/providers/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pleeb — Meme the Mess",
  description:
    "AI-powered video censoring tool. Replace swear words with bleep tones or random meme sounds. Fast, free, and funny.",
  keywords: ["bleep video", "censor video", "meme sounds", "swear word remover", "pleeb"],
  openGraph: {
    title: "Pleeb — Meme the Mess",
    description: "Automatically bleep or meme-replace swear words in any video.",
    type: "website",
  },
  icons: {
    icon: "/favicon.jpg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}