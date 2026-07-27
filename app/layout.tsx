import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://game-of-talk.jessh.chatgpt.site"),
  title: "Game of Talk",
  description:
    "A private, microphone-driven cellular visualizer for talks. Your voice becomes climate, never content.",
  openGraph: {
    title: "Game of Talk",
    description:
      "Your voice becomes climate inside a living cellular field, never content.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1536,
        height: 1024,
        alt: "Game of Talk cellular field",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Game of Talk",
    description:
      "Your voice becomes climate inside a living cellular field, never content.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0d120e",
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
