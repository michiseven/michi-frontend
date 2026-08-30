"use client";

import { useI18n } from "@/lib/i18n";

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();

  return (
    <div className="language-switcher" role="group" aria-label="Language selection">
      <button
        type="button"
        className={`lang-btn${lang === "ja" ? " active" : ""}`}
        aria-pressed={lang === "ja"}
        onClick={() => setLang("ja")}
      >
        {t.langSwitchJa}
      </button>
      <span className="lang-divider" aria-hidden="true">/</span>
      <button
        type="button"
        className={`lang-btn${lang === "ko" ? " active" : ""}`}
        aria-pressed={lang === "ko"}
        onClick={() => setLang("ko")}
      >
        {t.langSwitchKo}
      </button>
    </div>
  );
}
