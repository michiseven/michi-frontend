import type { Metadata } from "next";
import { I18nProvider } from "@/lib/i18n";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "Michi — AI Itinerary Planner",
  description: "好みと条件から、実在するソウルの場所で理由のわかる旅程をつくります。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <I18nProvider>
          <SiteHeader />
          {children}
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
