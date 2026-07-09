import type { Metadata, Viewport } from "next";
import { M_PLUS_Rounded_1c, Zen_Kaku_Gothic_New } from "next/font/google";
import CustomCursor from "@/components/ui/CustomCursor";
import "./globals.css";

// Japanese-capable fonts for the anime/school direction.
// preload:false lets next/font ship every subset (Latin + JP glyphs).
const displayFont = Zen_Kaku_Gothic_New({
  weight: ["500", "700", "900"],
  preload: false,
  variable: "--font-display",
});

const bodyFont = M_PLUS_Rounded_1c({
  weight: ["400", "500", "700"],
  preload: false,
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Alice — Rhythm Game",
  description:
    "Jeu de rythme musical en navigateur. Upload ta musique, choisis 2K ou 4K, garde le rythme.",
};

export const viewport: Viewport = {
  themeColor: "#0e0a1f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="min-h-screen bg-abyss font-body text-slate-200 antialiased">
        <CustomCursor />
        {children}
      </body>
    </html>
  );
}
