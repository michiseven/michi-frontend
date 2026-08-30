"use client";

import { useI18n } from "@/lib/i18n";
import type { ProviderModes } from "@/lib/types";

const labels: Record<string, { ja: string; ko: string }> = {
  llm: { ja: "AI解析", ko: "AI 파서" },
  place: { ja: "採用した場所", ko: "장소 데이터" },
  kto: { ja: "KTO観光POI", ko: "KTO 관광 POI" },
  crowd: { ja: "混雑", ko: "혼잡도" },
  tourism: { ja: "観光データ", ko: "관광 데이터랩" },
  routing: { ja: "経路", ko: "길찾기" },
  accessibility: { ja: "傾斜・階段GIS", ko: "경사·계단 GIS" },
};

export function ProviderStatus({
  modes,
  sources,
}: {
  modes?: ProviderModes | null;
  sources?: { place?: string; crowd?: string } | null;
}) {
  const { lang } = useI18n();
  const entries = Object.entries(modes ?? {}).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );
  if (entries.length === 0) {
    return (
      <div className="status-banner warning">
        <strong>DATA</strong>
        <span>
          {lang === "ko"
            ? "API에서 데이터 제공자 상태가 반환되지 않았습니다."
            : "APIからデータ提供元の状態が返されていません。"}
        </span>
      </div>
    );
  }
  return (
    <div
      className="mode-row"
      aria-label={lang === "ko" ? "데이터 제공자 상태" : "データ提供元の状態"}
    >
      {entries.map(([provider, mode]) => (
        <span
          className={`mode-chip ${mode === "mock" ? "mock" : ""}`}
          key={provider}
        >
          {labels[provider] ? labels[provider][lang] : provider}
          {provider === "place" && sources?.place ? ` (${sources.place})` : ""}
          {provider === "crowd" && sources?.crowd
            ? ` (${sources.crowd})`
            : ""}: {mode.toUpperCase()}
        </span>
      ))}
    </div>
  );
}
