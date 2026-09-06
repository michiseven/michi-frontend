"use client";

import { useI18n } from "@/lib/i18n";
import { localizePlaceName } from "@/lib/place-localization";
import type { AirportTransfer } from "@/lib/types";

interface AirportTransferCardProps {
  transfer: AirportTransfer;
}

function evidenceLabel(evidence: string, lang: "ko" | "ja") {
  if (evidence === "measured" || evidence === "verified") return lang === "ko" ? "확인된 이동 정보" : "確認済みの移動情報";
  if (evidence === "mixed") return lang === "ko" ? "일부 확인된 이동 정보" : "一部確認済みの移動情報";
  if (evidence === "estimated") return lang === "ko" ? "예상 이동 정보" : "推定の移動情報";
  return lang === "ko" ? "이동 정보 확인 필요" : "移動情報を要確認";
}

function methodLabel(method: string | null, lang: "ko" | "ja") {
  if (!method) return null;
  const normalized = method.toLowerCase();
  if (normalized.includes("subway")) return lang === "ko" ? "지하철" : "地下鉄";
  if (normalized.includes("bus")) return lang === "ko" ? "버스" : "バス";
  if (normalized.includes("car") || normalized.includes("taxi")) return lang === "ko" ? "차량" : "車";
  return method;
}

/** Displays an airport only as an arrival/departure boundary, never as a venue. */
export function AirportTransferCard({ transfer }: AirportTransferCardProps) {
  const { lang } = useI18n();
  const isArrival = transfer.role === "arrival";
  const title = isArrival
    ? lang === "ko"
      ? "입국 후 시내 이동"
      : "到着後、市内へ移動"
    : lang === "ko"
      ? "출국을 위한 공항 이동"
      : "出発のため空港へ移動";
  const airportName = localizePlaceName(transfer.airport.name, lang);
  const route = transfer.transfer;
  const method = methodLabel(route.mode, lang);

  return (
    <section className="airport-transfer-card" aria-label={title}>
      <div className="airport-transfer-heading">
        <span className="airport-transfer-icon" aria-hidden="true">✈️</span>
        <div>
          <p className="airport-transfer-kicker">
            {isArrival
              ? lang === "ko" ? "여행 시작 앵커" : "旅の開始アンカー"
              : lang === "ko" ? "여행 종료 앵커" : "旅の終了アンカー"}
          </p>
          <h3>{title}</h3>
        </div>
        <time className="airport-transfer-time">{transfer.at}</time>
      </div>

      <p className="airport-transfer-airport">{airportName}</p>
      {transfer.airport.address && (
        <p className="airport-transfer-address">{transfer.airport.address}</p>
      )}

      {route.status !== "unavailable" ? (
        <div className="airport-transfer-route">
          <span>
            {route.durationMinutes != null
              ? lang === "ko"
                ? `예상 ${route.durationMinutes}분${method ? ` · ${method}` : ""}`
                : `約${route.durationMinutes}分${method ? `・${method}` : ""}`
              : lang === "ko"
                ? "소요 시간 확인 필요"
                : "所要時間を要確認"}
          </span>
          <span className="airport-transfer-evidence">
            {evidenceLabel(route.status, lang)}
          </span>
        </div>
      ) : (
        <p className="airport-transfer-unavailable">
          {lang === "ko"
            ? "시내 이동 정보가 아직 확인되지 않았어요. 이동수단과 소요 시간을 확인해 주세요."
            : "市内への移動情報は未確認です。移動手段と所要時間を確認してください。"}
        </p>
      )}

      {!isArrival && transfer.bufferMinutes != null && (
        <p className="airport-transfer-buffer">
          {lang === "ko"
            ? `공항 도착 뒤 체크인·보안검색 여유 ${transfer.bufferMinutes}분을 확보했어요.`
            : `空港到着後、チェックイン・保安検査の余裕を${transfer.bufferMinutes}分確保しています。`}
        </p>
      )}

      {route.source && <p className="airport-transfer-warning">{route.source}</p>}
    </section>
  );
}
