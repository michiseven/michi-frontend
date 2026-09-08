"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { patchTripStops, saveUserTrip } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { localizePlaceName, localizePlaceText } from "@/lib/place-localization";
import { createNaverWalkingRouteUrl } from "@/lib/naver-map-app";
import { saveRecentTrip } from "@/lib/storage";
import { captureMichiEvent } from "@/lib/telemetry";
import type { Trip } from "@/lib/types";
import { AuthModal } from "./auth-modal";
import { AirportTransferCard } from "./airport-transfer-card";
import { NaverMap } from "./naver-map";
import { PlaceCard } from "./place-card";
import { ProviderStatus } from "./provider-status";
import { SafetyConstraintSummary } from "./safety-constraint-summary";
import { TripConstraintSummary } from "./trip-constraint-summary";
import {
  BookmarkIcon,
  CheckIcon,
  MapIcon,
  RefreshIcon,
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
  const [savingTrip, setSavingTrip] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Airport transfers are trip boundaries. Old saved trips may still contain
  // airport stops, but they must never become ordinary venues in this view.
  const airportTransfers = trip.airportTransfers ?? [];
  const legacyAirportStops = trip.stops.filter((stop) => stop.stopType === "airport");
  const regularStops = trip.stops.filter((stop) => stop.stopType !== "airport");

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
        stopsCount: regularStops.length,
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
    new Set(regularStops.map((s) => s.dayNumber ?? 1)),
  ).sort((a, b) => a - b);
  const [selectedDay, setSelectedDay] = useState<number | "all">(
    distinctDays.length > 1 ? 1 : "all",
  );

  const filteredStops =
    selectedDay === "all"
      ? regularStops
      : regularStops.filter((s) => (s.dayNumber ?? 1) === selectedDay);

  const selectedDayDate =
    selectedDay === "all"
      ? null
      : regularStops.find((stop) => (stop.dayNumber ?? 1) === selectedDay)
          ?.dayDate ?? null;
  const filteredAirportTransfers =
    selectedDay === "all"
      ? airportTransfers
      : airportTransfers.filter(
          (transfer) =>
            transfer.date === selectedDayDate ||
            (!selectedDayDate && selectedDay === 1 && transfer.date === trip.date),
        );
  const arrivalTransfers = filteredAirportTransfers.filter(
    (transfer) => transfer.role === "arrival",
  );
  const departureTransfers = filteredAirportTransfers.filter(
    (transfer) => transfer.role === "departure",
  );

  const mapStops = filteredStops.map((stop) => ({
    id: stop.id,
    placeName: localizePlaceName(stop.placeName, lang),
    latitude: stop.latitude,
    longitude: stop.longitude,
  }));

  const currency = new Intl.NumberFormat(lang === "ko" ? "ko-KR" : "ja-JP");

  const stopDates = regularStops
    .map((s) => s.dayDate)
    .filter((d): d is string => Boolean(d));
  const allDates = Array.from(
    new Set([trip.date, ...stopDates, ...airportTransfers.map((transfer) => transfer.date)]),
  )
    .filter(Boolean)
    .sort();
  const dateDisplay =
    allDates.length > 1
      ? `${allDates[0]} ~ ${allDates[allDates.length - 1]}`
      : allDates[0] || t.tripMetaDateUnspecified;

  const dispersionScores = regularStops
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

  const localCount = regularStops.filter(
    (s) =>
      s.scoreBreakdown.localImpact != null &&
      s.scoreBreakdown.localImpact >= 0.8,
  ).length;
  const localShare =
    regularStops.length > 0 && localCount > 0
      ? Math.round((localCount / regularStops.length) * 100)
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
              context: { stopCount: regularStops.length },
    });
  }

  function completeRoute() {
    setRouteStatus("completed");
    captureMichiEvent("route_completed", {
      tripId: trip.id,
      context: { stopCount: regularStops.length },
    });
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

  function openNaverWalkingRoute() {
    const routeUrl = createNaverWalkingRouteUrl(
      mapStops,
      typeof window === "undefined" ? "michi" : window.location.origin,
    );
    if (!routeUrl) {
      setActionError(
        lang === "ko"
          ? "네이버 지도 앱은 한 번에 2~7개 장소의 도보 길찾기를 지원합니다. 하루 일정을 나눠 열어주세요."
          : "NAVERマップは一度に2〜7か所の徒歩ルートに対応しています。1日の旅程を分けて開いてください。",
      );
      return;
    }
    window.location.assign(routeUrl);
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

      <SafetyConstraintSummary trip={trip} />
      <TripConstraintSummary trip={trip} />

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
            const firstStop = regularStops.find(
              (s) => (s.dayNumber ?? 1) === dayNum,
            );
            const count = regularStops.filter(
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

      {(regularStops.length > 0 || airportTransfers.length > 0 || legacyAirportStops.length > 0) && (
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
          <p className="trip-share-pending" role="status">{t.tripShareUnavailable}</p>
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
          {filteredStops.length >= 2 && (
            <button
              className="button button-secondary"
              type="button"
              onClick={openNaverWalkingRoute}
              aria-describedby="naver-map-app-note"
            >
              {lang === "ko" ? "네이버 지도에서 도보 길찾기" : "NAVERマップで徒歩ルート"}
            </button>
          )}
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

      {regularStops.length === 0 && airportTransfers.length === 0 && legacyAirportStops.length === 0 ? (
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
          {showMap && filteredStops.length > 0 && (
            <div className="map-panel">
              <NaverMap
                stops={mapStops}
                activeStopId={activeStopId}
                onSelectStop={handleSelectStop}
              />
              <p className="map-note">{t.tripMapNote}</p>
              <p className="map-note" id="naver-map-app-note">
                {lang === "ko"
                  ? "도보 길찾기는 네이버 지도 앱에서 확인합니다. 앱이 설치되어 있어야 합니다."
                  : "徒歩ルートはNAVERマップアプリで確認します。アプリのインストールが必要です。"}
              </p>
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

            {arrivalTransfers.map((transfer) => (
              <AirportTransferCard key={`${transfer.role}-${transfer.date}-${transfer.airport.code}`} transfer={transfer} />
            ))}
            {legacyAirportStops.length > 0 && airportTransfers.length === 0 && (
              <p className="legacy-airport-notice" role="status">
                {lang === "ko"
                  ? "이전 일정의 공항 정보는 이동 구간으로 표시할 수 없습니다. 공항 이동 시간은 직접 확인해 주세요."
                  : "以前の旅程の空港情報は移動区間として表示できません。空港までの移動時間はご自身で確認してください。"}
              </p>
            )}
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
                        editable={editable && legacyAirportStops.length === 0}
                        busy={busy}
                        isActive={activeStopId === stop.id}
                        tripId={trip.id}
                        onFocusCard={() => setActiveStopId(stop.id)}
                        onMove={move}
                        onRemove={(stopId) => {
                          const removedStop = regularStops.find(
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
            {departureTransfers.map((transfer) => (
              <AirportTransferCard key={`${transfer.role}-${transfer.date}-${transfer.airport.code}`} transfer={transfer} />
            ))}
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
