"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { localizePlaceName } from "@/lib/place-localization";
import { patchTripStops } from "@/lib/api";
import type { Trip } from "@/lib/types";
import { PlaceCard } from "./place-card";
import { NaverMap } from "./naver-map";
import { SafetyConstraintSummary } from "./safety-constraint-summary";
import { AirportTransferCard } from "./airport-transfer-card";

interface GenerativeTripWidgetProps {
  trip: Trip;
  className?: string;
  style?: React.CSSProperties;
}

export function GenerativeTripWidget({ trip: initialTrip, className, style }: GenerativeTripWidgetProps) {
  const { lang } = useI18n();
  const [modifiedTrip, setModifiedTrip] = useState<Trip | null>(null);
  const showMap = true;
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trip = modifiedTrip && modifiedTrip.id === initialTrip.id ? modifiedTrip : initialTrip;
  // Airports are boundaries and never candidates in the compact itinerary.
  const legacyAirportStops = useMemo(
    () => (trip.stops || []).filter((stop) => stop.stopType === "airport"),
    [trip.stops],
  );
  const stops = useMemo(
    () => (trip.stops || []).filter((stop) => stop.stopType !== "airport"),
    [trip.stops],
  );
  const airportTransfers = trip.airportTransfers ?? [];
  const arrivalTransfers = airportTransfers.filter(
    (transfer) => transfer.role === "arrival",
  );
  const departureTransfers = airportTransfers.filter(
    (transfer) => transfer.role === "departure",
  );

  const mapStops = useMemo(
    () =>
      stops.map((stop) => ({
        id: stop.id,
        placeName: localizePlaceName(stop.placeName, lang),
        latitude: stop.latitude,
        longitude: stop.longitude,
      })),
    [stops, lang],
  );

  const selectedStopId = activeStopId ?? stops[0]?.id ?? null;

  const handleSwapPlace = async (stopId: string, newPlaceId: string) => {
    setBusy(true);
    try {
      const updated = await patchTripStops(trip.id, { action: "replace", stopId, newPlaceId });
      setModifiedTrip(updated);
    } catch (err) {
      console.error("Failed to swap place in widget", err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`generative-trip-card ${className || ""}`}
      style={{
        borderRadius: "16px",
        border: "1.5px solid #e2e8f0",
        backgroundColor: "#ffffff",
        overflow: "hidden",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)",
        ...style,
      }}
    >
      {/* The map is the fixed visual anchor for the itinerary. */}
      {showMap && stops.length > 0 && (
        <div id="generated-trip-map" className="generated-trip-map">
          <NaverMap
            stops={mapStops}
            activeStopId={selectedStopId}
            onSelectStop={(id: string) => setActiveStopId(id)}
          />
        </div>
      )}

      {/* Only the place details scroll. The map remains a separate visual anchor. */}
      <div className="generative-trip-details">
        <div style={{ padding: "12px 16px 0" }}>
          <SafetyConstraintSummary trip={trip} compact />
        </div>

        {/* Stops Timeline List */}
        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {arrivalTransfers.map((transfer) => (
          <AirportTransferCard key={`${transfer.role}-${transfer.date}-${transfer.airport.code}`} transfer={transfer} />
        ))}
        {legacyAirportStops.length > 0 && airportTransfers.length === 0 && (
          <p className="legacy-airport-notice" role="status" style={{ marginLeft: 0 }}>
            {lang === "ko"
              ? "이전 일정의 공항 정보는 이동 구간으로 표시할 수 없습니다. 공항 이동 시간은 직접 확인해 주세요."
              : "以前の旅程の空港情報は移動区間として表示できません。空港までの移動時間はご自身で確認してください。"}
          </p>
        )}
        {stops.map((stop, index) => stop.id === selectedStopId && (
          <PlaceCard
            key={stop.id || `${stop.placeId}-${index}`}
            stop={stop}
            index={index}
            count={stops.length}
            editable={false}
            busy={busy}
            isActive={stop.id === selectedStopId}
            tripId={trip.id}
            onFocusCard={() => setActiveStopId(stop.id)}
            navigation={
              stops.length > 1 ? (
                <nav className="place-carousel-controls" aria-label={lang === "ko" ? "장소 설명 이동" : "スポット説明の移動"}>
                  <button className="button button-secondary button-small" type="button" onClick={(event) => { event.stopPropagation(); setActiveStopId(stops[index - 1]?.id ?? stop.id); }} disabled={index === 0}>
                    {lang === "ko" ? "← 이전 장소" : "← 前のスポット"}
                  </button>
                  <span aria-live="polite">{index + 1} / {stops.length}</span>
                  <button className="button button-secondary button-small" type="button" onClick={(event) => { event.stopPropagation(); setActiveStopId(stops[index + 1]?.id ?? stop.id); }} disabled={index === stops.length - 1}>
                    {lang === "ko" ? "다음 장소 →" : "次のスポット →"}
                  </button>
                </nav>
              ) : null
            }
            onMove={() => {}}
            onRemove={() => {}}
            onViewed={() => {}}
            onSwapPlace={handleSwapPlace}
          />
        ))}
        {departureTransfers.map((transfer) => (
          <AirportTransferCard key={`${transfer.role}-${transfer.date}-${transfer.airport.code}`} transfer={transfer} />
        ))}
        </div>

        {/* Footer Link */}
        <div
        style={{
          padding: "12px 20px",
          backgroundColor: "#f8fafc",
          borderTop: "1px solid #e2e8f0",
          textAlign: "center",
        }}
        >
        <Link
          href={`/trips/${trip.id}`}
          className="button button-primary"
          style={{ display: "inline-block", width: "100%", textAlign: "center", textDecoration: "none" }}
        >
          {lang === "ko" ? "👉 전체 일정 상세 및 저장 페이지로 이동" : "👉 詳細プラン・保存画面へ移動"}
        </Link>
        </div>
      </div>
    </div>
  );
}
