"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import type { TripStop } from "@/lib/types";
import { MapPinIcon } from "./icons";

declare global {
  interface Window {
    navermap_authFailure?: () => void;
    naver?: {
      maps: {
        Map: new (
          element: HTMLElement,
          options: Record<string, unknown>,
        ) => {
          fitBounds: (bounds: unknown, margin?: unknown) => void;
          panTo: (point: unknown) => void;
          setCenter: (point: unknown) => void;
        };
        LatLng: new (latitude: number, longitude: number) => unknown;
        LatLngBounds: new () => { extend: (point: unknown) => void };
        Point: new (x: number, y: number) => unknown;
        Marker: new (options: Record<string, unknown>) => {
          setIcon: (icon: Record<string, unknown>) => void;
          setZIndex: (zIndex: number) => void;
          setMap: (map: unknown) => void;
        };
        Polyline: new (options: Record<string, unknown>) => {
          setMap: (map: unknown) => void;
        };
        Position?: Record<string, number>;
        ZoomControlStyle?: Record<string, number>;
        Event: {
          addListener: (target: unknown, eventName: string, listener: () => void) => unknown;
        };
      };
    };
  }
}

export type MapStop = Pick<TripStop, "id" | "placeName" | "latitude" | "longitude">;

export interface NaverMapProps {
  stops: MapStop[];
  activeStopId?: string | null;
  onSelectStop?: (stopId: string) => void;
  showPolyline?: boolean;
}

const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

function getMarkerIcon(index: number, isActive: boolean, maps: NonNullable<Window["naver"]>["maps"]) {
  const bg = isActive ? "#d97706" : "#0f6253";
  const size = isActive ? 36 : 30;
  const shadow = isActive ? "0 4px 14px rgba(217,119,6,.5)" : "0 2px 8px rgba(0,0,0,.25)";
  const border = isActive ? "3px solid #ffffff" : "2px solid #ffffff";
  const font = isActive ? "800 15px sans-serif" : "700 13px sans-serif";

  return {
    content: `<div style="display:grid;place-items:center;width:${size}px;height:${size}px;border:${border};border-radius:50%;background:${bg};color:#ffffff;font:${font};box-shadow:${shadow};cursor:pointer;transition:transform 0.15s ease-out;transform:${isActive ? "scale(1.15)" : "scale(1)"}">${index + 1}</div>`,
    anchor: new maps.Point(size / 2, size / 2),
  };
}

function CoordinateFallback({
  stops,
  activeStopId,
  onSelectStop,
  message,
  title,
  ariaLabel,
}: NaverMapProps & { message: string; title: string; ariaLabel: string }) {
  return (
    <div className="map-fallback" role="region" aria-label={ariaLabel}>
      <div>
        <h3>
          <MapPinIcon style={{ display: "inline", marginRight: 7, verticalAlign: -3 }} />
          {title}
        </h3>
        <p className="map-note">{message}</p>
      </div>
      <ol className="coordinate-list">
        {stops.map((stop, index) => {
          const isActive = stop.id === activeStopId;
          return (
            <li
              className={`coordinate-item ${isActive ? "coordinate-item-active" : ""}`}
              key={stop.id}
              onClick={() => onSelectStop?.(stop.id)}
              style={{ cursor: onSelectStop ? "pointer" : "default" }}
              tabIndex={onSelectStop ? 0 : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectStop?.(stop.id);
                }
              }}
            >
              <span className={`marker-index ${isActive ? "marker-index-active" : ""}`}>{index + 1}</span>
              <span>
                <strong>{stop.placeName}</strong>
                <br />
                <small>
                  {stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}
                </small>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface MapInstanceHolder {
  map: InstanceType<NonNullable<Window["naver"]>["maps"]["Map"]>;
  markers: Map<
    string,
    {
      marker: InstanceType<NonNullable<Window["naver"]>["maps"]["Marker"]>;
      position: unknown;
      index: number;
    }
  >;
  polyline: { setMap: (map: unknown) => void } | null;
}

export function NaverMap({
  stops,
  activeStopId,
  onSelectStop,
  showPolyline = true,
}: NaverMapProps) {
  const { lang } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">(clientId ? "loading" : "error");
  const mapInstanceRef = useRef<MapInstanceHolder | null>(null);

  const onSelectStopRef = useRef(onSelectStop);
  const activeStopIdRef = useRef(activeStopId);
  const showPolylineRef = useRef(showPolyline);
  useEffect(() => {
    onSelectStopRef.current = onSelectStop;
    activeStopIdRef.current = activeStopId;
    showPolylineRef.current = showPolyline;
  }, [onSelectStop, activeStopId, showPolyline]);

  // Main map lifecycle and stops update
  useEffect(() => {
    if (!clientId) return;

    let disposed = false;

    function updateOrRenderMap() {
      if (disposed || !containerRef.current || !window.naver?.maps) return;
      try {
        const maps = window.naver.maps;

        if (stops.length === 0) {
          // If no stops, clear markers/polyline if map exists
          if (mapInstanceRef.current) {
            mapInstanceRef.current.markers.forEach(({ marker }) => marker.setMap(null));
            mapInstanceRef.current.markers.clear();
            if (mapInstanceRef.current.polyline) {
              mapInstanceRef.current.polyline.setMap(null);
              mapInstanceRef.current.polyline = null;
            }
          }
          setState("ready");
          return;
        }

        // If map instance already exists, smoothly update markers & polyline without tearing down DOM
        if (mapInstanceRef.current) {
          const currentInstance = mapInstanceRef.current;
          // 1. Remove old markers
          currentInstance.markers.forEach(({ marker }) => marker.setMap(null));
          currentInstance.markers.clear();

          // 2. Remove old polyline
          if (currentInstance.polyline) {
            currentInstance.polyline.setMap(null);
            currentInstance.polyline = null;
          }

          // 3. Create new polyline
          if (showPolylineRef.current && stops.length > 1) {
            currentInstance.polyline = new maps.Polyline({
              map: currentInstance.map,
              path: stops.map((s) => new maps.LatLng(s.latitude, s.longitude)),
              strokeColor: "#0f6253",
              strokeWeight: 4,
              strokeOpacity: 0.8,
              strokeStyle: "solid",
              strokeLineCap: "round",
              strokeLineJoin: "round",
            });
          }

          // 4. Create new markers
          const bounds = new maps.LatLngBounds();
          stops.forEach((stop, index) => {
            const position = new maps.LatLng(stop.latitude, stop.longitude);
            bounds.extend(position);
            const isActive = stop.id === activeStopIdRef.current;

            const marker = new maps.Marker({
              position,
              map: currentInstance.map,
              title: `${index + 1}. ${stop.placeName}`,
              icon: getMarkerIcon(index, isActive, maps),
              zIndex: isActive ? 100 : 10,
            });

            if (maps.Event?.addListener) {
              maps.Event.addListener(marker, "click", () => {
                onSelectStopRef.current?.(stop.id);
              });
            }

            currentInstance.markers.set(stop.id, { marker, position, index });
          });

          if (stops.length > 1) {
            currentInstance.map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
          } else if (stops.length === 1) {
            currentInstance.map.setCenter(new maps.LatLng(stops[0].latitude, stops[0].longitude));
          }

          setState("ready");
          return;
        }

        // Initialize fresh Map
        containerRef.current.replaceChildren();
        const first = new maps.LatLng(stops[0].latitude, stops[0].longitude);
        const map = new maps.Map(containerRef.current, {
          center: first,
          zoom: 13,
          zoomControl: true,
          zoomControlOptions: {
            position: maps.Position?.TOP_RIGHT ?? 3,
            style: maps.ZoomControlStyle?.SMALL ?? 2,
          },
          scaleControl: false,
          mapDataControl: false,
          logoControlOptions: {
            position: maps.Position?.BOTTOM_LEFT ?? 9,
          },
        });

        const bounds = new maps.LatLngBounds();
        const markersMap = new Map<
          string,
          {
            marker: InstanceType<NonNullable<Window["naver"]>["maps"]["Marker"]>;
            position: unknown;
            index: number;
          }
        >();

        // Polyline
        let polyline: { setMap: (map: unknown) => void } | null = null;
        if (showPolylineRef.current && stops.length > 1) {
          polyline = new maps.Polyline({
            map,
            path: stops.map((s) => new maps.LatLng(s.latitude, s.longitude)),
            strokeColor: "#0f6253",
            strokeWeight: 4,
            strokeOpacity: 0.8,
            strokeStyle: "solid",
            strokeLineCap: "round",
            strokeLineJoin: "round",
          });
        }

        // Place markers
        stops.forEach((stop, index) => {
          const position = new maps.LatLng(stop.latitude, stop.longitude);
          bounds.extend(position);
          const isActive = stop.id === activeStopIdRef.current;

          const marker = new maps.Marker({
            position,
            map,
            title: `${index + 1}. ${stop.placeName}`,
            icon: getMarkerIcon(index, isActive, maps),
            zIndex: isActive ? 100 : 10,
          });

          if (maps.Event?.addListener) {
            maps.Event.addListener(marker, "click", () => {
              onSelectStopRef.current?.(stop.id);
            });
          }

          markersMap.set(stop.id, { marker, position, index });
        });

        if (stops.length > 1) {
          map.fitBounds(bounds, { top: 40, right: 40, bottom: 40, left: 40 });
        }

        mapInstanceRef.current = { map, markers: markersMap, polyline };
        setState("ready");
      } catch (err) {
        console.error("Failed to render Naver Map", err);
        setState("error");
      }
    }

    // Check if Naver Maps SDK is already available
    if (window.naver?.maps) {
      updateOrRenderMap();
      return () => {
        disposed = true;
      };
    }

    // Ensure SDK script tag is injected
    const matchingScript = document.querySelector<HTMLScriptElement>(
      `script[data-michi-naver-map="true"][data-michi-naver-map-language="${lang}"]`,
    );
    const script = matchingScript ?? document.createElement("script");
    if (!matchingScript) {
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(clientId)}&language=${lang}`;
      script.async = true;
      script.dataset.michiNaverMap = "true";
      script.dataset.michiNaverMapLanguage = lang;
      document.head.appendChild(script);
    }

    script.addEventListener("load", updateOrRenderMap);
    script.addEventListener("error", () => setState("error"));
    window.navermap_authFailure = () => setState("error");

    // Fast polling fallback in case script is already loaded
    const pollInterval = setInterval(() => {
      if (window.naver?.maps) {
        clearInterval(pollInterval);
        updateOrRenderMap();
      }
    }, 100);

    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (!window.naver?.maps && !disposed) {
        setState("error");
      }
    }, 5000);

    return () => {
      disposed = true;
      clearInterval(pollInterval);
      clearTimeout(timeout);
      script.removeEventListener("load", updateOrRenderMap);
      if (window.navermap_authFailure) window.navermap_authFailure = undefined;
    };
  }, [stops, lang]);

  // Handle activeStopId updates independently without map re-render
  useEffect(() => {
    const instance = mapInstanceRef.current;
    if (!instance || !window.naver?.maps) return;
    const maps = window.naver.maps;

    instance.markers.forEach(({ marker, position, index }, stopId) => {
      const isActive = stopId === activeStopId;
      marker.setIcon(getMarkerIcon(index, isActive, maps));
      marker.setZIndex(isActive ? 100 : 10);
      if (isActive && instance.map.panTo) {
        instance.map.panTo(position);
      }
    });
  }, [activeStopId]);

  if (!clientId) {
    return (
      <div className="map-frame">
        <CoordinateFallback
          stops={stops}
          activeStopId={activeStopId}
          onSelectStop={onSelectStop}
          title={lang === "ko" ? "지도를 표시할 수 없습니다" : "地図を表示できません"}
          ariaLabel={lang === "ko" ? "장소 좌표 목록" : "場所の座標一覧"}
          message={
            lang === "ko"
              ? "NAVER Maps 클라이언트 ID가 설정되지 않아 좌표만 표시합니다."
              : "NAVER MapsのクライアントIDが未設定です。座標だけを表示しています。"
          }
        />
      </div>
    );
  }

  return (
    <div className="map-frame">
      <div
        ref={containerRef}
        className="map-canvas"
        aria-label={lang === "ko" ? "여행 일정 네이버 지도" : "旅程のNAVER地図"}
        aria-hidden={state !== "ready"}
      />
      {state === "loading" && (
        <div className="map-overlay loading-state" role="status">
          {lang === "ko" ? "지도를 불러오는 중입니다…" : "地図を読み込んでいます…"}
        </div>
      )}
      {state === "error" && (
        <div className="map-overlay">
          <CoordinateFallback
            stops={stops}
            activeStopId={activeStopId}
            onSelectStop={onSelectStop}
            title={lang === "ko" ? "지도를 표시할 수 없습니다" : "地図を表示できません"}
            ariaLabel={lang === "ko" ? "장소 좌표 목록" : "場所の座標一覧"}
            message={
              lang === "ko"
                ? "NAVER Maps를 불러오지 못해 좌표만 표시합니다."
                : "NAVER Maps를 읽을 수 없습니다. 좌표만 표시합니다."
            }
          />
        </div>
      )}
    </div>
  );
}
