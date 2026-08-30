"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { localizePlaceName } from "@/lib/place-localization";
import { patchTripStops } from "@/lib/api";
import type { Trip } from "@/lib/types";
import { PlaceCard } from "./place-card";
import { NaverMap } from "./naver-map";
import { MapIcon } from "./icons";

interface GenerativeTripWidgetProps {
  trip: Trip;
  className?: string;
  style?: React.CSSProperties;
}

export function GenerativeTripWidget({ trip: initialTrip, className, style }: GenerativeTripWidgetProps) {
  const { t, lang } = useI18n();
  const [modifiedTrip, setModifiedTrip] = useState<Trip | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const trip = modifiedTrip && modifiedTrip.id === initialTrip.id ? modifiedTrip : initialTrip;
  const stops = useMemo(() => trip.stops || [], [trip.stops]);
  const areaName = (trip.preference as { area?: string })?.area || "서울";
  const currency = new Intl.NumberFormat(lang === "ko" ? "ko-KR" : "ja-JP");

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

  const knownCostSum = useMemo(
    () => stops.reduce((sum, s) => sum + (s.estimatedCost ?? 0), 0),
    [stops],
  );
  const unpricedStopsCount = useMemo(
    () => stops.filter((s) => s.estimatedCost == null).length,
    [stops],
  );

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
      {/* Header Banner */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          color: "#ffffff",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        <div>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: "#38bdf8",
              textTransform: "uppercase",
            }}
          >
            ✨ AI GENERATED ITINERARY
          </span>
          <h3 style={{ margin: "2px 0 0", fontSize: "1.2rem", fontWeight: 700 }}>
            {areaName} {lang === "ko" ? "맞춤 여행 동선" : "おすすめルート"}
          </h3>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            📍 {stops.length} {lang === "ko" ? "개 장소" : "スポット"}
          </span>
          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            style={{
              background: "transparent",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "#ffffff",
              borderRadius: "8px",
              padding: "4px 8px",
              fontSize: "0.8rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <MapIcon style={{ width: 14, height: 14 }} />
            {showMap ? (lang === "ko" ? "지도 접기" : "地図非表示") : (lang === "ko" ? "지도 보기" : "地図表示")}
          </button>
        </div>
      </div>

      {/* Total Cost Bar */}
      <div
        style={{
          backgroundColor: "#f8fafc",
          borderBottom: "1px solid #e2e8f0",
          padding: "10px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "8px",
          fontSize: "0.9rem",
        }}
      >
        <span style={{ color: "#64748b", fontWeight: 500 }}>
          💰 {trip.estimatedTotalCost != null ? (lang === "ko" ? "예상 총비용 (1인 기준)" : "予想合計費用 (1人基準)") : (lang === "ko" ? "확인된 예상 비용" : "確認済み予想費用")}{" "}
          <span style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
            {trip.estimatedTotalCost != null
              ? t.totalBudgetMaxNote
              : unpricedStopsCount > 0
                ? (lang === "ko" ? `(일부 ${unpricedStopsCount}개 장소 가격 미기재 / 현장 확인)` : `(一部${unpricedStopsCount}ヶ所現地確認)`)
                : ""}
          </span>
        </span>
        <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "1.05rem" }}>
          {trip.estimatedTotalCost != null ? (
            <>
              {currency.format(trip.estimatedTotalCost)} {lang === "ko" ? "원" : "ウォン"}
              <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "#64748b", marginLeft: "6px" }}>
                (約 {currency.format(Math.round(trip.estimatedTotalCost * 0.11))}円)
              </span>
            </>
          ) : knownCostSum > 0 ? (
            <>
              {lang === "ko" ? `최소 ${currency.format(knownCostSum)}원 ~` : `最低 ${currency.format(knownCostSum)}ウォン〜`}
              <span style={{ fontSize: "0.82rem", fontWeight: 500, color: "#64748b", marginLeft: "6px" }}>
                (約 {currency.format(Math.round(knownCostSum * 0.11))}円〜)
              </span>
            </>
          ) : (
            <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#64748b" }}>
              {lang === "ko" ? "일부 장소 상세/현장 확인" : "詳細・現地確認"}
            </span>
          )}
        </span>
      </div>

      {/* Mini Interactive Map */}
      {showMap && stops.length > 0 && (
        <div style={{ height: "240px", borderBottom: "1px solid #e2e8f0" }}>
          <NaverMap
            stops={mapStops}
            activeStopId={activeStopId}
            onSelectStop={(id: string) => setActiveStopId(id)}
          />
        </div>
      )}

      {/* Stops Timeline List */}
      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {stops.map((stop, index) => (
          <PlaceCard
            key={stop.id || `${stop.placeId}-${index}`}
            stop={stop}
            index={index}
            count={stops.length}
            editable={true}
            busy={busy}
            isActive={stop.id === activeStopId}
            tripId={trip.id}
            onFocusCard={() => setActiveStopId(stop.id)}
            onMove={() => {}}
            onRemove={() => {}}
            onViewed={() => {}}
            onSwapPlace={handleSwapPlace}
          />
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
  );
}
