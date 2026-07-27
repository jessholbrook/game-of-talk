import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://game-of-talk.jessh.chatgpt.site"),
  title: "Vox Automata",
  description:
    "A private, speech-responsive cellular visualizer for talks. Everything stays on your device.",
  openGraph: {
    title: "Vox Automata",
    description:
      "Your words shape a local cellular environment. Nothing is transcribed, recorded, or sent anywhere.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1536,
        height: 1024,
        alt: "Vox Automata cellular field",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vox Automata",
    description:
      "Your words shape a local cellular environment. Nothing is transcribed, recorded, or sent anywhere.",
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
