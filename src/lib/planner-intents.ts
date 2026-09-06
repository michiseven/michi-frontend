import type { Language } from "./i18n";

/**
 * Auth may hand off only these fixed ids. They are product examples, not saved
 * guest messages, and are deliberately never sent until the user taps send.
 */
export const PLANNER_INTENT_IDS = ["arrival_luggage", "low_walk", "short_indoor"] as const;
export type PlannerIntentId = (typeof PLANNER_INTENT_IDS)[number];

export function isPlannerIntentId(value: string | null): value is PlannerIntentId {
  return value != null && (PLANNER_INTENT_IDS as readonly string[]).includes(value);
}

export function getPlannerIntentPrompt(intent: PlannerIntentId, lang: Language): string {
  const prompts: Record<Language, Record<PlannerIntentId, string>> = {
    ko: {
      arrival_luggage: "인천공항에 도착해 캐리어를 맡기고 호텔 체크인 전까지 서울을 둘러보고 싶어요.",
      low_walk: "부모님과 긴 도보를 피하고 쉬는 시간을 넣어 서울 하루를 보내고 싶어요.",
      short_indoor: "비 오는 날 3시간 안에 즐길 수 있는 실내 서울 코스를 추천해 주세요.",
    },
    ja: {
      arrival_luggage: "仁川空港に着いてキャリーケースを預け、ホテルのチェックイン前にソウルを楽しみたいです。",
      low_walk: "両親と長い徒歩を避け、休憩を入れながらソウルで一日を過ごしたいです。",
      short_indoor: "雨の日に3時間で楽しめる、ソウルの屋内コースを教えてください。",
    },
  };
  return prompts[lang][intent];
}
