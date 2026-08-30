"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { searchHotels } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { SearchHotelItem } from "@/lib/types";
import { NaverMap, type MapStop } from "./naver-map";

interface HotelSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (hotel: SearchHotelItem) => void;
  initialQuery?: string;
}

const QUICK_TAGS = [
  { label: "신라스테이 공덕", query: "신라스테이 공덕" },
  { label: "롯데호텔 서울(명동)", query: "롯데호텔 서울" },
  { label: "서울신라호텔", query: "서울신라호텔" },
  { label: "나인트리 명동", query: "나인트리 명동" },
  { label: "L7 홍대", query: "L7 홍대" },
  { label: "웨스틴 조선 서울", query: "웨스틴 조선 서울" },
];

const DEFAULT_HOTELS: SearchHotelItem[] = [
  {
    name: "롯데호텔 서울 (명동)",
    roadAddress: "서울특별시 중구 을지로 30",
    address: "서울특별시 중구 소공동 1",
    category: "숙박>호텔",
    latitude: 37.5658,
    longitude: 126.9812,
  },
  {
    name: "서울신라호텔",
    roadAddress: "서울특별시 중구 동호로 249",
    address: "서울특별시 중구 장충동2가 202",
    category: "숙박>호텔",
    latitude: 37.5562,
    longitude: 127.0051,
  },
  {
    name: "신라스테이 공덕",
    roadAddress: "서울특별시 마포구 마포대로 83",
    address: "서울특별시 마포구 도화동 25-13",
    category: "숙박>호텔",
    latitude: 37.5422,
    longitude: 126.9511,
  },
  {
    name: "나인트리 프리미어 호텔 명동",
    roadAddress: "서울특별시 중구 명동길 61",
    address: "서울특별시 중구 명동2가 83-5",
    category: "숙박>호텔",
    latitude: 37.5638,
    longitude: 126.9858,
  },
  {
    name: "L7 홍대 바이 롯데",
    roadAddress: "서울특별시 마포구 양화로 141",
    address: "서울특별시 마포구 동교동 160-5",
    category: "숙박>호텔",
    latitude: 37.5552,
    longitude: 126.9228,
  },
  {
    name: "웨스틴 조선 서울",
    roadAddress: "서울특별시 중구 소공로 106",
    address: "서울특별시 중구 소공동 87",
    category: "숙박>호텔",
    latitude: 37.5645,
    longitude: 126.9798,
  },
];

export function HotelSearchModal({
  isOpen,
  onClose,
  onSelect,
  initialQuery = "",
}: HotelSearchModalProps) {
  const { lang, t } = useI18n();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchHotelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeHotelId, setActiveHotelId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      setQuery(initialQuery);
      setResults([]);
      setHasSearched(false);
      setActiveHotelId(null);
      inputRef.current?.focus();
      if (initialQuery.trim().length >= 2) {
        executeSearch(initialQuery.trim());
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [isOpen, initialQuery]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  async function executeSearch(searchTarget: string) {
    if (!searchTarget.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const items = await searchHotels(searchTarget.trim());
      setResults(items);
      if (items.length > 0) {
        setActiveHotelId("hotel-0");
      } else {
        setActiveHotelId(null);
      }
    } catch {
      setResults([]);
      setActiveHotelId(null);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    executeSearch(query);
  }

  function handleTagClick(tagQuery: string) {
    setQuery(tagQuery);
    executeSearch(tagQuery);
  }

  const displayedHotels = hasSearched ? results : DEFAULT_HOTELS;

  const mapStops: MapStop[] = useMemo(() => {
    return displayedHotels
      .filter((h) => h.latitude && h.longitude)
      .map((h, idx) => ({
        id: `hotel-${idx}`,
        placeName: h.name,
        latitude: h.latitude!,
        longitude: h.longitude!,
      }));
  }, [displayedHotels]);

  function handleSelectMapStop(stopId: string) {
    const idx = parseInt(stopId.replace("hotel-", ""), 10);
    if (!Number.isNaN(idx) && displayedHotels[idx]) {
      setActiveHotelId(stopId);
      onSelect(displayedHotels[idx]);
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hotel-search-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "860px",
          backgroundColor: "#ffffff",
          borderRadius: "20px",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
          overflow: "hidden",
          border: "1.5px solid #e2e8f0",
          animation: "modalFadeIn 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 22px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#f8fafc",
          }}
        >
          <div>
            <h2
              id="hotel-search-title"
              style={{
                fontSize: "17px",
                fontWeight: 700,
                color: "#0f172a",
                margin: 0,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>🏨</span> {t.hotelSearchModalTitle}
            </h2>
            <p style={{ fontSize: "12px", color: "#64748b", margin: "4px 0 0" }}>
              {lang === "ko"
                ? "숙소를 검색하거나 지도에서 위치를 직접 확인하고 선택하세요."
                : "宿泊先を検索、または地図で位置を確認して選択してください。"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "20px",
              cursor: "pointer",
              color: "#94a3b8",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
            aria-label={t.hotelSearchCloseBtn}
          >
            ✕
          </button>
        </div>

        {/* Modal Body: Split Layout (Left: Search & List / Right: Interactive Naver Map) */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flex: 1,
            minHeight: "440px",
            maxHeight: "calc(90vh - 80px)",
            overflow: "hidden",
          }}
          className="hotel-modal-split"
        >
          {/* Left Column: Search & Results */}
          <div
            style={{
              width: "380px",
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid #e2e8f0",
              backgroundColor: "#ffffff",
            }}
            className="hotel-modal-left"
          >
            {/* Search Input Box */}
            <div style={{ padding: "14px 16px 10px" }}>
              <form onSubmit={handleSubmit} style={{ display: "flex", gap: "6px" }}>
                <input
                  ref={inputRef}
                  className="input"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.hotelSearchInputPlaceholder}
                  style={{ flex: 1, height: "42px", fontSize: "13.5px" }}
                />
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={loading || !query.trim()}
                  style={{ height: "42px", padding: "0 16px", whiteSpace: "nowrap", fontSize: "13px" }}
                >
                  {loading ? (
                    <span className="spinner" style={{ width: 14, height: 14 }} aria-hidden="true" />
                  ) : (
                    t.hotelSearchBtn
                  )}
                </button>
              </form>

              {/* Quick Tags */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "4px",
                  marginTop: "8px",
                }}
              >
                {QUICK_TAGS.map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => handleTagClick(tag.query)}
                    style={{
                      fontSize: "11px",
                      padding: "3px 7px",
                      backgroundColor: "#f1f5f9",
                      color: "#334155",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 500,
                    }}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results List */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "8px 16px 16px",
              }}
            >
              {loading && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "180px",
                    gap: "10px",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  <span className="spinner" style={{ width: 22, height: 22 }} aria-hidden="true" />
                  <p>{t.hotelSearchSearching}</p>
                </div>
              )}

              {!loading && hasSearched && results.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "36px 16px",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  <div style={{ fontSize: "26px", marginBottom: "6px" }}>🔍</div>
                  <p style={{ fontWeight: 700, color: "#334155" }}>{t.hotelSearchNoResults}</p>
                  <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                    {lang === "ko"
                      ? "다른 호텔명(예: 롯데호텔, 신라호텔, 나인트리)이나 지역명으로 검색해 보세요."
                      : "別のホテル名やエリア名で検索してください。"}
                  </p>
                </div>
              )}

              {!loading && !hasSearched && (
                <div style={{ marginBottom: "8px" }}>
                  <div style={{ fontSize: "11.5px", fontWeight: 700, color: "#64748b", marginBottom: "6px" }}>
                    ⭐ {lang === "ko" ? "서울 대표 인기 호텔 (선택 또는 검색)" : "ソウルの人気ホテル（選択または検索）"}
                  </div>
                </div>
              )}

              {!loading && displayedHotels.length > 0 && (!hasSearched || results.length > 0) && (
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                  {displayedHotels.map((hotel, idx) => {
                    const stopId = `hotel-${idx}`;
                    const isSelected = activeHotelId === stopId;

                    return (
                      <li
                        key={`${hotel.name}-${idx}`}
                        onClick={() => {
                          onSelect(hotel);
                          onClose();
                        }}
                        onMouseEnter={() => setActiveHotelId(stopId)}
                        style={{
                          padding: "10px 12px",
                          borderRadius: "10px",
                          border: isSelected ? "1.5px solid #2563eb" : "1px solid #e2e8f0",
                          backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "13px",
                              fontWeight: 700,
                              color: isSelected ? "#1d4ed8" : "#0f172a",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <span>🏨</span>
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {hotel.name}
                            </span>
                          </div>
                          {hotel.roadAddress && (
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#64748b",
                                marginTop: "3px",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              📍 {hotel.roadAddress}
                            </div>
                          )}
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            color: isSelected ? "#ffffff" : "#2563eb",
                            backgroundColor: isSelected ? "#2563eb" : "#dbeafe",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {lang === "ko" ? "선택" : "選択"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Right Column: Naver Map View (showPolyline={false} so hotels are not connected by lines) */}
          <div
            style={{
              flex: 1,
              minWidth: "320px",
              height: "100%",
              position: "relative",
              backgroundColor: "#f8fafc",
            }}
            className="hotel-modal-right"
          >
            <NaverMap
              stops={mapStops}
              activeStopId={activeHotelId}
              onSelectStop={handleSelectMapStop}
              showPolyline={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
