"use client";

import { useI18n } from "@/lib/i18n";
import type { CSSProperties } from "react";
import type { SafetyConstraint, SafetyConstraintAssessment, SafetyConstraintStatus, SafetyRequest, Trip } from "@/lib/types";

const constraintLabels: Record<"ko" | "ja", Record<SafetyConstraint, string>> = {
  ko: {
    food_allergy: "식품 알레르기",
    medical: "의료·건강 제약",
    wheelchair: "휠체어 이동",
    stroller: "유모차 이동",
    stairs_avoidance: "계단 회피",
  },
  ja: {
    food_allergy: "食物アレルギー",
    medical: "医療・健康上の条件",
    wheelchair: "車いす移動",
    stroller: "ベビーカー移動",
    stairs_avoidance: "階段回避",
  },
};

const statusCopy: Record<"ko" | "ja", Record<SafetyConstraintStatus, string>> = {
  ko: { verified: "확인됨", unverified: "미확인", unsupported: "지원 불가" },
  ja: { verified: "確認済み", unverified: "未確認", unsupported: "非対応" },
};

const statusStyle: Record<SafetyConstraintStatus, CSSProperties> = {
  verified: { background: "#ecfdf5", borderColor: "#86efac", color: "#166534" },
  unverified: { background: "#fffbeb", borderColor: "#fcd34d", color: "#92400e" },
  unsupported: { background: "#fef2f2", borderColor: "#fca5a5", color: "#991b1b" },
};

const resultCopy = {
  ko: { satisfied: "조건 충족", unsatisfied: "조건 불충족", unknown: "확인 가능한 근거가 제공되지 않았습니다." },
  ja: { satisfied: "条件を満たしています", unsatisfied: "条件を満たしていません", unknown: "確認できる根拠は提供されていません。" },
} as const;

interface SafetyConstraintSummaryProps {
  trip: Trip;
  compact?: boolean;
}

interface SafetyPlaceBadgesProps {
  assessments: SafetyConstraintAssessment[] | null | undefined;
}

/** Place-scoped evidence belongs beside the place, not in a generic route label. */
export function SafetyPlaceBadges({ assessments }: SafetyPlaceBadgesProps) {
  const { lang } = useI18n();
  const placeAssessments = assessments?.filter((assessment) => assessment.scope === "place" || assessment.scope === "facility") ?? [];
  if (placeAssessments.length === 0) return null;

  return (
    <ul aria-label={lang === "ko" ? "장소 안전 정보" : "スポットの安全情報"} style={{ display: "flex", flexWrap: "wrap", gap: "6px", listStyle: "none", padding: 0, margin: "8px 0 0" }}>
      {placeAssessments.map((assessment) => (
        <li key={assessment.id} style={{ border: "1px solid", borderRadius: "999px", padding: "3px 7px", fontSize: "0.72rem", fontWeight: 700, ...statusStyle[assessment.status] }}>
          {constraintLabels[lang][assessment.kind]} · {statusCopy[lang][assessment.status]}
        </li>
      ))}
    </ul>
  );
}

function toRequestedAssessment(
  request: SafetyRequest,
  assessments: SafetyConstraintAssessment[],
): SafetyConstraintAssessment {
  const matching = assessments.find((assessment) => assessment.id === request.id);
  if (matching) return matching;
  return {
    id: `missing-${request.id}`,
    kind: request.kind,
    scope: request.scope,
    status: "unverified",
    result: "unknown",
    sourceRefs: [],
    warnings: [],
  };
}

/**
 * Shows only backend-issued safety statuses. Missing safety data is omitted,
 * so the UI never upgrades an unknown condition to a reassuring claim.
 */
export function SafetyConstraintSummary({ trip, compact = false }: SafetyConstraintSummaryProps) {
  const { lang } = useI18n();
  const safety = trip.safetyConstraints;
  if (!safety?.requested?.length) return null;

  const entries = safety.requested.map((request) => toRequestedAssessment(request, safety.assessments ?? []));
  const hasUncertain = entries.some(({ status }) => status !== "verified") || safety.requiresUserConfirmation;

  return (
    <section
      aria-label={lang === "ko" ? "안전 제약 확인 상태" : "安全条件の確認状況"}
      style={{
        margin: compact ? "0" : "0 0 16px",
        padding: compact ? "10px 12px" : "14px 16px",
        border: "1px solid #cbd5e1",
        borderLeft: `4px solid ${hasUncertain ? "#d97706" : "#15803d"}`,
        borderRadius: "8px",
        background: hasUncertain ? "#fffbeb" : "#f0fdf4",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <strong style={{ color: "#1e293b", fontSize: compact ? "0.82rem" : "0.92rem" }}>
          {lang === "ko" ? "안전 제약 확인 상태" : "安全条件の確認状況"}
        </strong>
        {safety.requiresUserConfirmation && (
          <span style={{ color: "#92400e", fontSize: "0.78rem", fontWeight: 700 }}>
            {lang === "ko" ? "확정 전 직접 확인 필요" : "確定前にご自身で確認が必要"}
          </span>
        )}
      </div>
      <ul style={{ display: "flex", flexWrap: "wrap", gap: "6px", listStyle: "none", padding: 0, margin: "10px 0 0" }}>
        {entries.map(({ id, kind, status }) => (
          <li
            key={id}
            style={{ border: "1px solid", borderRadius: "999px", padding: "4px 8px", fontSize: "0.78rem", fontWeight: 700, ...statusStyle[status] }}
          >
            {constraintLabels[lang][kind]} · {statusCopy[lang][status]}
          </li>
        ))}
      </ul>
      {!compact && entries.some((entry) => entry.result || entry.sourceRefs.length || entry.warnings.length) && (
        <ul style={{ display: "grid", gap: "7px", listStyle: "none", padding: 0, margin: "12px 0 0" }}>
          {entries.map((entry) => (
            <li key={`${entry.id}-detail`} style={{ color: "#475569", fontSize: "0.8rem", lineHeight: 1.45 }}>
              <strong>{constraintLabels[lang][entry.kind]}</strong>
              {`: ${resultCopy[lang][entry.result]}`}
              {entry.sourceRefs.length > 0 && (
                <span>
                  {" "}
                  {entry.sourceRefs.map((source, index) => (
                      <span key={`${entry.id}-source-${source.title}`}>
                        {index > 0 ? ", " : ""}
                      {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : source.title}
                    </span>
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      {hasUncertain && (
        <p style={{ margin: "10px 0 0", color: "#78350f", fontSize: "0.78rem", lineHeight: 1.5 }}>
          {lang === "ko"
            ? "미확인 정보는 안전하거나 이용 가능하다는 뜻이 아닙니다. 장소와 이동 경로를 예약·출발 전에 직접 확인하세요."
            : "未確認は安全性や利用可否を示すものではありません。予約・出発前に施設と移動経路を直接ご確認ください。"}
        </p>
      )}
    </section>
  );
}
