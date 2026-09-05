import type { Metadata } from "next";
import { AuthProvider } from "@/providers/AuthProvider";
import { ToastProvider } from "@/components/Toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pleeb — Meme the Mess | AI Video Auto-Censorship",
  description:
    "AI-powered video auto-censorship tool. Automatically bleep swear words or replace them with hilarious meme sound effects while keeping video audio in perfect sync.",
  keywords: [
    "bleep video",
    "censor video",
    "meme sounds",
    "swear word remover",
    "video auto censor",
    "whisper ai",
    "pleeb",
  ],
  openGraph: {
    title: "Pleeb — Meme the Mess",
    description: "Automatically bleep or meme-replace swear words in any video with AI precision.",
    type: "website",
  },
  icons: {
    icon: "/logo_as_of_now.jpg",
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
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}