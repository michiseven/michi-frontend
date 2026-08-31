"use client";

import Link from "next/link";
import { useState } from "react";
import { EnvironmentBanner } from "@/components/environment-banner";
import { MapPinIcon } from "@/components/icons";
import { PlannerForm } from "@/components/planner-form";
import { GenerativeChatPlanner } from "@/components/generative-chat-planner";
import { TripView } from "@/components/trip-view";
import { generateTrip } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { captureMichiEvent } from "@/lib/telemetry";
import type { GenerateTripInput, Trip } from "@/lib/types";

export default function HomePage() {
  const { t } = useI18n();
  const [plannerMode, setPlannerMode] = useState<"chat" | "form">("form");
  const [trip, setTrip] = useState<Trip>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(input: GenerateTripInput) {
    setLoading(true);
    setError(undefined);
    setTrip(undefined);
    captureMichiEvent("trip_requested", {
      context: {
        hasDate: Boolean(input.travelDate),
        hasTimeWindow: Boolean(input.startTime && input.endTime),
        hasBudget: input.budget !== undefined,
        hasStartArea: Boolean(input.startArea),
      },
    });
    try {
      const result = await generateTrip(input);
      setTrip(result);
      captureMichiEvent("trip_generated", {
        tripId: result.id,
        context: {
          stopCount: result.stops.length,
          usesMockProvider: Object.values(result.providerModes).some((mode) => mode === "mock"),
        },
      });
      window.setTimeout(() => document.querySelector(".trip-result")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.tripGenerateError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell" id="main-content">
      <div className={plannerMode === "chat" ? "page-wide" : "page-narrow"}>
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
        {error && <div className="status-banner error" role="alert"><strong>{t.tripGenerateError}</strong><span>{error}</span></div>}

        {/* Planner Mode Switcher Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "20px",
            padding: "4px",
            backgroundColor: "#f1f5f9",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
          }}
        >
          <button
            type="button"
            onClick={() => setPlannerMode("chat")}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: plannerMode === "chat" ? "#ffffff" : "transparent",
              color: plannerMode === "chat" ? "#1e293b" : "#64748b",
              fontWeight: plannerMode === "chat" ? 700 : 500,
              fontSize: "0.95rem",
              cursor: "pointer",
              boxShadow: plannerMode === "chat" ? "0 2px 6px rgba(0, 0, 0, 0.06)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            {t.tabChatPlanner}
          </button>
          <button
            type="button"
            onClick={() => setPlannerMode("form")}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: plannerMode === "form" ? "#ffffff" : "transparent",
              color: plannerMode === "form" ? "#1e293b" : "#64748b",
              fontWeight: plannerMode === "form" ? 700 : 500,
              fontSize: "0.95rem",
              cursor: "pointer",
              boxShadow: plannerMode === "form" ? "0 2px 6px rgba(0, 0, 0, 0.06)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            {t.tabFormPlanner}
          </button>
        </div>

        {/* Mode Content */}
        {plannerMode === "chat" ? (
          <GenerativeChatPlanner />
        ) : (
          <PlannerForm loading={loading} onSubmit={handleSubmit} />
        )}
      </div>

      {plannerMode === "form" && loading && (
        <div className="page-narrow trip-result loading-state" role="status" aria-label={t.tripGenerating}>
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-card" />
          <p>{t.tripGeneratingDesc}</p>
        </div>
      )}
      {plannerMode === "form" && trip && !loading && (
        <TripView key={trip.id} initialTrip={trip} editable showDetailLink />
      )}
    </main>
  );
}
