"use client";

import { useI18n } from "@/lib/i18n";
import type { Trip } from "@/lib/types";

type SummaryState = "met" | "partial" | "unknown";

interface ConstraintItem {
  label: string;
  state: SummaryState;
  detail: string;
}

const stateStyle: Record<SummaryState, { background: string; border: string; color: string }> = {
  met: { background: "#ecfdf5", border: "#86efac", color: "#166534" },
  partial: { background: "#fffbeb", border: "#fcd34d", color: "#92400e" },
  unknown: { background: "#f1f5f9", border: "#cbd5e1", color: "#475569" },
};

/**
 * A compact, evidence-conscious overview of the constraints the UI can
 * actually derive from a Trip. It deliberately does not infer rain, child,
 * hotel, or accessibility suitability when the API did not issue a fact.
 */
export function TripConstraintSummary({ trip }: { trip: Trip }) {
  const { lang } = useI18n();
  const isKo = lang === "ko";
  const budget = trip.totalBudgetKrw ?? trip.preference?.totalBudgetKrw ?? trip.budget ?? trip.preference?.budget;
  const partySize = trip.partySize ?? trip.preference?.partySize ?? 1;
  const budgetScope = trip.budgetScope ?? trip.preference?.budgetScope ?? "total";
  const comparableBudget = budget != null
    ? budgetScope === "per_person" ? budget * partySize : budget
    : null;
  const hasCost = trip.estimatedTotalCost != null;
  const routes = trip.stops.slice(1).map((stop) => stop.inboundRoute).filter(Boolean);
  const checkedRouteCount = routes.filter((route) => route?.evidence === "measured" || route?.evidence === "mixed").length;

  const items: ConstraintItem[] = [];
  items.push(
    trip.startTime && trip.endTime
      ? {
          label: isKo ? "시간" : "時間",
          state: "met",
          detail: isKo ? `${trip.startTime}–${trip.endTime} 일정` : `${trip.startTime}〜${trip.endTime}の日程`,
        }
      : { label: isKo ? "시간" : "時間", state: "unknown", detail: isKo ? "시간 범위 미확인" : "時間帯は未確認" },
  );
  items.push(
    comparableBudget == null || !hasCost
      ? { label: isKo ? "예산" : "予算", state: "unknown", detail: isKo ? "비용 근거 미확인" : "費用根拠は未確認" }
      : trip.estimatedTotalCost! <= comparableBudget
        ? { label: isKo ? "예산" : "予算", state: "met", detail: isKo ? "추정 합계가 예산 안" : "推定合計は予算内" }
        : { label: isKo ? "예산" : "予算", state: "partial", detail: isKo ? "추정 합계가 예산 초과" : "推定合計が予算を超過" },
  );
  items.push(
    routes.length === 0
      ? { label: isKo ? "이동" : "移動", state: "unknown", detail: isKo ? "이동 근거 미확인" : "移動根拠は未確認" }
      : checkedRouteCount === routes.length
        ? { label: isKo ? "이동" : "移動", state: "met", detail: isKo ? "구간 시간 확인됨" : "区間時間を確認" }
        : checkedRouteCount > 0
          ? { label: isKo ? "이동" : "移動", state: "partial", detail: isKo ? "일부 구간은 추정" : "一部区間は推定" }
          : { label: isKo ? "이동" : "移動", state: "unknown", detail: isKo ? "구간 시간은 추정/미확인" : "区間時間は推定・未確認" },
  );

  return (
    <section
      aria-label={isKo ? "여행 조건 요약" : "旅行条件の要約"}
      style={{ margin: "0 0 16px", padding: "14px 16px", border: "1px solid #cbd5e1", borderRadius: "10px", background: "#fff" }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <strong style={{ color: "#1e293b", fontSize: "0.92rem" }}>{isKo ? "여행 조건 요약" : "旅行条件の要約"}</strong>
        <span style={{ color: "#64748b", fontSize: "0.75rem" }}>{isKo ? "근거가 없는 항목은 미확인으로 표시합니다." : "根拠のない項目は未確認として表示します。"}</span>
      </div>
      <ul style={{ display: "flex", flexWrap: "wrap", gap: "8px", listStyle: "none", padding: 0, margin: "10px 0 0" }}>
        {items.map((item) => {
          const status = item.state === "met" ? (isKo ? "충족" : "満たす") : item.state === "partial" ? (isKo ? "일부 충족" : "一部確認") : (isKo ? "미확인" : "未確認");
          const colors = stateStyle[item.state];
          return (
            <li key={item.label} style={{ border: `1px solid ${colors.border}`, borderRadius: "999px", padding: "5px 9px", background: colors.background, color: colors.color, fontSize: "0.78rem", fontWeight: 700 }}>
              {item.label} · {status} <span style={{ fontWeight: 500 }}>({item.detail})</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
