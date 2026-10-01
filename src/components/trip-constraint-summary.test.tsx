import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider, resetLanguage } from "@/lib/i18n";
import { testTrip } from "@/test/fixtures";
import { TripConstraintSummary } from "./trip-constraint-summary";

describe("TripConstraintSummary", () => {
  it.each(["ko", "ja"] as const)("keeps sightseeing, airport arrival and flight clocks separate in %s", (locale) => {
    resetLanguage(locale);
    render(<I18nProvider><TripConstraintSummary trip={{ ...testTrip, startTime: "11:00", endTime: "16:00", status: "partial", explicitRequestContract: {
      airport: { role: "departure", name: "ICN", terminal: "T1", deadline: "18:00", flightTime: "20:30", sourceRequest: "관광16시 종료 공항18시 비행20:30" },
    } }} /></I18nProvider>);
    expect(screen.getByText(locale === "ko" ? /11:00–16:00 관광 일정/ : /11:00〜16:00の観光日程/)).toBeInTheDocument();
    expect(screen.getByText(locale === "ko" ? /18:00 공항 도착 마감.*20:30 비행 출발/ : /18:00 空港到着期限.*20:30 フライト出発/)).toBeInTheDocument();
  });
  it("renders airport deadlines and luggage as unresolved draft conditions, not fulfilled time", () => {
    resetLanguage("ko");
    render(<I18nProvider><TripConstraintSummary trip={{ ...testTrip, status: "partial", explicitRequestContract: {
      airport: { role: "departure", name: "ICN", terminal: null, deadline: "18:00", sourceRequest: "18시 공항 도착" },
      luggage: { requested: true, storageRequired: true, recoveryRequired: true, sourceRequest: "16시 짐을 회수" },
    }, contractAssessment: { status: "partial", unavailable: [
      { code: "airport_terminal", status: "evidence_unavailable", sourceRequest: "터미널 몰라요" },
      { code: "airport_transfer", status: "evidence_unavailable", sourceRequest: "18시 공항 도착" },
      { code: "luggage_storage", status: "evidence_unavailable", sourceRequest: "짐 보관과 회수" },
    ] } }} /></I18nProvider>);
    expect(screen.getByText(/관광 일정 초안/)).toBeInTheDocument();
    expect(screen.getByText(/18:00 공항 도착 마감/)).toBeInTheDocument();
    expect(screen.getByText(/16시 짐을 회수/)).toBeInTheDocument();
    expect(screen.getByText(/보관 필요 · 회수 필요/)).toBeInTheDocument();
    expect(screen.getByText(/짐 보관·회수 시설의 운영시간·비용 근거 미확인/)).toBeInTheDocument();
    expect(screen.queryByText(/시간 · 충족/)).not.toBeInTheDocument();
  });

  it("keeps a satisfied contract distinct from a draft", () => {
    resetLanguage("ko");
    render(<I18nProvider><TripConstraintSummary trip={{ ...testTrip, contractAssessment: { status: "satisfied", unavailable: [] } }} /></I18nProvider>);
    expect(screen.getByText(/시간 · 충족/)).toBeInTheDocument();
    expect(screen.queryByText(/관광 일정 초안/)).not.toBeInTheDocument();
  });

  it.each(["total", "per_person"] as const)("preserves %s input budget while costs remain unknown", (scope) => {
    resetLanguage("ko");
    render(<I18nProvider><TripConstraintSummary trip={{ ...testTrip, estimatedTotalCost: null, budgetInput: { amountKrw: 60000, scope } }} /></I18nProvider>);
    expect(screen.getByText(new RegExp(`${scope === "total" ? "전체" : "1인"} 60,000원; 비용 근거 미확인`))).toBeInTheDocument();
    expect(screen.queryByText(/예산 · 충족/)).not.toBeInTheDocument();
  });
  it("does not present missing cost or movement evidence as confirmed", () => {
    resetLanguage("ko");
    render(<I18nProvider><TripConstraintSummary trip={{ ...testTrip, estimatedTotalCost: null }} /></I18nProvider>);

    expect(screen.getByRole("region", { name: "여행 조건 요약" })).toBeInTheDocument();
    expect(screen.getByText(/비용 근거 미확인/)).toBeInTheDocument();
    expect(screen.getByText(/이동 근거 미확인/)).toBeInTheDocument();
    expect(screen.queryByText(/예산 · 충족/)).not.toBeInTheDocument();
  });

  it("marks a total budget as met only when the returned cost is within it", () => {
    resetLanguage("ko");
    render(
      <I18nProvider>
        <TripConstraintSummary trip={{ ...testTrip, estimatedTotalCost: 12000, budget: 20000 }} />
      </I18nProvider>,
    );

    expect(screen.getByText(/예산 · 충족/)).toBeInTheDocument();
    expect(screen.getByText(/추정 합계가 예산 안/)).toBeInTheDocument();
  });
});
