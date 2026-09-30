import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider, resetLanguage } from "@/lib/i18n";
import type { AirportTransfer } from "@/lib/types";
import { AirportTransferCard } from "./airport-transfer-card";

const transfer: AirportTransfer = {
  role: "departure", appliesOn: "last_day", dayNumber: 1,
  airport: { code: "ICN_T1", name: "인천공항 T1", address: "인천" },
  date: "2026-10-01", at: "18:00", bufferMinutes: 120,
  transfer: { mode: null, durationMinutes: null, status: "unavailable", source: "" },
};

describe("AirportTransferCard", () => {
  it("does not claim a check-in buffer was secured without transfer evidence", () => {
    resetLanguage("ko");
    render(<I18nProvider><AirportTransferCard transfer={transfer} /></I18nProvider>);
    expect(screen.getByText(/실제 확보 여부는 미확인/)).toBeInTheDocument();
    expect(screen.queryByText(/확보했어요/)).not.toBeInTheDocument();
  });
});
