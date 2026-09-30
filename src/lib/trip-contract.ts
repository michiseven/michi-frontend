import type { Trip } from "./types";

/** A generated tourism route is not evidence that airport or luggage requirements were met. */
export function isTripDraft(trip: Trip): boolean {
  return trip.status === "partial" || trip.contractAssessment?.status === "partial" ||
    Boolean(trip.safetyConstraints?.requiresUserConfirmation) ||
    Boolean(trip.airportTransfers?.some((item) => item.transfer.status !== "verified"));
}

export function tripBudgetInput(trip: Trip): Trip["budgetInput"] {
  if (trip.budgetInput) return trip.budgetInput;
  if (trip.explicitRequestContract?.budget) return trip.explicitRequestContract.budget;
  // A new contract explicitly distinguishes user input from parser defaults.
  // Only legacy responses without that contract may fall back to old fields.
  if (trip.explicitRequestContract != null) return undefined;
  const amountKrw = trip.budget ?? trip.preference?.budget ?? trip.totalBudgetKrw ?? trip.preference?.totalBudgetKrw;
  return amountKrw == null ? undefined : {
    amountKrw,
    scope: trip.budgetScope ?? trip.preference?.budgetScope ?? "total",
  };
}

export function formatTripBudget(trip: Trip, lang: "ko" | "ja"): string | null {
  const input = tripBudgetInput(trip);
  if (!input) return null;
  const amount = new Intl.NumberFormat(lang === "ko" ? "ko-KR" : "ja-JP").format(input.amountKrw);
  return lang === "ko"
    ? `${input.scope === "per_person" ? "1인" : "전체"} ${amount}원`
    : `${input.scope === "per_person" ? "1人" : "合計"} ${amount}ウォン`;
}
