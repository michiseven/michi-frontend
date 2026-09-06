import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider, resetLanguage } from "@/lib/i18n";
import type { Trip } from "@/lib/types";
import { SafetyConstraintSummary } from "./safety-constraint-summary";

const safetyTrip = {
  id: "trip-safety",
  date: "2026-09-05",
  startTime: "10:00",
  endTime: "18:00",
  stops: [],
  providerModes: {},
  warnings: [],
  safetyConstraints: {
    requested: [
      { id: "allergy", kind: "food_allergy", scope: "place" },
      { id: "wheelchair", kind: "wheelchair", scope: "route" },
    ],
    assessments: [
      { id: "allergy", kind: "food_allergy", scope: "place", status: "unverified", result: "unknown", sourceRefs: [], warnings: [] },
      { id: "wheelchair", kind: "wheelchair", scope: "route", status: "verified", result: "satisfied", sourceRefs: [{ title: "서울 GIS", url: null, fetchedAt: null }], warnings: ["무장애 이용을 보장하지 않습니다."] },
    ],
    requiresUserConfirmation: true,
  },
} satisfies Trip;

describe("SafetyConstraintSummary", () => {
  it("does not turn unknown safety information into a positive claim", () => {
    resetLanguage("ko");
    render(<I18nProvider><SafetyConstraintSummary trip={safetyTrip} /></I18nProvider>);

    expect(screen.getByText("식품 알레르기 · 미확인")).toBeInTheDocument();
    expect(screen.getByText("휠체어 이동 · 확인됨")).toBeInTheDocument();
    expect(screen.getByText(/미확인 정보는 안전하거나 이용 가능하다는 뜻이 아닙니다/)).toBeInTheDocument();
    expect(screen.getByText("확정 전 직접 확인 필요")).toBeInTheDocument();
  });
});
