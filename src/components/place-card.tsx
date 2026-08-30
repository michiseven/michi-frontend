"use client";

import { useState } from "react";
import type {
  ScoreBreakdown,
  StopAlternativeItem,
  TripStop,
} from "@/lib/types";
import { getStopAlternatives } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import {
  localizeCategory,
  localizePlaceName,
  localizePlaceText,
} from "@/lib/place-localization";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ExternalLinkIcon,
  TrashIcon,
} from "./icons";

interface PlaceCardProps {
  stop: TripStop;
  index: number;
  count: number;
  editable: boolean;
  busy: boolean;
  isActive?: boolean;
  tripId?: string;
  onFocusCard?: () => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onRemove: (stopId: string) => void;
  onViewed: (placeId: string) => void;
  onSwapPlace?: (stopId: string, newPlaceId: string) => Promise<void>;
}

function scorePercent(value: number) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

export function PlaceCard({
  stop,
  index,
  count,
  editable,
  busy,
  isActive = false,
  tripId,
  onFocusCard,
  onMove,
  onRemove,
  onViewed,
  onSwapPlace,
}: PlaceCardProps) {
  const { t, lang } = useI18n();
  const currency = new Intl.NumberFormat(lang === "ko" ? "ko-KR" : "ja-JP");
  const displayName = localizePlaceName(stop.placeName, lang);
  const displayCategory = localizeCategory(stop.category, lang);

  const scoreEntries = Object.entries(stop.scoreBreakdown).filter(
    (entry): entry is [keyof ScoreBreakdown, number] =>
      typeof entry[1] === "number",
  );

  const crowdScope =
    stop.crowd?.scope === "area" ? t.placeCrowdScopeArea : stop.crowd?.scope;

  const [showAlternatives, setShowAlternatives] = useState(false);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const [alternatives, setAlternatives] = useState<StopAlternativeItem[]>([]);
  const [swappingId, setSwappingId] = useState<string | null>(null);

  const handleToggleAlternatives = async () => {
    if (showAlternatives) {
      setShowAlternatives(false);
      return;
    }
    setShowAlternatives(true);
    if (tripId) {
      setLoadingAlternatives(true);
      try {
        const data = await getStopAlternatives(tripId, stop.id);
        setAlternatives(data.alternatives || []);
      } catch (err) {
        console.error("Failed to fetch alternatives", err);
      } finally {
        setLoadingAlternatives(false);
      }
    }
  };

  const handleSwap = async (newPlaceId: string) => {
    if (!onSwapPlace) return;
    setSwappingId(newPlaceId);
    try {
      await onSwapPlace(stop.id, newPlaceId);
      setShowAlternatives(false);
    } finally {
      setSwappingId(null);
    }
  };

  return (
    <article
      id={`stop-${stop.id}`}
      className={`place-card ${isActive ? "place-card-active" : ""}`}
      aria-labelledby={`stop-title-${stop.id}`}
      onClick={onFocusCard}
    >
      {stop.imageUrl && (
        <div className="place-image-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="place-image"
            src={stop.imageUrl}
            alt={displayName}
            width="800"
            height="350"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}
      <div className="place-body">
        <p className="place-kicker">
          {displayCategory || t.placeCategoryFallback}
        </p>
        <div className="place-title-line">
          <h3 id={`stop-title-${stop.id}`}>{displayName}</h3>
          <span className="place-order">
            {lang === "ko" ? `${index + 1}번째 장소` : `STOP ${index + 1}`}
          </span>
        </div>
        <div className="place-tags-row">
          {stop.stopType === "fixed_appointment" && (
            <span
              className="place-tag place-tag-fixed"
              style={{
                backgroundColor: "#f3e8ff",
                color: "#6b21a8",
                border: "1px solid #d8b4fe",
              }}
            >
              🟣 {t.stopTypeFixedAppt}
            </span>
          )}
          {stop.stopType === "must_visit" && (
            <span
              className="place-tag place-tag-must"
              style={{
                backgroundColor: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fde68a",
              }}
            >
              ⭐ {t.stopTypeMustVisit}
            </span>
          )}
          {stop.stopType === "meal" && (
            <span
              className="place-tag place-tag-meal"
              style={{
                backgroundColor: "#ffedd5",
                color: "#9a3412",
                border: "1px solid #fed7aa",
              }}
            >
              🍽️ {t.stopTypeMeal}
            </span>
          )}
          {stop.stopType === "airport" && (
            <span
              className="place-tag place-tag-airport"
              style={{
                backgroundColor: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fde68a",
                fontWeight: 700,
              }}
            >
              ✈️ {t.stopTypeAirport}
            </span>
          )}
          {stop.stopType === "basecamp" && (
            <span
              className="place-tag place-tag-basecamp"
              style={{
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
                border: "1px solid #bae6fd",
              }}
            >
              🏨 {t.stopTypeBasecamp}
            </span>
          )}
          {stop.stopType === "rain_fallback" && (
            <span
              className="place-tag place-tag-rain"
              style={{
                backgroundColor: "#e0e7ff",
                color: "#3730a3",
                border: "1px solid #c7d2fe",
              }}
            >
              ☔ {t.stopTypeRainFallback}
            </span>
          )}
          {stop.scoreBreakdown.localImpact != null &&
            stop.scoreBreakdown.localImpact >= 0.8 && (
              <span className="place-tag place-tag-local">
                🌟 {t.placeTagLocal}
              </span>
            )}
          {(stop.reason.includes("고정 앵커") ||
            stop.reason.includes("固定アンカー")) &&
            stop.stopType !== "fixed_appointment" && (
              <span className="place-tag place-tag-anchor">
                🎯 {t.placeTagAnchor}
              </span>
            )}
        </div>
        {stop.address && <p className="place-address">{stop.address}</p>}

        {stop.placeDescription && (
          <div
            className="place-description-evidence"
            style={{
              margin: "10px 0",
              padding: "10px 12px",
              border: "1px solid #d6e5df",
              borderRadius: 8,
              backgroundColor: "#f5faf7",
              fontSize: "0.9rem",
              lineHeight: 1.5,
            }}
          >
            <strong>{t.placeVerifiedDescriptionHeading}</strong>
            <p style={{ margin: "4px 0 7px" }}>{stop.placeDescription.text}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {stop.placeDescription.sources.slice(0, 2).map((source) => (
                <a
                  key={source.url}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  style={{ color: "#2563eb", fontSize: "0.78rem" }}
                >
                  {source.title || t.placeDescriptionSourceLink}
                  <ExternalLinkIcon
                    style={{ width: 11, height: 11, marginLeft: 3 }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {stop.explanation ? (
          <div
            className="place-explanation-section"
            style={{
              margin: "10px 0",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              fontSize: "0.92rem",
              lineHeight: 1.45,
            }}
          >
            <div className="explanation-item explanation-short">
              <span style={{ fontWeight: 600, color: "#374151" }}>
                {t.placeShortDescriptionHeading}:{" "}
              </span>
              <span>
                {localizePlaceText(stop.explanation.shortDescription, lang)}
              </span>
            </div>
            {stop.explanation.previousStopFit && (
              <div className="explanation-item explanation-prev">
                <span style={{ fontWeight: 600, color: "#4b5563" }}>
                  ↳ {t.placePrevStopFitHeading}:{" "}
                </span>
                <span>
                  {localizePlaceText(stop.explanation.previousStopFit, lang)}
                </span>
              </div>
            )}
            {stop.explanation.nextStopFit && (
              <div className="explanation-item explanation-next">
                <span style={{ fontWeight: 600, color: "#4b5563" }}>
                  → {t.placeNextStopFitHeading}:{" "}
                </span>
                <span>
                  {localizePlaceText(stop.explanation.nextStopFit, lang)}
                </span>
              </div>
            )}
            <div className="explanation-item explanation-overall">
              <span style={{ fontWeight: 600, color: "#1f2937" }}>
                ✨ {t.placeOverallTripFitHeading}:{" "}
              </span>
              <span>
                {localizePlaceText(stop.explanation.overallTripFit, lang)}
              </span>
            </div>
          </div>
        ) : (
          <p className="reason">
            <strong>{t.placeReasonHeading}</strong>
            <br />
            {localizePlaceText(stop.reason, lang)}
          </p>
        )}

        {stop.rainFallback && (
          <div
            className="rain-fallback-banner"
            style={{
              marginTop: 8,
              padding: "8px 12px",
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              fontSize: "0.85rem",
              color: "#166534",
            }}
          >
            <strong>☔ {t.placeRainFallbackHeading}:</strong>{" "}
            {localizePlaceName(stop.rainFallback.placeName, lang)}{" "}
            {stop.rainFallback.category
              ? `(${localizeCategory(stop.rainFallback.category, lang)})`
              : ""}
          </div>
        )}

        {stop.tourism && (
          <section
            className="tourism-evidence"
            aria-label={t.placeTourismEvidenceTitle}
          >
            <p className="tourism-evidence-title">
              {t.placeTourismEvidenceTitle}
            </p>
            <dl className="tourism-evidence-list">
              <div>
                <dt>{t.placeTourismConcentration}</dt>
                <dd>
                  {t.levels[stop.tourism.concentration.level]}
                  {stop.tourism.concentration.scope === "area"
                    ? t.placeTourismScopeArea(
                        stop.tourism.concentration.areaName,
                      )
                    : t.placeTourismScopePlace}
                </dd>
              </div>
              <div>
                <dt>{t.placeTourismLocalDiscovery}</dt>
                <dd>{t.levels[stop.tourism.localDiscovery.level]}</dd>
              </div>
            </dl>
            {stop.tourism.concentration.referencePeriod && (
              <p className="tourism-reference-period">
                {t.placeTourismRefPeriod(
                  stop.tourism.concentration.referencePeriod,
                )}
              </p>
            )}
            <p className="tourism-evidence-note">{t.placeTourismNote}</p>
          </section>
        )}

        <dl className="fact-list">
          <div className="fact">
            <dt>{t.placeFactStay}</dt>
            <dd>{t.placeFactStayUnit(stop.estimatedStayMinutes)}</dd>
          </div>
          <div className="fact">
            <dt>{t.placeFactCost}</dt>
            <dd>
              {stop.priceEvidence?.minPriceKrw != null &&
              stop.priceEvidence?.maxPriceKrw != null &&
              stop.priceEvidence.minPriceKrw !== stop.priceEvidence.maxPriceKrw
                ? t.placeFactCostRange(
                    currency.format(stop.priceEvidence.minPriceKrw),
                    currency.format(stop.priceEvidence.maxPriceKrw),
                  )
                : stop.estimatedCost == null
                  ? t.placeFactCostNoData
                  : stop.estimatedCost === 0
                    ? t.placeFactCostFree
                    : t.placeFactCostValue(currency.format(stop.estimatedCost))}
            </dd>
          </div>
          <div className="fact">
            <dt>{t.placeFactLeave}</dt>
            <dd>{stop.leaveAt}</dd>
          </div>
          <div className="fact">
            <dt>{t.placeFactScore}</dt>
            <dd>{scorePercent(stop.scoreBreakdown.total)}</dd>
          </div>
        </dl>

        {stop.priceEvidence && (
          <div
            className="place-price-evidence"
            style={{
              marginTop: "6px",
              padding: "6px 10px",
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "6px",
              fontSize: "0.82rem",
              color: "#475569",
              lineHeight: 1.4,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "4px",
            }}
          >
            <div>
              {stop.priceEvidence.representativeMenu ? (
                <span>
                  🏷️{" "}
                  <strong>
                    {t.placePriceEvidenceMenu(
                      stop.priceEvidence.representativeMenu,
                    )}
                  </strong>
                </span>
              ) : stop.priceEvidence.disclaimer ? (
                <span>
                  ℹ️{" "}
                  {t.placePriceEvidenceBenchmark(stop.priceEvidence.disclaimer)}
                  {stop.priceEvidence.referencePeriod && (
                    <small style={{ marginLeft: 4, color: "#64748b" }}>
                      {t.placePriceEvidenceRefPeriod(
                        stop.priceEvidence.referencePeriod,
                      )}
                    </small>
                  )}
                </span>
              ) : null}
            </div>
            {stop.priceEvidence.sourceUrl && (
              <a
                href={stop.priceEvidence.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                style={{
                  fontSize: "0.78rem",
                  color: "#2563eb",
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "2px",
                  fontWeight: 500,
                }}
              >
                <span>
                  {stop.priceEvidence.sourceTitle ||
                    t.placePriceEvidenceSourceLink}
                </span>
                <ExternalLinkIcon style={{ width: 11, height: 11 }} />
              </a>
            )}
          </div>
        )}

        <p className="crowd-note">
          <strong>{t.placeCrowdNoteHeading}</strong>
          {stop.crowd?.level ?? t.placeCrowdNoData}
          {crowdScope
            ? t.placeCrowdScopeSuffix(crowdScope, stop.crowd?.areaName)
            : ""}
          {stop.crowd?.scope === "area" && (
            <>
              <br />
              {t.placeCrowdNotInsideShop}
            </>
          )}
          {stop.crowd?.referenceDistanceMeters != null && (
            <>
              <br />
              {t.placeCrowdDistanceRef(
                stop.crowd.requestedAreaName ??
                  (lang === "ko" ? "희망 지역" : "希望エリア"),
                stop.crowd.referenceDistanceMeters.toLocaleString(
                  lang === "ko" ? "ko-KR" : "ja-JP",
                ),
              )}
            </>
          )}
        </p>

        {stop.placeDetailLink?.provider === "kakao-map" && (
          <div className="place-detail-action">
            <a
              className="button button-secondary button-small"
              href={stop.placeDetailLink.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t.placeDetailKakaoAria(displayName)}
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLinkIcon />
              {t.placeDetailKakao}
            </a>
            <p>{t.placeDetailExternalNote}</p>
          </div>
        )}

        <details
          className="score-details"
          onToggle={(event) => {
            if (event.currentTarget.open) onViewed(stop.placeId);
          }}
        >
          <summary>{t.placeScoreToggle}</summary>
          <div className="score-grid">
            {scoreEntries.map(([key, value]) => (
              <div className="score-row" key={key}>
                <span>{t.scores[key] ?? key}</span>
                <span>{scorePercent(value)}</span>
              </div>
            ))}
          </div>
        </details>

        {onSwapPlace && tripId && (
          <div
            style={{
              marginTop: "12px",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <button
              className="button button-secondary button-small"
              type="button"
              onClick={handleToggleAlternatives}
              disabled={busy}
              style={{
                backgroundColor: showAlternatives ? "#eff6ff" : "#f8fafc",
                borderColor: showAlternatives ? "#3b82f6" : "#cbd5e1",
                color: showAlternatives ? "#1d4ed8" : "#0f172a",
                fontWeight: 600,
                fontSize: "0.85rem",
                padding: "6px 12px",
                borderRadius: "8px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
              }}
            >
              🔄{" "}
              {showAlternatives
                ? t.placeActionAlternativesHide
                : t.placeActionAlternatives}
            </button>
          </div>
        )}

        {editable && (
          <div
            className="stop-actions"
            style={{ marginTop: "10px" }}
            aria-label={
              lang === "ko" ? `${displayName} 편집` : `${displayName}の編集`
            }
          >
            <button
              className="button button-secondary button-small"
              type="button"
              onClick={() => onMove(index, -1)}
              disabled={busy || index === 0}
              aria-label={
                lang === "ko"
                  ? `${displayName}을(를) 앞으로 이동`
                  : `${displayName}を一つ前へ`
              }
            >
              <ArrowUpIcon />
              {t.placeActionMovePrev}
            </button>
            <button
              className="button button-secondary button-small"
              type="button"
              onClick={() => onMove(index, 1)}
              disabled={busy || index === count - 1}
              aria-label={
                lang === "ko"
                  ? `${displayName}을(를) 뒤로 이동`
                  : `${displayName}を一つ後へ`
              }
            >
              <ArrowDownIcon />
              {t.placeActionMoveNext}
            </button>
            <button
              className="button button-danger button-small"
              type="button"
              onClick={() => onRemove(stop.id)}
              disabled={busy}
              aria-label={
                lang === "ko"
                  ? `${displayName}을(를) 일정에서 삭제`
                  : `${displayName}を旅程から削除`
              }
            >
              <TrashIcon />
              {t.placeActionRemove}
            </button>
          </div>
        )}

        {/* Alternatives Modal with Dimmed Dark Backdrop */}
        {showAlternatives && (
          <div
            className="alternatives-modal-backdrop"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0, 0, 0, 0.65)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAlternatives(false);
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`alt-modal-title-${stop.id}`}
          >
            <div
              className="alternatives-modal-container"
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "20px",
                width: "100%",
                maxWidth: "520px",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
                border: "1px solid #e2e8f0",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div
                style={{
                  padding: "18px 22px",
                  borderBottom: "1px solid #f1f5f9",
                  backgroundColor: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <h3
                    id={`alt-modal-title-${stop.id}`}
                    style={{
                      margin: 0,
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "#0f172a",
                    }}
                  >
                    🔄 {displayName} 대신 추천 후보
                  </h3>
                  <p
                    style={{
                      margin: "4px 0 0 0",
                      fontSize: "0.82rem",
                      color: "#64748b",
                    }}
                  >
                    {lang === "ko"
                      ? "현재 동선 및 주변 거리(도보 권역)와 어울리는 맞춤 장소입니다."
                      : "現在の動線や徒歩圏内にマッチするおすすめ候補です。"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAlternatives(false)}
                  style={{
                    border: "none",
                    background: "#e2e8f0",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    fontSize: "1rem",
                    color: "#475569",
                    fontWeight: 700,
                  }}
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div
                style={{
                  padding: "18px 22px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                }}
              >
                {loadingAlternatives ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "36px 0",
                      color: "#64748b",
                    }}
                  >
                    <div style={{ fontSize: "1.8rem", marginBottom: "10px" }}>
                      ⏳
                    </div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "0.95rem",
                        fontWeight: 500,
                      }}
                    >
                      {t.placeAlternativesLoading}
                    </p>
                  </div>
                ) : alternatives.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "36px 0",
                      color: "#64748b",
                    }}
                  >
                    <div style={{ fontSize: "1.8rem", marginBottom: "10px" }}>
                      ℹ️
                    </div>
                    <p style={{ margin: 0, fontSize: "0.95rem" }}>
                      {t.placeAlternativesEmpty}
                    </p>
                  </div>
                ) : (
                  alternatives.map((alt) => (
                    <div
                      key={alt.placeId}
                      style={{
                        padding: "16px",
                        backgroundColor: "#ffffff",
                        border: "1.5px solid #e2e8f0",
                        borderRadius: "14px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                      }}
                    >
                      {/* Name & Category */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            fontSize: "1.05rem",
                            color: "#0f172a",
                          }}
                        >
                          {localizePlaceName(alt.name, lang)}
                        </span>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            backgroundColor: "#f1f5f9",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            color: "#475569",
                            fontWeight: 500,
                          }}
                        >
                          {localizeCategory(alt.category, lang)}
                        </span>
                      </div>

                      {/* Distance & Price Info */}
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          flexWrap: "wrap",
                          fontSize: "0.85rem",
                        }}
                      >
                        {alt.priceEvidence?.minPriceKrw != null &&
                        alt.priceEvidence?.maxPriceKrw != null ? (
                          <span style={{ color: "#059669", fontWeight: 600 }}>
                            💰{" "}
                            {alt.priceEvidence.minPriceKrw ===
                            alt.priceEvidence.maxPriceKrw
                              ? alt.priceEvidence.minPriceKrw === 0
                                ? "무료"
                                : `${currency.format(alt.priceEvidence.minPriceKrw)}원`
                              : `${currency.format(alt.priceEvidence.minPriceKrw)} ~ ${currency.format(alt.priceEvidence.maxPriceKrw)}원`}
                          </span>
                        ) : alt.estimatedCost != null ? (
                          <span style={{ color: "#059669", fontWeight: 600 }}>
                            💰 {currency.format(alt.estimatedCost)}원
                          </span>
                        ) : null}
                        {alt.distanceMeters != null && (
                          <span style={{ color: "#2563eb", fontWeight: 500 }}>
                            📍{" "}
                            {lang === "ko"
                              ? `도보 약 ${Math.max(1, Math.round(alt.distanceMeters / 70))}분 (${alt.distanceMeters}m)`
                              : `徒歩約${Math.max(1, Math.round(alt.distanceMeters / 70))}分 (${alt.distanceMeters}m)`}
                          </span>
                        )}
                      </div>

                      {/* Rich Description Box (설명) */}
                      {(() => {
                        const altDesc =
                          alt.description ||
                          alt.reason ||
                          (lang === "ko"
                            ? `${localizePlaceName(alt.name, lang)}은(는) ${displayName} 인근${alt.distanceMeters ? `(도보 약 ${Math.max(1, Math.round(alt.distanceMeters / 70))}분)` : ""}에 위치한 ${localizeCategory(alt.category, lang)} 명소로, 일정의 흐름과 취향에 잘 어울리는 추천 대안입니다.`
                            : `${localizePlaceName(alt.name, lang)}は${displayName}の近く${alt.distanceMeters ? `(徒歩約${Math.max(1, Math.round(alt.distanceMeters / 70))}分)` : ""}にある人気の${localizeCategory(alt.category, lang)}スポットで、現在の旅程と好みに適したおすすめの代替候補です。`);

                        return (
                          <div
                            style={{
                              backgroundColor: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: "10px",
                              padding: "12px 14px",
                              fontSize: "0.88rem",
                              color: "#334155",
                              lineHeight: 1.55,
                            }}
                          >
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#0369a1",
                                marginBottom: "4px",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                fontSize: "0.86rem",
                              }}
                            >
                              <span>💡</span>
                              <span>
                                {lang === "ko"
                                  ? "장소 소개 및 추천 이유"
                                  : "スポット紹介・おすすめ理由"}
                              </span>
                            </div>
                            <p style={{ margin: 0, color: "#1e293b" }}>
                              {localizePlaceText(altDesc, lang)}
                            </p>
                          </div>
                        );
                      })()}

                      {/* Swap Action Button */}
                      <button
                        className="button button-primary"
                        type="button"
                        onClick={() => handleSwap(alt.placeId)}
                        disabled={busy || swappingId !== null}
                        style={{
                          marginTop: "4px",
                          width: "100%",
                          padding: "10px 16px",
                          fontSize: "0.92rem",
                          fontWeight: 600,
                          borderRadius: "10px",
                          backgroundColor: "#0284c7",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        {swappingId === alt.placeId
                          ? t.placeAlternativesSwapping
                          : `✨ ${t.placeAlternativesSwapBtn}`}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Modal Footer */}
              <div
                style={{
                  padding: "12px 22px",
                  borderTop: "1px solid #f1f5f9",
                  backgroundColor: "#f8fafc",
                  display: "flex",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  className="button button-secondary button-small"
                  type="button"
                  onClick={() => setShowAlternatives(false)}
                >
                  {lang === "ko" ? "닫기" : "閉じる"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
