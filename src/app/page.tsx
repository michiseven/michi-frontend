"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { EnvironmentBanner } from "@/components/environment-banner";
import { GenerativeChatPlanner } from "@/components/generative-chat-planner";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { isPlannerIntentId, type PlannerIntentId } from "@/lib/planner-intents";
import { PlannerPage, PlannerPageContent } from "@/components/styles/app-shell";

const subscribeToLocation = () => () => {};
function getIntentFromLocation(): PlannerIntentId | null {
  if (typeof window === "undefined") return null;
  const intent = new URLSearchParams(window.location.search).get("intent");
  return isPlannerIntentId(intent) ? intent : null;
}

export default function HomePage() {
  const { t } = useI18n();
  const router = useRouter();
  const user = useAuth();
  // A fixed URL id is the only permitted post-login handoff; server fallback
  // keeps the initial auth-gated render hydration-safe.
  const initialIntent = useSyncExternalStore(subscribeToLocation, getIntentFromLocation, () => null);

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
    <PlannerPage id="main-content">
      <PlannerPageContent>
        <div className="page-heading">
          <p className="eyebrow">{t.homeEyebrow}</p>
          <h1>{t.homeTitle}</h1>
          <p className="lede">{t.homeLede}</p>
        </div>
        <EnvironmentBanner />
        <GenerativeChatPlanner initialIntent={initialIntent} />
      </PlannerPageContent>
    </PlannerPage>
  );
}
