"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getStoredEditToken,
  cancelChatRun,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type {
  ActionChip,
  PendingTripMutation,
  PendingChatQuestion,
  ReplacementCandidate,
  SearchHotelItem,
  SafetyConstraint,
  Trip,
  VerifiedPlaceFacts,
} from "@/lib/types";
import { GenerativeTripWidget } from "./generative-trip-widget";
import { HotelSearchModal } from "./hotel-search-modal";
import { useAuth } from "@/lib/auth";
import { getPlannerIntentPrompt, type PlannerIntentId } from "@/lib/planner-intents";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { plannerActions } from "@/store/planner/planner-slice";
import {
  ChatColumn,
  Composer,
  ItineraryPanel,
  MessageList,
  ModalBackdrop,
  PlannerContainer,
  PlannerLayout,
  PlannerToolbar,
  ScheduleDialog,
} from "./styles/generative-chat-planner.styles";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionChips?: ActionChip[];
  status?: "completed" | "awaiting_confirmation" | "rejected" | "failed";
  pendingAction?: PendingTripMutation | null;
  pendingQuestion?: PendingChatQuestion | null;
  alternatives?: ReplacementCandidate[];
  verifiedPlaceFacts?: VerifiedPlaceFacts | null;
  resultTrip?: Trip | null;
  errorCode?: string | null;
}

type TripProfile = {
  /** Exact count. The backend rejects values outside 1–50. */
  partySize?: number;
  budget?: number;
  budgetScope: "per_person" | "total";
  companions?: "solo" | "couple" | "friends" | "family" | "with_children";
  pace?: "relaxed" | "standard" | "packed";
  safetyConstraints: SafetyConstraint[];
  /** 서울 도착일과 여행을 시작할 수 있는 시각. */
  arrivalDate?: string;
  arrivalTime?: string;
  /** 서울 출발일과 여행을 마쳐야 하는 시각. */
  departureDate?: string;
  departureTime?: string;
  /** 입국·출국 공항 터미널. 일정이 입력된 방향에 대해서만 전송한다. */
  arrivalAirport?: AirportCode;
  departureAirport?: AirportCode;
  hotel?: SearchHotelItem;
  hasLuggage: boolean;
};

type AirportCode = "ICN_T1" | "ICN_T2" | "GMP_INTL" | "GMP_DOM";

interface GenerativeChatPlannerProps {
  onTripGenerated?: (tripId: string) => void;
  onLoginRequired?: () => void;
  /** Home의 로그인 모달이 성공적으로 닫힌 뒤 직전 메시지를 한 번 재개한다. */
  loginCompletedAt?: number;
  /** 사용자가 로그인 모달을 취소하면 보류한 메시지를 폐기한다. */
  loginCancelledAt?: number;
  /** Static product-example id from /auth. This must never trigger a send by itself. */
  initialIntent?: PlannerIntentId | null;
}

let idCounter = 0;
function generateMessageId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function GenerativeChatPlanner({ onTripGenerated, onLoginRequired, loginCompletedAt, loginCancelledAt, initialIntent }: GenerativeChatPlannerProps) {
  const { lang, t, quickPrompts } = useI18n();
  const user = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingMessageAfterLoginRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emittedTripIdRef = useRef<string | null>(null);
  const dispatch = useAppDispatch();
  const planner = useAppSelector((state) => state.planner);
  const { threadId, threadSecret, activeTrip, isLoading, loadingStage, selectedAlternativeId, lastRetry } = planner;

  const profile = planner.profile;
  const setProfile = (nextProfile: TripProfile) => dispatch(plannerActions.profileReplaced(nextProfile));

  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [isTravelScheduleOpen, setIsTravelScheduleOpen] = useState(false);
  const [isTravelConditionsOpen, setIsTravelConditionsOpen] = useState(false);

  const messages = useMemo(
    () => planner.messages.length > 0 ? planner.messages : [{ id: "welcome-message", role: "assistant" as const, content: t.plannerWelcome }],
    [planner.messages, t.plannerWelcome],
  );
  const [input, setInput] = useState("");
  const [inputOrigin, setInputOrigin] = useState<"direct" | "example">("direct");
  const [maxWalkMinutes, setMaxWalkMinutes] = useState<"" | "15" | "30" | "45">("");
  const [restIntervalMinutes, setRestIntervalMinutes] = useState<"" | "60" | "90">("");
  const [luggagePlan, setLuggagePlan] = useState<"" | "hotel-before-checkin" | "hotel-after-checkout" | "locker">("");

  const currency = new Intl.NumberFormat(lang === "ko" ? "ko-KR" : "ja-JP");

  useEffect(() => {
    dispatch(plannerActions.initializeMessages([{ id: "welcome-message", role: "assistant", content: t.plannerWelcome }]));
  }, [dispatch, t.plannerWelcome]);

  useEffect(() => {
    if (!activeTrip?.id || emittedTripIdRef.current === activeTrip.id) return;
    emittedTripIdRef.current = activeTrip.id;
    onTripGenerated?.(activeTrip.id);
  }, [activeTrip?.id, onTripGenerated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (!isLoading) return;
    const routingTimer = window.setTimeout(() => dispatch(plannerActions.loadingStageChanged("routing")), 5_000);
    const waitingTimer = window.setTimeout(() => dispatch(plannerActions.loadingStageChanged("waiting")), 15_000);
    return () => {
      window.clearTimeout(routingTimer);
      window.clearTimeout(waitingTimer);
    };
  }, [dispatch, isLoading]);

  // 로그인 전 작성한 요청을 버리지 않는다. AuthModal은 세션을 먼저 갱신하므로,
  // user 변경 뒤 같은 메시지를 한 번만 이어서 보낸다.
  useEffect(() => {
    if (!loginCompletedAt || !user || isLoading || !pendingMessageAfterLoginRef.current) return;
    const message = pendingMessageAfterLoginRef.current;
    pendingMessageAfterLoginRef.current = null;
    void sendMessage(message);
  // loginCompletedAt은 AuthModal 성공이라는 외부 이벤트다. 메시지는 ref로 한 번만 소비한다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginCompletedAt, user, isLoading]);

  useEffect(() => {
    if (loginCancelledAt) pendingMessageAfterLoginRef.current = null;
  }, [loginCancelledAt]);

  const intentPrompt = initialIntent ? getPlannerIntentPrompt(initialIntent, lang) : null;

  function requestContextText(): string[] {
    const isKo = lang === "ko";
    const details: string[] = [];
    if (maxWalkMinutes) {
      details.push(isKo ? `한 구간 도보는 최대 ${maxWalkMinutes}분` : `1区間の徒歩は最大${maxWalkMinutes}分`);
    }
    if (restIntervalMinutes) {
      details.push(isKo ? `${restIntervalMinutes}분마다 휴식이 필요함` : `${restIntervalMinutes}分ごとに休憩が必要`);
    }
    if (profile.hasLuggage && luggagePlan) {
      const label = isKo
        ? ({ "hotel-before-checkin": "체크인 전 숙소에 맡기기", "hotel-after-checkout": "체크아웃 후 숙소에 맡기기", locker: "로커 찾기" } as const)[luggagePlan]
        : ({ "hotel-before-checkin": "チェックイン前にホテルへ預ける", "hotel-after-checkout": "チェックアウト後にホテルへ預ける", locker: "ロッカーを探す" } as const)[luggagePlan];
      details.push(isKo ? `짐: ${label}` : `荷物: ${label}`);
    }
    return details;
  }

  function makeRequestMessage(textToSend: string): string {
    const details = requestContextText();
    if (details.length === 0) return textToSend;
    return `${textToSend}\n\n${lang === "ko" ? "추가 조건" : "追加条件"}: ${details.join(lang === "ko" ? ", " : "、")}`;
  }

  function sendMessage(
    textToSend: string,
    startFreshTrip = false,
    relaxations: Array<"meal_cuisine" | "search_radius" | "route_constraints"> = [],
    mutationTarget?: ActionChip["mutationTarget"],
    mealPreference?: ActionChip["mealPreference"],
    mealCuisine?: ActionChip["mealCuisine"],
    chatIntent?: ActionChip["intent"],
    structuredChoice?: {
      questionId: string;
      optionId: string;
      expectedRevision?: number;
    },
  ): void {
    if (!textToSend.trim() || isLoading) return;
    if (!user) {
      pendingMessageAfterLoginRef.current = textToSend;
      onLoginRequired?.();
      return;
    }

    const requestId = generateMessageId("user");
    setInput("");
    setInputOrigin("direct");
    const scheduleProfile = {
        ...(profile.arrivalDate && profile.arrivalTime
          ? { arrivalDate: profile.arrivalDate, arrivalTime: profile.arrivalTime, arrivalAirport: profile.arrivalAirport }
          : {}),
        ...(profile.departureDate && profile.departureTime
          ? { departureDate: profile.departureDate, departureTime: profile.departureTime, departureAirport: profile.departureAirport }
          : {}),
      };
    dispatch(plannerActions.sendRequested({
      message: makeRequestMessage(textToSend),
      displayMessage: textToSend,
      requestId,
      locale: lang,
      currentTripId: activeTrip?.id,
      profile: {
          hotel: profile.hotel,
          ...(profile.partySize != null ? { partySize: profile.partySize } : {}),
          ...(profile.budget != null ? { budget: profile.budget, budgetScope: profile.budgetScope } : {}),
          ...(profile.companions ? { companions: profile.companions } : {}),
          ...(profile.pace ? { pace: profile.pace } : {}),
          ...(profile.safetyConstraints.length > 0 ? { safetyConstraints: profile.safetyConstraints } : {}),
          hasLuggage: profile.hasLuggage,
          ...scheduleProfile,
      },
      ...(startFreshTrip ? { startFreshTrip: true } : {}),
      ...(relaxations.length > 0 ? { relaxations } : {}),
      ...(mutationTarget ? { mutationTarget } : {}),
      ...(mealPreference ? { mealPreference } : {}),
      ...(mealCuisine ? { mealCuisine } : {}),
      ...(chatIntent ? { chatIntent } : {}),
      ...(structuredChoice ? { structuredChoice } : {}),
    }));
  }

  async function cancelGeneration() {
    if (!isLoading) return;
    const editToken = activeTrip?.id ? (getStoredEditToken(activeTrip.id) ?? undefined) : undefined;
    try {
      if (threadId) {
        await cancelChatRun(threadId, { threadSecret: threadSecret ?? undefined, editToken });
      }
    } catch {
      // The browser abort below still returns control to the user if the cancel request cannot reach the server.
    } finally { dispatch(plannerActions.cancelRequested()); }
  }

  function prepareRetry() {
    if (!lastRetry) return;
    setInput(lastRetry.message);
    setInputOrigin(lastRetry.startFreshTrip ? "example" : "direct");
    inputRef.current?.focus();
  }

  async function handleResumeDecision(decision: "approve" | "reject", chosenPlaceId?: string) {
    if (!threadId || isLoading) return;
    dispatch(plannerActions.resumeRequested({
      decision,
      chosenPlaceId: decision === "approve" ? chosenPlaceId || selectedAlternativeId || undefined : undefined,
      locale: lang,
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input, inputOrigin === "example");
  }

  function handleSelectTrip(trip: Trip) {
    dispatch(plannerActions.activeTripSelected(trip));
  }

  return (
    <PlannerContainer>
      {/* Layout Container: Single centered column initially, 2-column split when trip is generated */}
      <PlannerLayout $hasTrip={Boolean(activeTrip)}>
        {/* Chat Column: Chat Stream & Input */}
        <ChatColumn>
          {/* Quick Profile Bar */}
          <PlannerToolbar>
            <button
              type="button"
              aria-expanded={isTravelConditionsOpen}
              aria-label={isTravelConditionsOpen ? t.plannerTravelConditionsClose : t.plannerTravelConditionsOpen}
              onClick={() => setIsTravelConditionsOpen((isOpen) => !isOpen)}
              style={{
                justifySelf: "start",
                minHeight: "36px",
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#334155",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {isTravelConditionsOpen ? "−" : "+"} {t.plannerTravelConditions}
            </button>

            {isTravelConditionsOpen && (
              <>
                <p style={{ margin: 0, color: "#64748b", fontSize: "0.78rem", lineHeight: 1.45 }}>
                  {t.plannerTravelConditionsHelp}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>

            <button
              type="button"
              onClick={() => setIsTravelScheduleOpen(true)}
              style={{
                padding: "4px 8px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#334155",
                cursor: "pointer",
              }}
            >
              📅 {profile.arrivalDate && profile.departureDate
                ? `${profile.arrivalDate.slice(5).replace("-", "/")}–${profile.departureDate.slice(5).replace("-", "/")}`
                : lang === "ko"
                  ? "도착·출발 일정"
                  : "到着・出発日程"}
            </button>

            <label style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#334155", fontWeight: 600 }}>
              <span>{t.plannerPartySize}</span>
              <input
                aria-label={t.plannerPartySize}
                type="number"
                min="1"
                max="50"
                inputMode="numeric"
                value={profile.partySize ?? ""}
                onChange={(e) => {
                  const value = e.target.value;
                  const next = Number(value);
                  setProfile({ ...profile, partySize: value === "" || !Number.isInteger(next) || next < 1 || next > 50 ? undefined : next });
                }}
              style={{
                width: "48px",
                minHeight: "32px",
                padding: "4px 6px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "#334155",
              }}
                placeholder={lang === "ko" ? "선택" : "任意"}
              />
              <span>{t.plannerPeopleUnit}</span>
            </label>

            {/* Hotel Search Button / Selected Pill */}
            {profile.hotel ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  border: "1.5px solid #2563eb",
                  backgroundColor: "#eff6ff",
                  color: "#1d4ed8",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                <span
                  onClick={() => setIsHotelModalOpen(true)}
                  style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "3px" }}
                  title={profile.hotel.roadAddress || profile.hotel.address || profile.hotel.name}
                >
                  🏨 {profile.hotel.name}
                </span>
                <button
                  type="button"
                  onClick={() => setProfile({ ...profile, hotel: undefined })}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#64748b",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    padding: "0 2px",
                    lineHeight: 1,
                  }}
                  title={lang === "ko" ? "숙소 선택 해제" : "解除"}
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsHotelModalOpen(true)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                }}
              >
                🏨 {lang === "ko" ? "숙소 검색" : "宿泊先検索"} 🔍
              </button>
            )}

            {/* Luggage Toggle */}
            <button
              type="button"
              onClick={() => setProfile({ ...profile, hasLuggage: !profile.hasLuggage })}
              style={{
                padding: "4px 10px",
                borderRadius: "8px",
                border: profile.hasLuggage ? "1.5px solid #2563eb" : "1px solid #cbd5e1",
                backgroundColor: profile.hasLuggage ? "#eff6ff" : "#ffffff",
                color: profile.hasLuggage ? "#1d4ed8" : "#64748b",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              🧳 {profile.hasLuggage ? (lang === "ko" ? "짐 보관 필요" : "荷物預かり必要") : (lang === "ko" ? "짐 보관 없음" : "荷物なし")}
            </button>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "8px", minWidth: "min(100%, 300px)" }}>
                  <label style={{ display: "grid", gap: "4px", color: "#334155", fontWeight: 600 }}>
                    <span>{t.plannerBudget}</span>
                    <input
                      aria-label={t.plannerBudget}
                      type="number"
                      min="0"
                      step="1000"
                      inputMode="numeric"
                      value={profile.budget ?? ""}
                      placeholder={t.plannerBudgetPlaceholder}
                      onChange={(e) => {
                        const value = e.target.value;
                        const next = Number(value);
                        setProfile({ ...profile, budget: value === "" || !Number.isFinite(next) || next < 0 ? undefined : Math.round(next) });
                      }}
                      style={{ minHeight: "36px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "6px 8px", fontSize: "0.82rem" }}
                    />
                  </label>
                  <label style={{ display: "grid", gap: "4px", color: "#334155", fontWeight: 600 }}>
                    <span>{t.plannerBudgetScope}</span>
                    <select
                      aria-label={t.plannerBudgetScope}
                      value={profile.budgetScope}
                      onChange={(e) => setProfile({ ...profile, budgetScope: e.target.value as TripProfile["budgetScope"] })}
                      style={{ minHeight: "36px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "6px 8px", fontSize: "0.82rem", background: "#fff" }}
                    >
                      <option value="per_person">{t.plannerBudgetPerPerson}</option>
                      <option value="total">{t.plannerBudgetTotal}</option>
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: "4px", color: "#334155", fontWeight: 600 }}>
                    <span>{t.plannerCompanions}</span>
                    <select
                      aria-label={t.plannerCompanions}
                      value={profile.companions ?? ""}
                      onChange={(e) => setProfile({ ...profile, companions: (e.target.value || undefined) as TripProfile["companions"] })}
                      style={{ minHeight: "36px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "6px 8px", fontSize: "0.82rem", background: "#fff" }}
                    >
                      <option value="">{t.plannerNotSpecified}</option>
                      <option value="solo">{t.plannerCompanionSolo}</option>
                      <option value="couple">{t.plannerCompanionCouple}</option>
                      <option value="friends">{t.plannerCompanionFriends}</option>
                      <option value="family">{t.plannerCompanionFamily}</option>
                      <option value="with_children">{t.plannerCompanionWithChildren}</option>
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: "4px", color: "#334155", fontWeight: 600 }}>
                    <span>{t.plannerPace}</span>
                    <select
                      aria-label={t.plannerPace}
                      value={profile.pace ?? ""}
                      onChange={(e) => setProfile({ ...profile, pace: (e.target.value || undefined) as TripProfile["pace"] })}
                      style={{ minHeight: "36px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "6px 8px", fontSize: "0.82rem", background: "#fff" }}
                    >
                      <option value="">{t.plannerNotSpecified}</option>
                      <option value="relaxed">{t.plannerPaceRelaxed}</option>
                      <option value="standard">{t.plannerPaceStandard}</option>
                      <option value="packed">{t.plannerPacePacked}</option>
                    </select>
                  </label>
                  <fieldset style={{ gridColumn: "1 / -1", margin: 0, padding: "8px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                    <legend style={{ fontSize: "0.82rem", fontWeight: 700 }}>{lang === "ko" ? "걷기·휴식 (선택)" : "徒歩・休憩（任意）"}</legend>
                    <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: "0.75rem", lineHeight: 1.45 }}>
                      {lang === "ko" ? "선택한 내용은 요청 문장에 함께 전달됩니다. 결과에 근거가 없으면 미확인으로 표시합니다." : "選択内容は依頼文に添えて送信されます。結果に根拠がない場合は未確認と表示します。"}
                    </p>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "8px" }}>
                      <label style={{ display: "grid", gap: "4px", color: "#334155", fontSize: "0.8rem", fontWeight: 600 }}>
                        <span>{lang === "ko" ? "한 구간 최대 도보" : "1区間の最大徒歩"}</span>
                        <select aria-label={lang === "ko" ? "한 구간 최대 도보" : "1区間の最大徒歩"} value={maxWalkMinutes} onChange={(e) => setMaxWalkMinutes(e.target.value as typeof maxWalkMinutes)} style={{ minHeight: "36px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "6px 8px", background: "#fff" }}>
                          <option value="">{t.plannerNotSpecified}</option>
                          <option value="15">{lang === "ko" ? "15분 이내" : "15分以内"}</option>
                          <option value="30">{lang === "ko" ? "30분 이내" : "30分以内"}</option>
                          <option value="45">{lang === "ko" ? "45분 이내" : "45分以内"}</option>
                        </select>
                      </label>
                      <label style={{ display: "grid", gap: "4px", color: "#334155", fontSize: "0.8rem", fontWeight: 600 }}>
                        <span>{lang === "ko" ? "휴식 간격" : "休憩の間隔"}</span>
                        <select aria-label={lang === "ko" ? "휴식 간격" : "休憩の間隔"} value={restIntervalMinutes} onChange={(e) => setRestIntervalMinutes(e.target.value as typeof restIntervalMinutes)} style={{ minHeight: "36px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "6px 8px", background: "#fff" }}>
                          <option value="">{t.plannerNotSpecified}</option>
                          <option value="60">{lang === "ko" ? "60분마다" : "60分ごと"}</option>
                          <option value="90">{lang === "ko" ? "90분마다" : "90分ごと"}</option>
                        </select>
                      </label>
                    </div>
                  </fieldset>
                  {profile.hasLuggage && (
                    <fieldset style={{ gridColumn: "1 / -1", margin: 0, padding: "8px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                      <legend style={{ fontSize: "0.82rem", fontWeight: 700 }}>{lang === "ko" ? "짐 보관 방법 (선택)" : "荷物の預け先（任意）"}</legend>
                      <label style={{ display: "grid", gap: "4px", color: "#334155", fontSize: "0.8rem", fontWeight: 600 }}>
                        <span>{lang === "ko" ? "먼저 처리할 방법" : "先に済ませたい方法"}</span>
                        <select aria-label={lang === "ko" ? "짐 보관 방법" : "荷物の預け先"} value={luggagePlan} onChange={(e) => setLuggagePlan(e.target.value as typeof luggagePlan)} style={{ minHeight: "36px", borderRadius: "8px", border: "1px solid #cbd5e1", padding: "6px 8px", background: "#fff" }}>
                          <option value="">{t.plannerNotSpecified}</option>
                          <option value="hotel-before-checkin">{lang === "ko" ? "체크인 전 숙소에 맡기기" : "チェックイン前にホテルへ預ける"}</option>
                          <option value="hotel-after-checkout">{lang === "ko" ? "체크아웃 후 숙소에 맡기기" : "チェックアウト後にホテルへ預ける"}</option>
                          <option value="locker">{lang === "ko" ? "로커 찾기" : "ロッカーを探す"}</option>
                        </select>
                      </label>
                    </fieldset>
                  )}
                  <fieldset style={{ gridColumn: "1 / -1", margin: 0, padding: "8px", border: "1px solid #cbd5e1", borderRadius: "8px" }}>
                    <legend style={{ fontSize: "0.82rem", fontWeight: 700 }}>{lang === "ko" ? "안전·이동 조건" : "安全・移動条件"}</legend>
                    <p style={{ margin: "0 0 6px", color: "#64748b", fontSize: "0.75rem" }}>
                      {lang === "ko" ? "확인 가능한 장소 근거가 없으면 미확인으로 안내됩니다." : "施設ごとの根拠がない場合は未確認として案内します。"}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {([
                        ["food_allergy", lang === "ko" ? "식품 알레르기" : "食物アレルギー"],
                        ["wheelchair", lang === "ko" ? "휠체어" : "車いす"],
                        ["stroller", lang === "ko" ? "유모차" : "ベビーカー"],
                        ["stairs_avoidance", lang === "ko" ? "계단 피하기" : "階段を避ける"],
                      ] as Array<[SafetyConstraint, string]>).map(([value, label]) => (
                        <label key={value} style={{ fontSize: "0.8rem" }}>
                          <input
                            type="checkbox"
                            checked={profile.safetyConstraints.includes(value)}
                            onChange={() => setProfile({
                              ...profile,
                              safetyConstraints: profile.safetyConstraints.includes(value)
                                ? profile.safetyConstraints.filter((item) => item !== value)
                                : [...profile.safetyConstraints, value],
                            })}
                          /> {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>
              </>
            )}
          </PlannerToolbar>

          {/* Chat Messages List */}
          <MessageList className="chat-messages-scroll">
            {messages.map((message) => {
              const isUser = message.role === "user";
              // The welcome message belongs to the current UI locale even after the
              // conversation starts. Keeping its initial string mixed Korean and
              // Japanese in the same chat after a language switch.
              const displayContent =
                message.id === "welcome-message" ? t.plannerWelcome : message.content;
              const webEvidence = message.verifiedPlaceFacts?.webEvidence;
              const webSources = webEvidence
                ? [
                    ...webEvidence.evidence.businessHours.sources,
                    ...webEvidence.evidence.price.sources,
                  ].filter(
                    (source, index, sources) =>
                      sources.findIndex((candidate) => candidate.url === source.url) === index,
                  )
                : [];

              return (
                <div
                  key={message.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isUser ? "flex-end" : "flex-start",
                    width: "100%",
                  }}
                >
                  {/* Message Bubble */}
                  {displayContent && (
                    <div
                      style={{
                        maxWidth: "88%",
                        padding: "12px 16px",
                        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        backgroundColor: isUser ? "#2563eb" : "#ffffff",
                        color: isUser ? "#ffffff" : "#1e293b",
                        fontSize: "0.92rem",
                        lineHeight: 1.55,
                        whiteSpace: "pre-wrap",
                        border: isUser ? "none" : "1px solid #e2e8f0",
                        boxShadow: isUser
                          ? "0 4px 12px rgba(37, 99, 235, 0.2)"
                          : "0 2px 6px rgba(0, 0, 0, 0.04)",
                      }}
                    >
                      {displayContent}
                    </div>
                  )}

                  {webEvidence && webSources.length > 0 && (
                    <div
                      data-testid="place-web-evidence"
                      style={{
                        marginTop: "8px",
                        padding: "11px 13px",
                        borderRadius: "12px",
                        backgroundColor: "#f0fdfa",
                        border: "1px solid #99f6e4",
                        maxWidth: "88%",
                        width: "100%",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "8px",
                          marginBottom: "7px",
                          color: "#115e59",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                        }}
                      >
                        <span>🔎 {lang === "ko" ? "웹 검색 근거" : "ウェブ検索の根拠"}</span>
                        <span>{webEvidence.cacheHit ? (lang === "ko" ? "캐시" : "キャッシュ") : (lang === "ko" ? "최신 확인" : "最新確認")}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        {webSources.map((source) => (
                          <a
                            key={source.url}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            style={{
                              color: "#0f766e",
                              fontSize: "0.78rem",
                              textDecoration: "underline",
                              overflowWrap: "anywhere",
                            }}
                          >
                            {source.title} ↗
                          </a>
                        ))}
                      </div>
                      <div style={{ marginTop: "7px", color: "#64748b", fontSize: "0.72rem" }}>
                        {lang === "ko"
                          ? "영업시간과 가격은 변경될 수 있으니 방문 전에 출처를 확인해 주세요."
                          : "営業時間・料金は変更される可能性があるため、訪問前に出典をご確認ください。"}
                      </div>
                    </div>
                  )}

                  {/* User-facing confirmation for a pending itinerary change. */}
                  {message.pendingAction && message.status === "awaiting_confirmation" && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "16px",
                        borderRadius: "16px",
                        backgroundColor: "#ffffff",
                        border: "1.5px solid #3b82f6",
                        boxShadow: "0 4px 16px rgba(59, 130, 246, 0.12)",
                        maxWidth: "92%",
                        width: "100%",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                        <span style={{ fontSize: "1.2rem" }}>
                          {message.pendingAction.action === "remove" ? "🗑️" : "🔄"}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#1e293b" }}>
                          {message.pendingAction.action === "remove"
                            ? lang === "ko"
                              ? `'${message.pendingAction.targetStop.placeName}' 삭제 확인`
                              : `「${message.pendingAction.targetStop.placeName}」削除の確認`
                            : lang === "ko"
                              ? `'${message.pendingAction.targetStop.placeName}' 대체 장소 선택`
                              : `「${message.pendingAction.targetStop.placeName}」の代替スポット選択`}
                        </span>
                      </div>

                      {/* Alternatives List for Replace */}
                      {message.pendingAction.action === "replace" && message.pendingAction.alternatives.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                          {message.pendingAction.alternatives.map((alt) => {
                            const isSelected = (selectedAlternativeId || message.pendingAction!.alternatives[0].placeId) === alt.placeId;
                            return (
                              <div
                                key={alt.placeId}
                                onClick={() => dispatch(plannerActions.alternativeSelected(alt.placeId))}
                                style={{
                                  padding: "10px 12px",
                                  borderRadius: "10px",
                                  border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                                  backgroundColor: isSelected ? "#eff6ff" : "#f8fafc",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontWeight: 700, fontSize: "0.88rem", color: isSelected ? "#1d4ed8" : "#1e293b" }}>
                                    {alt.name} <span style={{ fontSize: "0.76rem", color: "#64748b", fontWeight: 400 }}>({alt.category})</span>
                                  </span>
                                  {alt.distanceMeters != null && (
                                    <span style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: 600 }}>
                                      📍 {lang === "ko"
                                        ? `도보 약 ${Math.max(1, Math.round(alt.distanceMeters / 70))}분`
                                        : `徒歩 約${Math.max(1, Math.round(alt.distanceMeters / 70))}分`}
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "0.78rem", color: "#475569", marginTop: "4px", lineHeight: 1.4 }}>
                                  {alt.reason}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Warnings */}
                      {message.pendingAction.warnings && message.pendingAction.warnings.length > 0 && (
                        <div style={{ fontSize: "0.78rem", color: "#d97706", marginBottom: "12px", backgroundColor: "#fffbeb", padding: "8px 10px", borderRadius: "8px" }}>
                          ⚠️ {message.pendingAction.warnings.join(" ")}
                        </div>
                      )}

                      {/* Action Buttons: Approve vs Reject */}
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => void handleResumeDecision("approve", selectedAlternativeId || undefined)}
                          style={{
                            flex: 1,
                            padding: "9px 14px",
                            borderRadius: "10px",
                            backgroundColor: message.pendingAction.action === "remove" ? "#dc2626" : "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            fontWeight: 700,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                          }}
                        >
                          {message.pendingAction.action === "remove"
                            ? lang === "ko"
                              ? "🗑️ 삭제 승인 및 재계산"
                              : "🗑️ 削除してルート再計算"
                            : lang === "ko"
                              ? "✨ 선택한 장소로 교체 승인"
                              : "✨ 選択スポットに変更"}
                        </button>
                        <button
                          type="button"
                          disabled={isLoading}
                          onClick={() => void handleResumeDecision("reject")}
                          style={{
                            padding: "9px 14px",
                            borderRadius: "10px",
                            backgroundColor: "#f1f5f9",
                            color: "#475569",
                            border: "1px solid #cbd5e1",
                            fontWeight: 600,
                            fontSize: "0.85rem",
                            cursor: "pointer",
                          }}
                        >
                          {lang === "ko" ? "취소" : "キャンセル"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Compact Trip Card Pill (Clickable to display in the Right Itinerary Panel) */}
                  {message.resultTrip && (
                    <>
                    <div
                      onClick={() => handleSelectTrip(message.resultTrip!)}
                      style={{
                        marginTop: "8px",
                        padding: "12px 16px",
                        borderRadius: "14px",
                        backgroundColor:
                          activeTrip?.id === message.resultTrip.id
                            ? "#eff6ff"
                            : "#ffffff",
                        border:
                          activeTrip?.id === message.resultTrip.id
                            ? "2px solid #2563eb"
                            : "1px solid #e2e8f0",
                        cursor: "pointer",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "10px",
                        width: "100%",
                        maxWidth: "88%",
                        transition: "all 0.15s ease",
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          handleSelectTrip(message.resultTrip!);
                        }
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "1.4rem" }}>🗺️</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
                            {message.resultTrip.title ||
                              (lang === "ko" ? "추천 맞춤 여행 동선" : "おすすめルート")}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "2px" }}>
                            {(() => {
                              const tripObj = message.resultTrip!;
                              const costSum = tripObj.stops.reduce((sum, s) => sum + (s.estimatedCost ?? 0), 0);
                              const costText =
                                tripObj.estimatedTotalCost != null
                                  ? `${currency.format(tripObj.estimatedTotalCost)}${lang === "ko" ? "원" : "ウォン"}`
                                  : costSum > 0
                                    ? (lang === "ko" ? `최소 ${currency.format(costSum)}원~` : `最低 ${currency.format(costSum)}ウォン〜`)
                                    : (lang === "ko" ? "상세/현장 확인" : "詳細・現地確認");
                              return `📍 ${tripObj.stops.length}${lang === "ko" ? "개 장소" : "スポット"} · 💰 ${costText}`;
                            })()}
                          </div>
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          color: "#2563eb",
                          backgroundColor: "#dbeafe",
                          padding: "5px 10px",
                          borderRadius: "8px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {activeTrip?.id === message.resultTrip.id
                          ? (lang === "ko" ? "👉 지도 보고 있어요" : "👉 地図を表示中")
                          : (lang === "ko" ? "지도 보기" : "地図を見る")}
                      </span>
                    </div>
                    <p style={{ maxWidth: "88%", margin: "7px 0 0", color: "#64748b", fontSize: "0.78rem", lineHeight: 1.45 }}>
                      {lang === "ko"
                        ? "장소와 예상 비용은 이 대화에서 확인하고, 오른쪽 큰 지도에서 동선을 살펴보세요. 바꾸고 싶은 조건은 채팅으로 알려주세요."
                        : "スポットと目安の費用はこの会話で確認し、右側の大きな地図でルートを見てください。変更したい条件はチャットで教えてください。"}
                    </p>
                    </>
                  )}

                  {/* Interactive Action / Clarification Chips */}
                  {message.actionChips && message.actionChips.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        marginTop: "8px",
                        maxWidth: "88%",
                      }}
                    >
                      {message.actionChips.map((chip, idx) => (
                        <button
                          key={`${chip.label}-${idx}`}
                          type="button"
                          onClick={() => {
                            if (chip.requiresUserEdit) {
                              setInput(chip.query);
                              setInputOrigin("direct");
                              return;
                            }
                            const recoveryId = chip.type?.startsWith("recovery:")
                              ? chip.type.slice("recovery:".length)
                              : null;
                            const recoveryRelaxation =
                              recoveryId === "meal_cuisine" || recoveryId === "search_radius" || recoveryId === "route_constraints"
                                ? recoveryId
                                : null;
                            const relaxations = chip.requestPatch?.relaxations ?? (recoveryRelaxation ? [recoveryRelaxation] : []);
                            const retryMessage = [...messages].reverse().find((candidate) => candidate.role === "user")?.content;
                            void sendMessage(
                              relaxations.length > 0 || chip.mealPreference || chip.mealCuisine
                                ? (lastRetry?.message ?? retryMessage ?? chip.query)
                                : chip.query,
                              false,
                              relaxations,
                              chip.mutationTarget,
                              chip.mealPreference,
                              chip.mealCuisine,
                              chip.intent,
                              chip.questionId && chip.optionId
                                ? {
                                    questionId: chip.questionId,
                                    optionId: chip.optionId,
                                    expectedRevision: message.pendingQuestion?.revision,
                                  }
                                : undefined,
                            );
                          }}
                          style={{
                            backgroundColor: chip.type === "confirm" ? "#f0fdf4" : "#ffffff",
                            border: chip.type === "confirm" ? "1.5px solid #86efac" : "1px solid #cbd5e1",
                            color: chip.type === "confirm" ? "#166534" : "#1e293b",
                            borderRadius: "16px",
                            padding: "6px 12px",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            cursor: "pointer",
                            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
                            transition: "all 0.15s ease",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {message.errorCode && message.status === "failed" && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        backgroundColor: "#fef2f2",
                        color: "#991b1b",
                        fontSize: "0.85rem",
                        border: "1px solid #fecaca",
                        maxWidth: "88%",
                      }}
                    >
                      ⚠️ {message.content || "오류가 발생했습니다."}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  padding: "12px 16px",
                  borderRadius: "14px",
                  backgroundColor: "#ffffff",
                  border: "1.5px dashed #3b82f6",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "#1d4ed8",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  maxWidth: "90%",
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>🧭</span>
                <span>
                  {loadingStage === "checking"
                    ? lang === "ko"
                      ? "입력한 조건과 장소 후보를 확인하고 있어요…"
                      : "入力条件と候補スポットを確認しています…"
                    : loadingStage === "routing"
                      ? lang === "ko"
                        ? "장소와 이동 시간을 확인해 일정을 만들고 있어요…"
                        : "スポットと移動時間を確認して旅程を作っています…"
                      : lang === "ko"
                        ? "조금 더 확인이 필요해요. 기다리거나 취소하고 조건을 바꿔 보세요."
                        : "もう少し確認が必要です。待つか、キャンセルして条件を変えてください。"}
                </span>
                <button
                  type="button"
                  onClick={cancelGeneration}
                  style={{ marginLeft: "auto", minHeight: "36px", padding: "6px 10px", borderRadius: "8px", border: "1px solid #93c5fd", background: "#ffffff", color: "#1d4ed8", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  {lang === "ko" ? "취소" : "キャンセル"}
                </button>
              </div>
            )}

            {!isLoading && lastRetry && (
              <div role="status" style={{ maxWidth: "90%", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", padding: "10px 12px", border: "1px solid #fed7aa", borderRadius: "12px", background: "#fff7ed", color: "#9a3412", fontSize: "0.82rem" }}>
                <span>{lang === "ko" ? "요청을 고쳐서 다시 시도할 수 있어요." : "内容を直して再試行できます。"}</span>
                <button type="button" onClick={prepareRetry} style={{ minHeight: "36px", padding: "6px 10px", border: "1px solid #fdba74", borderRadius: "8px", background: "#ffffff", color: "#9a3412", fontWeight: 700, cursor: "pointer" }}>
                  {lang === "ko" ? "입력으로 다시 보기" : "入力欄で修正"}
                </button>
              </div>
            )}

            {/* Quick Suggestion Chips (Initial screen only) */}
            {messages.length === 1 && (
              <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {intentPrompt && (
                  <button
                    type="button"
                    onClick={() => {
                      setInput(intentPrompt);
                      setInputOrigin("example");
                    }}
                    style={{ minHeight: "44px", borderRadius: "10px", border: "1px solid #0f766e", background: "#f0fdfa", color: "#115e59", padding: "9px 12px", textAlign: "left", cursor: "pointer", fontWeight: 700, lineHeight: 1.4 }}
                  >
                    {lang === "ko" ? "선택한 예시를 입력창에 넣기" : "選んだ例を入力欄に入れる"}
                  </button>
                )}
                <p
                  style={{
                    margin: 0,
                    padding: "10px 12px",
                    borderRadius: "12px",
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    color: "#065f46",
                    fontSize: "0.84rem",
                    fontWeight: 650,
                    lineHeight: 1.5,
                  }}
                >
                  {t.plannerQuickStartHint}
                </p>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>
                  💡 {t.plannerExamplesHeading}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {quickPrompts.map((quickPrompt) => (
                    <button
                      key={quickPrompt.id}
                      type="button"
                      onClick={() => {
                        setInput(quickPrompt.prompt);
                        setInputOrigin("example");
                      }}
                      aria-label={lang === "ko" ? `${quickPrompt.prompt} 예시를 입력창에 넣기` : `例文「${quickPrompt.prompt}」を入力欄に入れる`}
                      style={{
                        backgroundColor: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "12px",
                        padding: "8px 12px",
                        fontSize: "0.84rem",
                        color: "#334155",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.15s ease",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)",
                      }}
                    >
                      {quickPrompt.prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </MessageList>

          {/* Chat Input Form */}
          <Composer onSubmit={handleSubmit}>
            <p id="planner-first-request-hint" style={{ margin: 0, color: "#475569", fontSize: "0.78rem", lineHeight: 1.45 }}>
              <strong>{t.plannerFirstRequestLabel}</strong><br />
              {t.plannerFirstRequestExample}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                aria-describedby="planner-first-request-hint"
                placeholder={t.plannerFirstRequestExample}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: "10px 16px",
                  borderRadius: "24px",
                  border: "1.5px solid #cbd5e1",
                  fontSize: "0.9rem",
                  outline: "none",
                  backgroundColor: "#f8fafc",
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="button button-primary"
                style={{
                  borderRadius: "24px",
                  padding: "10px 20px",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap",
                }}
              >
                {lang === "ko" ? "전송" : "送信"}
              </button>
            </div>
          </Composer>
        </ChatColumn>

        {/* Right Column: Interactive Itinerary & Map Panel (Appears only when trip exists) */}
        {activeTrip && (
          <ItineraryPanel className="itinerary-column">
            <GenerativeTripWidget
              trip={activeTrip}
              style={{
                border: "none",
                borderRadius: 0,
                boxShadow: "none",
                margin: 0,
              }}
            />
          </ItineraryPanel>
        )}
      </PlannerLayout>

      {/* Real-time Hotel Search Modal */}
      <HotelSearchModal
        isOpen={isHotelModalOpen}
        onClose={() => setIsHotelModalOpen(false)}
        onSelect={(hotel) => {
          setProfile({ ...profile, hotel });
          setIsHotelModalOpen(false);
        }}
        initialQuery={profile.hotel?.name || ""}
      />

      {isTravelScheduleOpen && (
        <ModalBackdrop
          role="dialog"
          aria-modal="true"
          aria-label={lang === "ko" ? "도착 및 출발 일정" : "到着・出発日程"}
        >
          <ScheduleDialog>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>
                  {lang === "ko" ? "도착 · 출발 일정" : "到着・出発日程"}
                </h2>
                <p style={{ margin: "6px 0 20px", fontSize: "0.84rem", lineHeight: 1.5, color: "#64748b" }}>
                  {lang === "ko"
                    ? "도착 날짜와 시간을 먼저 입력한 뒤, 출발 날짜와 시간을 입력해 주세요. 첫날은 도착 이후, 마지막 날은 출발 전까지만 일정을 만듭니다."
                    : "到着日時を先に入力し、その後に出発日時を入力してください。初日は到着後、最終日は出発前までの旅程を作成します。"}
                </p>
              </div>
              <button
                type="button"
                aria-label={lang === "ko" ? "닫기" : "閉じる"}
                onClick={() => setIsTravelScheduleOpen(false)}
                style={{ border: 0, background: "transparent", color: "#64748b", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "14px" }}>
              <fieldset style={{ display: "grid", gap: "10px", margin: 0, padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                <legend style={{ padding: "0 4px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>{lang === "ko" ? "1. 도착" : "1. 到着"}</legend>
                <label style={{ display: "grid", gap: "6px", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                {lang === "ko" ? "도착 날짜" : "到着日"}
                <input
                  aria-label={lang === "ko" ? "도착 날짜" : "到着日"}
                  type="date"
                  value={profile.arrivalDate ?? ""}
                  onChange={(e) => setProfile({ ...profile, arrivalDate: e.target.value })}
                />
              </label>
                <label style={{ display: "grid", gap: "6px", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                {lang === "ko" ? "도착 시간" : "到着時刻"}
                <input
                  aria-label={lang === "ko" ? "도착 시간" : "到着時刻"}
                  type="time"
                  value={profile.arrivalTime ?? ""}
                  onChange={(e) => setProfile({ ...profile, arrivalTime: e.target.value })}
                />
              </label>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
                {lang === "ko" ? "입국 공항" : "到着空港"}
                <select
                  aria-label={lang === "ko" ? "입국 공항" : "到着空港"}
                  value={profile.arrivalAirport ?? ""}
                  onChange={(e) => setProfile({ ...profile, arrivalAirport: (e.target.value || undefined) as AirportCode | undefined })}
                >
                  <option value="">{lang === "ko" ? "선택 안 함" : "指定なし"}</option>
                  <option value="ICN_T1">{lang === "ko" ? "인천공항 제1터미널" : "仁川国際空港 第1ターミナル"}</option>
                  <option value="ICN_T2">{lang === "ko" ? "인천공항 제2터미널" : "仁川国際空港 第2ターミナル"}</option>
                  <option value="GMP_INTL">{lang === "ko" ? "김포공항 국제선" : "金浦空港 国際線"}</option>
                  <option value="GMP_DOM">{lang === "ko" ? "김포공항 국내선" : "金浦空港 国内線"}</option>
                </select>
                </label>
              </fieldset>
              <fieldset style={{ display: "grid", gap: "10px", margin: 0, padding: "12px", border: "1px solid #e2e8f0", borderRadius: "10px" }}>
                <legend style={{ padding: "0 4px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>{lang === "ko" ? "2. 출발" : "2. 出発"}</legend>
                <label style={{ display: "grid", gap: "6px", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                {lang === "ko" ? "출발 날짜" : "出発日"}
                <input
                  aria-label={lang === "ko" ? "출발 날짜" : "出発日"}
                  type="date"
                  min={profile.arrivalDate}
                  value={profile.departureDate ?? ""}
                  onChange={(e) => setProfile({ ...profile, departureDate: e.target.value })}
                />
              </label>
                <label style={{ display: "grid", gap: "6px", fontSize: "0.8rem", fontWeight: 700, color: "#475569" }}>
                {lang === "ko" ? "출발 시간" : "出発時刻"}
                <input
                  aria-label={lang === "ko" ? "출발 시간" : "出発時刻"}
                  type="time"
                  value={profile.departureTime ?? ""}
                  onChange={(e) => setProfile({ ...profile, departureTime: e.target.value })}
                />
                </label>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
                {lang === "ko" ? "출국 공항" : "出発空港"}
                <select
                  aria-label={lang === "ko" ? "출국 공항" : "出発空港"}
                  value={profile.departureAirport ?? ""}
                  onChange={(e) => setProfile({ ...profile, departureAirport: (e.target.value || undefined) as AirportCode | undefined })}
                >
                  <option value="">{lang === "ko" ? "선택 안 함" : "指定なし"}</option>
                  <option value="ICN_T1">{lang === "ko" ? "인천공항 제1터미널" : "仁川国際空港 第1ターミナル"}</option>
                  <option value="ICN_T2">{lang === "ko" ? "인천공항 제2터미널" : "仁川国際空港 第2ターミナル"}</option>
                  <option value="GMP_INTL">{lang === "ko" ? "김포공항 국제선" : "金浦空港 国際線"}</option>
                  <option value="GMP_DOM">{lang === "ko" ? "김포공항 국내선" : "金浦空港 国内線"}</option>
                </select>
              </label>
              </fieldset>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "22px", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setProfile({ ...profile, arrivalDate: undefined, arrivalTime: undefined, arrivalAirport: undefined, departureDate: undefined, departureTime: undefined, departureAirport: undefined })}
                style={{ border: 0, background: "transparent", color: "#64748b", cursor: "pointer", fontWeight: 700 }}
              >
                {lang === "ko" ? "초기화" : "リセット"}
              </button>
              <button
                type="button"
                onClick={() => setIsTravelScheduleOpen(false)}
                style={{ border: 0, borderRadius: "8px", background: "#0f766e", color: "#fff", padding: "9px 15px", cursor: "pointer", fontWeight: 700 }}
              >
                {lang === "ko" ? "적용" : "適用"}
              </button>
            </div>
          </ScheduleDialog>
        </ModalBackdrop>
      )}
    </PlannerContainer>
  );
}
