import type { Metadata } from "next";
import { Source_Serif_4, Space_Grotesk } from "next/font/google";

import { getSessionUser } from "@/lib/auth";

import { SiteShell } from "@/components/site-shell";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RoadWatch",
  description:
    "Public road and footpath intelligence platform for anonymous observations, repair history, and civic transparency.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${sourceSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full font-[family:var(--font-body)]">
        <SiteShell
          user={
            user
              ? {
                  name: user.name,
                  role: user.role,
                }
              : null
          }
        >
          {children}
        </SiteShell>
      </body>
    </html>
  );
}
