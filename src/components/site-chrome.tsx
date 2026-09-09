"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  const { t } = useI18n();

  return (
    <>
      <a className="skip-link" href="#main-content">{t.skipLink}</a>
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label={`Michi ${t.brandSubtitle}`}>
            <span className="brand-mark" aria-hidden="true">M</span>
            <span>Michi</span>
          </Link>
          <div className="header-actions">
            <span className="city-label">{t.cityLabel}</span>
            <LanguageSwitcher />
            <UserMenu />
          </div>
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <footer className="site-footer">
      <p>{t.footerText}</p>
    </footer>
  );
}
