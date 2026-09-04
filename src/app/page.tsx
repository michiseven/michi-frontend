"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { EnvironmentBanner } from "@/components/environment-banner";
import { MapPinIcon } from "@/components/icons";
import { GenerativeChatPlanner } from "@/components/generative-chat-planner";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function HomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useAuth();

  useEffect(() => {
    if (!user) router.replace("/auth");
  }, [router, user]);

  // A planner is a logged-in product surface. Do not briefly expose inputs or
  // a login-after-submit flow to unauthenticated visitors.
  if (!user) {
    return (
      <main className="page-shell auth-redirect-loading" id="main-content" role="status" aria-live="polite">
        <div className="page-narrow">
          <div className="auth-redirect-loading-card">
            <span className="spinner" aria-hidden="true" />
            <p>{t.authRedirectLoading}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell" id="main-content">
      <div className="page-wide">
        <div className="page-heading">
          <p className="eyebrow">{t.homeEyebrow}</p>
          <h1>{t.homeTitle}</h1>
          <p className="lede">{t.homeLede}</p>
          <div className="page-actions">
            <Link className="button button-secondary" href="/map-preview">
              <MapPinIcon aria-hidden="true" />
              {t.mapPreviewBtn}
            </Link>
          </div>
        </div>
        <EnvironmentBanner />
        <GenerativeChatPlanner />
      </div>
    </main>
  );
}
