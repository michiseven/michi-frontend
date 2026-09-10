"use client";

import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { UserMenu } from "./user-menu";
import {
  Brand,
  BrandMark,
  CityLabel,
  Footer,
  Header,
  HeaderActions,
  HeaderInner,
  SkipLink,
} from "./styles/site-chrome.styles";

export function SiteHeader() {
  const { t } = useI18n();

  return (
    <>
      <SkipLink href="#main-content">{t.skipLink}</SkipLink>
      <Header>
        <HeaderInner>
          <Brand href="/" aria-label={`Michi ${t.brandSubtitle}`}>
            <BrandMark aria-hidden="true">M</BrandMark>
            <span>Michi</span>
          </Brand>
          <HeaderActions>
            <CityLabel>{t.cityLabel}</CityLabel>
            <LanguageSwitcher />
            <UserMenu />
          </HeaderActions>
        </HeaderInner>
      </Header>
    </>
  );
}

export function SiteFooter() {
  const { t } = useI18n();

  return (
    <Footer>
      <p>{t.footerText}</p>
    </Footer>
  );
}
