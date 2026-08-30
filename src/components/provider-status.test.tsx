import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { resetLanguage } from "@/lib/i18n";
import { ProviderStatus } from "./provider-status";

describe("ProviderStatus", () => {
  beforeEach(() => {
    resetLanguage();
  });

  it("shows the selected place source instead of a hard-coded NAVER label", () => {
    render(
      <ProviderStatus
        modes={{ place: "live", crowd: "live" }}
        sources={{ place: "kakao-local", crowd: "seoul-open-data" }}
      />,
    );

    expect(screen.getByText(/kakao-local/)).toBeInTheDocument();
    expect(screen.getByText(/seoul-open-data/)).toBeInTheDocument();
    expect(screen.queryByText(/NAVER検索/)).not.toBeInTheDocument();
  });
});
