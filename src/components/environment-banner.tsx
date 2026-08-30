"use client";

import { demoMode } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export function EnvironmentBanner() {
  const { lang } = useI18n();
  if (!demoMode) return null;
  return (
    <div className="status-banner warning" role="status">
      <strong>DEMO</strong>
      <span>
        {lang === "ko"
          ? "데모 모드로 동작 중입니다. 표시되는 장소·혼잡도·일정은 샘플 데이터이며 실제 API 연결 데이터가 아닙니다."
          : "デモモードです。表示される場所・混雑度・旅程はサンプルで、実際のAPIデータではありません。"}
      </span>
    </div>
  );
}
