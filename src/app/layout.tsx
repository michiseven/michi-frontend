import type { Metadata } from "next";
import Link from "next/link";
import { I18nProvider } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { UserMenu } from "@/components/user-menu";
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
          <a className="skip-link" href="#main-content">本文へ移動</a>
          <header className="site-header">
            <div className="header-inner">
              <Link className="brand" href="/" aria-label="Michi ホーム">
                <span className="brand-mark" aria-hidden="true">M</span>
                <span>Michi</span>
              </Link>
              <div className="header-actions">
                <span className="city-label">SEOUL ONLY</span>
                <LanguageSwitcher />
                <UserMenu />
              </div>
            </div>
          </header>
          {children}
          <footer className="site-footer">
            <p>실제 장소 데이터와 관광 지표에 근거한 설명 가능한 여행 동선 ・ 実在する場所データと条件にもとづく、説明できる旅程。</p>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
