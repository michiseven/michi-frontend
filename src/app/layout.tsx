import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { AppProviders } from "@/components/app-providers";
import { GlobalStyle } from "@/components/styles/app-shell";
import { StyledComponentsRegistry } from "@/lib/styled-components-registry";
import "./globals.css";

export const metadata: Metadata = {
  title: "Michi — AI Itinerary Planner",
  description: "好みと条件から、実在するソウルの場所で理由のわかる旅程をつくります。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>
        <StyledComponentsRegistry>
          <GlobalStyle />
          <AppProviders>
            <SiteHeader />
            {children}
            <SiteFooter />
          </AppProviders>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
