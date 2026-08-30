"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { patchTripStops, saveUserTrip } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { localizePlaceName, localizePlaceText } from "@/lib/place-localization";
import { saveRecentTrip } from "@/lib/storage";
import { captureMichiEvent } from "@/lib/telemetry";
import type { Trip } from "@/lib/types";
import { AuthModal } from "./auth-modal";
import { NaverMap } from "./naver-map";
import { PlaceCard } from "./place-card";
import { ProviderStatus } from "./provider-status";
import {
  BookmarkIcon,
  CheckIcon,
  MapIcon,
  RefreshIcon,
  ShareIcon,
} from "./icons";

interface TripViewProps {
  initialTrip: Trip;
  editable?: boolean;
  showDetailLink?: boolean;
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function TripView({
  initialTrip,
  editable = false,
  showDetailLink = false,
}: TripViewProps) {
  const { t, lang } = useI18n();
  const [modifiedTrip, setModifiedTrip] = useState<Trip | null>(null);
  const trip = modifiedTrip && modifiedTrip.id === initialTrip.id ? modifiedTrip : initialTrip;
  const [busy, setBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState<string>();
  const [actionError, setActionError] = useState<string>();
  const [routeStatus, setRouteStatus] = useState<
    "idle" | "started" | "completed"
  >("idle");
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [shareToast, setShareToast] = useState<string | null>(null);
  const [savingTrip, setSavingTrip] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (trip?.id) {
      saveRecentTrip(trip);
    }
  }, [trip]);

  async function handleSaveTrip() {
    if (!isAuthenticated()) {
      setAuthModalOpen(true);
      return;
    }
    setSavingTrip(true);
    setSaveError(null);
    try {
      await saveUserTrip({
        tripId: trip.id,
        title:
          trip.title ||
          (lang === "ko" ? "서울 하루 여행 일정" : "ソウル一日旅プラン"),
        travelDate: trip.date,
        stopsCount: trip.stops.length,
        estimatedTotalCost: trip.estimatedTotalCost,
        tripSnapshot: trip,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t.authSaveFailed;
      setSaveError(msg || t.authSaveFailed);
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setSavingTrip(false);
    }
  }

  const distinctDays = Array.from(
    new Set(trip.stops.map((s) => s.dayNumber ?? 1)),
  ).sort((a, b) => a - b);
  const [selectedDay, setSelectedDay] = useState<number | "all">(
    distinctDays.length > 1 ? 1 : "all",
  );

  const filteredStops =
    selectedDay === "all"
      ? trip.stops
      : trip.stops.filter((s) => (s.dayNumber ?? 1) === selectedDay);

  const mapStops = useMemo(
    () =>
      filteredStops.map((stop) => ({
        id: stop.id,
        placeName: localizePlaceName(stop.placeName, lang),
        latitude: stop.latitude,
        longitude: stop.longitude,
      })),
    [filteredStops, lang],
  );

  const currency = new Intl.NumberFormat(lang === "ko" ? "ko-KR" : "ja-JP");

  const stopDates = trip.stops
    .map((s) => s.dayDate)
    .filter((d): d is string => Boolean(d));
  const allDates = Array.from(new Set([trip.date, ...stopDates]))
    .filter(Boolean)
    .sort();
  const dateDisplay =
    allDates.length > 1
      ? `${allDates[0]} ~ ${allDates[allDates.length - 1]}`
      : allDates[0] || t.tripMetaDateUnspecified;

  const dispersionScores = trip.stops
    .map((s) => s.scoreBreakdown.tourismDispersion)
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  const avgDispersion =
    dispersionScores.length > 0
      ? Math.round(
          (dispersionScores.reduce((sum, val) => sum + val, 0) /
            dispersionScores.length) *
            100,
        )
      : null;

  const localCount = trip.stops.filter(
    (s) =>
      s.scoreBreakdown.localImpact != null &&
      s.scoreBreakdown.localImpact >= 0.8,
  ).length;
  const localShare =
    trip.stops.length > 0 && localCount > 0
      ? Math.round((localCount / trip.stops.length) * 100)
      : null;

  // Timeline totals
  const totalStayMinutes = filteredStops.reduce(
    (sum, s) => sum + (s.estimatedStayMinutes || 60),
    0,
  );
  const totalTransitMinutes = filteredStops.reduce(
    (sum, s) => sum + (s.inboundRoute?.durationMinutes || 0),
    0,
  );
  const totalTransitKm = filteredStops.reduce(
    (sum, s) => sum + (s.inboundRoute?.distanceKm || 0),
    0,
  );
  const totalTripMinutes = totalStayMinutes + totalTransitMinutes;
  const totalHours = Math.floor(totalTripMinutes / 60);
  const remainingMins = totalTripMinutes % 60;

  async function mutate(
    label: string,
    operation: Parameters<typeof patchTripStops>[1],
    onSuccess?: () => void,
  ) {
    setBusy(true);
    setActionError(undefined);
    setActionMessage(
      lang === "ko" ? `${label} 중입니다…` : `${label}しています…`,
    );
    try {
      const updated = await patchTripStops(trip.id, operation);
      setModifiedTrip(updated);
      setActionMessage(
        lang === "ko" ? `${label} 완료되었습니다.` : `${label}しました。`,
      );
      onSuccess?.();
    } catch (error) {
      setActionMessage(undefined);
      setActionError(
        error instanceof Error
          ? error.message
          : lang === "ko"
            ? "일정을 업데이트하지 못했습니다."
            : "旅程を更新できませんでした。",
      );
    } finally {
      setBusy(false);
    }
  }

  function move(filteredIndex: number, direction: -1 | 1) {
    const stopToMove = filteredStops[filteredIndex];
    if (!stopToMove) return;
    const targetStop = filteredStops[filteredIndex + direction];
    if (!targetStop) return;

    const globalIndexA = trip.stops.findIndex((s) => s.id === stopToMove.id);
    const globalIndexB = trip.stops.findIndex((s) => s.id === targetStop.id);
    if (globalIndexA < 0 || globalIndexB < 0) return;

    const reordered = [...trip.stops];
    [reordered[globalIndexA], reordered[globalIndexB]] = [
      reordered[globalIndexB],
      reordered[globalIndexA],
    ];
    const actionName = lang === "ko" ? "순서를 변경" : "順番を更新";
    void mutate(
      actionName,
      { action: "reorder", stopIds: reordered.map((stop) => stop.id) },
      () => {
        captureMichiEvent("place_reordered", {
          tripId: trip.id,
          placeId: stopToMove.placeId,
          context: { fromOrder: stopToMove.order, toOrder: targetStop.order },
        });
      },
    );
  }

  function startRoute() {
    setRouteStatus("started");
    captureMichiEvent("route_started", {
      tripId: trip.id,
      context: { stopCount: trip.stops.length },
    });
  }

  function completeRoute() {
    setRouteStatus("completed");
    captureMichiEvent("route_completed", {
      tripId: trip.id,
      context: { stopCount: trip.stops.length },
    });
  }

  async function handleShare() {
    const title =
      trip.title ||
      (lang === "ko" ? "서울 하루 여행 일정" : "ソウル一日旅プラン");
    const text = t.tripShareText(title);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const isMichiPath =
      typeof window !== "undefined" &&
      window.location.pathname.startsWith("/michi");
    const basePath = isMichiPath ? "/michi" : "";
    const url = origin ? `${origin}${basePath}/trips/${trip.id}` : "";
    const nav =
      typeof window !== "undefined"
        ? window.navigator
        : typeof navigator !== "undefined"
          ? navigator
          : undefined;

    let shared = false;
    if (nav && typeof nav.share === "function") {
      try {
        await nav.share({ title: t.tripShareTitle(title), text, url });
        shared = true;
      } catch {
        // User cancelled or share failed, fallback to clipboard
      }
    }

    const clipboard =
      nav?.clipboard ??
      (typeof navigator !== "undefined" ? navigator.clipboard : undefined);
    if (!shared && clipboard && typeof clipboard.writeText === "function") {
      try {
        await clipboard.writeText(url);
        shared = true;
      } catch {
        // Ignore clipboard failure
      }
    }

    if (shared) {
      setShareToast(t.tripShareSuccess);
      setTimeout(() => setShareToast(null), 3000);
    }
  }

  function handleSelectStop(stopId: string) {
    setActiveStopId(stopId);
    if (typeof document !== "undefined") {
      const element = document.getElementById(`stop-${stopId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }

  return (
    <section className="trip-shell" aria-labelledby="trip-title">
      <header className="trip-header">
        <div className="trip-header-main">
          <p className="trip-eyebrow">ITINERARY</p>
          <h1 id="trip-title">
            {trip.title ||
              (lang === "ko" ? "서울 하루 여행 일정" : "ソウル一日旅プラン")}
          </h1>
          <div className="trip-meta-row">
            <span>📅 {dateDisplay}</span>
            <span>📍 {trip.preference?.area || t.tripMetaAreaSeoul}</span>
            <span>
              💰{" "}
              {trip.estimatedTotalCost
                ? `${currency.format(trip.estimatedTotalCost)}원`
                : t.tripMetaBudgetUnspecified}
            </span>
            {dispersionScores.length > 0 && (
              <span>🌿 {t.tripMetaDispersion(avgDispersion)}</span>
            )}
            {localShare != null && (
              <span>🌟 {t.tripMetaLocalShare(localShare)}</span>
            )}
          </div>
        </div>
        {showDetailLink && (
          <Link className="button button-secondary" href={`/trips/${trip.id}`}>
            {t.tripDetailLink}
          </Link>
        )}
      </header>

      <ProviderStatus
        modes={trip.providerModes}
        sources={trip.providerSources}
      />

      {trip.explanation && (
        <article
          className="trip-summary-card"
          aria-labelledby="trip-summary-heading"
        >
          <div className="trip-summary-badge-row">
            <span className="trip-summary-kicker">AI ITINERARY SUMMARY</span>
            <span className="trip-summary-lang">
              {trip.explanation.locale === "ko" ? "한국어" : "日本語"}
            </span>
            {trip.providerModes?.explanation === "fallback" && (
              <span className="trip-summary-badge trip-summary-badge-fallback">
                {t.tripSummaryBadgeFallback}
              </span>
            )}
          </div>
          <h2 id="trip-summary-heading" className="trip-summary-title">
            {t.tripSummaryHeading}
          </h2>
          <p className="trip-summary-text">
            {localizePlaceText(trip.explanation.tripSummary, lang)}
          </p>
        </article>
      )}

      {trip.warnings.map((warning, index) => (
        <div
          className="status-banner warning"
          role="status"
          key={`${warning}-${index}`}
        >
          <strong>{lang === "ko" ? "주의" : "注意"}</strong>
          <span>{warning}</span>
        </div>
      ))}

      {distinctDays.length > 1 && (
        <div className="day-tabs" role="tablist" aria-label="일자별 선택">
          <button
            className={`day-tab-btn ${selectedDay === "all" ? "active" : ""}`}
            type="button"
            role="tab"
            aria-selected={selectedDay === "all"}
            onClick={() => setSelectedDay("all")}
          >
            {t.tripDayTabAll}
          </button>
          {distinctDays.map((dayNum) => {
            const firstStop = trip.stops.find(
              (s) => (s.dayNumber ?? 1) === dayNum,
            );
            const count = trip.stops.filter(
              (s) => (s.dayNumber ?? 1) === dayNum,
            ).length;
            return (
              <button
                key={dayNum}
                className={`day-tab-btn ${selectedDay === dayNum ? "active" : ""}`}
                type="button"
                role="tab"
                aria-selected={selectedDay === dayNum}
                onClick={() => setSelectedDay(dayNum)}
              >
                {t.tripDayTabLabel(dayNum, firstStop?.dayDate, count)}
              </button>
            );
          })}
        </div>
      )}

      {trip.stops.length > 0 && (
        <div className="trip-toolbar">
          {editable && (
            <button
              className="button button-primary"
              type="button"
              onClick={() =>
                void mutate(lang === "ko" ? "일정 재계산" : "旅程を再計算", {
                  action: "recalculate",
                })
              }
              disabled={busy}
            >
              {busy ? (
                <span className="spinner" aria-hidden="true" />
              ) : (
                <RefreshIcon />
              )}
              {t.tripBtnRecalculate}
            </button>
          )}
          <button
            className="button button-secondary"
            type="button"
            onClick={handleShare}
            aria-label={t.tripBtnShare}
          >
            <ShareIcon />
            {t.tripBtnShare}
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={handleSaveTrip}
            disabled={savingTrip}
            aria-label={t.authSaveTripBtn}
          >
            {savingTrip ? (
              <span className="spinner" aria-hidden="true" />
            ) : saveSuccess ? (
              <>
                <CheckIcon />
                {t.authTripSaved}
              </>
            ) : (
              <>
                <BookmarkIcon />
                {t.authSaveTripBtn}
              </>
            )}
          </button>
          <button
            className="button button-secondary map-toggle-btn"
            type="button"
            onClick={() => setShowMap((prev) => !prev)}
            aria-label={t.tripMapToggle}
          >
            <MapIcon />
            {showMap ? t.tripMapHide : t.tripMapShow}
          </button>
          {editable && routeStatus === "idle" && (
            <button
              className="button button-secondary"
              type="button"
              onClick={startRoute}
            >
              {t.tripBtnStartRoute}
            </button>
          )}
          {editable && routeStatus === "started" && (
            <button
              className="button button-secondary"
              type="button"
              onClick={completeRoute}
            >
              {t.tripBtnCompleteRoute}
            </button>
          )}
          {editable && routeStatus === "completed" && (
            <span className="route-complete" role="status">
              {t.tripStatusCompleted}
            </span>
          )}
          <Link className="button button-secondary" href="/">
            {t.tripBtnNewTrip}
          </Link>
        </div>
      )}

      {shareToast && (
        <div className="share-toast" role="status">
          ✓ {shareToast}
        </div>
      )}

      {saveError && (
        <div className="status-banner error" role="alert">
          <strong>{lang === "ko" ? "저장 실패" : "保存失敗"}</strong>
          <span>{saveError}</span>
        </div>
      )}

      <div className="inline-action-status" aria-live="polite">
        {actionMessage}
      </div>
      {actionError && (
        <div className="status-banner error" role="alert">
          <strong>{lang === "ko" ? "업데이트 실패" : "更新失敗"}</strong>
          <span>{actionError}</span>
        </div>
      )}

      {trip.stops.length === 0 ? (
        <div className="empty-state">
          <h2>{t.tripEmptyTitle}</h2>
          <p>{t.tripEmptyDesc}</p>
          <Link
            className="button button-primary"
            style={{ marginTop: 18 }}
            href="/"
          >
            {t.tripBtnBackToPlanner}
          </Link>
        </div>
      ) : (
        <div className="trip-layout">
          {showMap && (
            <div className="map-panel">
              <NaverMap
                stops={mapStops}
                activeStopId={activeStopId}
                onSelectStop={handleSelectStop}
              />
              <p className="map-note">{t.tripMapNote}</p>
            </div>
          )}
          <div className="timeline-panel">
            <div
              className="timeline-summary-bar"
              aria-label={t.tripTimelineSummary}
            >
              <span className="timeline-summary-chip timeline-summary-chip-accent">
                ⏱️ {t.tripTotalDuration(totalHours, remainingMins)}
              </span>
              <span className="timeline-summary-chip">
                📍 {t.tripStopsCount(filteredStops.length)}
              </span>
              {totalTransitKm > 0 && (
                <span className="timeline-summary-chip">
                  🚶 {t.tripTotalDistance(totalTransitKm)}
                </span>
              )}
              {avgDispersion != null && (
                <span className="timeline-summary-chip">
                  🌿 {t.tripMetaDispersion(avgDispersion)}
                </span>
              )}
              {localShare != null && (
                <span className="timeline-summary-chip">
                  🌟 {t.tripMetaLocalShare(localShare)}
                </span>
              )}
            </div>

            <ol className="timeline" aria-label={t.tripTimelineLabel}>
              {filteredStops.map((stop, index) => {
                const prevStop =
                  index > 0 ? filteredStops[index - 1] : undefined;
                let legInfo:
                  | {
                      minutes: number;
                      distanceStr: string;
                      evidence:
                        "measured" | "mixed" | "estimated" | "unavailable";
                      transportMode: "walk" | "car" | "subway" | "bus";
                      subwayDetails?: {
                        departureStation: string;
                        arrivalStation: string;
                        fareKrw: number | null;
                        transferCount: number;
                        accessWalkMinutes: number;
                        egressWalkMinutes: number;
                      } | null;
                    }
                  | undefined;

                if (prevStop) {
                  const fallbackMeters = haversineMeters(
                    prevStop.latitude,
                    prevStop.longitude,
                    stop.latitude,
                    stop.longitude,
                  );
                  const meters =
                    stop.inboundRoute?.distanceKm != null
                      ? Math.round(stop.inboundRoute.distanceKm * 1000)
                      : fallbackMeters;
                  const distStr =
                    meters >= 1000
                      ? `${(meters / 1000).toFixed(1)}km`
                      : `${meters}m`;
                  const [prevH, prevM] = prevStop.leaveAt
                    .split(":")
                    .map(Number);
                  const [nextH, nextM] = stop.arrivalAt.split(":").map(Number);
                  let diffMins =
                    (nextH || 0) * 60 +
                    (nextM || 0) -
                    ((prevH || 0) * 60 + (prevM || 0));
                  if (diffMins <= 0 || isNaN(diffMins)) {
                    diffMins = Math.max(3, Math.round(meters / 70));
                  }

                  const inbound = stop.inboundRoute;
                  legInfo = {
                    minutes: inbound?.durationMinutes ?? diffMins,
                    distanceStr: distStr,
                    evidence: inbound?.evidence ?? "estimated",
                    transportMode: inbound?.transportMode ?? "walk",
                    subwayDetails: inbound?.subwayDetails
                      ? {
                          departureStation:
                            inbound.subwayDetails.departureStation,
                          arrivalStation: inbound.subwayDetails.arrivalStation,
                          fareKrw: inbound.subwayDetails.fareKrw,
                          transferCount: inbound.subwayDetails.transferCount,
                          accessWalkMinutes:
                            inbound.subwayDetails.accessWalkMinutes,
                          egressWalkMinutes:
                            inbound.subwayDetails.egressWalkMinutes,
                        }
                      : null,
                  };
                }

                return (
                  <li className="timeline-item-wrap" key={stop.id}>
                    {legInfo && (
                      <div className="timeline-connector">
                        <div className="timeline-connector-badge">
                          {legInfo.transportMode === "subway" &&
                          legInfo.subwayDetails ? (
                            <div className="flex flex-col gap-0.5">
                              <span>
                                {t.timelineLegSubway(
                                  legInfo.minutes,
                                  legInfo.distanceStr,
                                  legInfo.subwayDetails.departureStation,
                                  legInfo.subwayDetails.arrivalStation,
                                  legInfo.subwayDetails.transferCount,
                                  legInfo.subwayDetails.fareKrw,
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground opacity-80">
                                {t.timelineLegSubwayWalkNote(
                                  legInfo.subwayDetails.accessWalkMinutes,
                                  legInfo.subwayDetails.egressWalkMinutes,
                                )}
                              </span>
                            </div>
                          ) : legInfo.transportMode === "bus" ? (
                            <div className="flex flex-col gap-0.5">
                              <span>
                                {t.timelineLegBus(
                                  legInfo.minutes,
                                  legInfo.distanceStr,
                                )}
                              </span>
                              <span className="text-xs text-muted-foreground opacity-80">
                                {t.timelineLegBusNote}
                              </span>
                            </div>
                          ) : legInfo.evidence === "measured" &&
                            legInfo.transportMode === "car" ? (
                            <span>
                              {t.timelineLegMeasuredCar(
                                legInfo.minutes,
                                legInfo.distanceStr,
                              )}
                            </span>
                          ) : (
                            <span>
                              {t.timelineLegWalk(
                                legInfo.minutes,
                                legInfo.distanceStr,
                              )}
                            </span>
                          )}

                          {stop.accessibility?.status === "checked" && (
                            <span className="mt-0.5 block text-xs">
                              {" · "}
                              {stop.accessibility.risk === "none-detected"
                                ? t.timelineAccessibilityClear
                                : t.timelineAccessibilityRisk}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="timeline-item">
                      <time className="timeline-time">{stop.arrivalAt}</time>
                      <span className="timeline-rail" aria-hidden="true">
                        <span className="timeline-dot" />
                      </span>
                      <PlaceCard
                        stop={stop}
                        index={index}
                        count={filteredStops.length}
                        editable={editable}
                        busy={busy}
                        isActive={activeStopId === stop.id}
                        tripId={trip.id}
                        onFocusCard={() => setActiveStopId(stop.id)}
                        onMove={move}
                        onRemove={(stopId) => {
                          const removedStop = trip.stops.find(
                            (candidate) => candidate.id === stopId,
                          );
                          const actionLabel =
                            lang === "ko" ? "장소 삭제" : "場所を削除";
                          void mutate(
                            actionLabel,
                            { action: "remove", stopId },
                            () => {
                              if (!removedStop) return;
                              captureMichiEvent("place_removed", {
                                tripId: trip.id,
                                placeId: removedStop.placeId,
                                context: { previousOrder: removedStop.order },
                              });
                            },
                          );
                        }}
                        onSwapPlace={async (stopId, newPlaceId) => {
                          const actionLabel =
                            lang === "ko" ? "장소 교체" : "場所を変更";
                          await mutate(
                            actionLabel,
                            { action: "replace", stopId, newPlaceId },
                            () => {
                              captureMichiEvent("place_added", {
                                tripId: trip.id,
                                placeId: newPlaceId,
                                context: { stopId, action: "swap" },
                              });
                            },
                          );
                        }}
                        onViewed={(placeId) =>
                          captureMichiEvent("place_viewed", {
                            tripId: trip.id,
                            placeId,
                          })
                        }
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => void handleSaveTrip()}
      />
    </section>
  );
}
