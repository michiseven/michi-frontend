import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider, resetLanguage } from "@/lib/i18n";
import { testTrip } from "@/test/fixtures";
import { TripConstraintSummary } from "./trip-constraint-summary";

describe("TripConstraintSummary", () => {
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
