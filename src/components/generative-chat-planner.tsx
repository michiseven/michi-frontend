"use client";

import { useEffect, useRef, useState } from "react";
import {
  getStoredEditToken,
  storeEditToken,
  createChatThread,
  sendChatMessage,
  resumeChatThread,
} from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type {
  ActionChip,
  PendingTripMutation,
  ReplacementCandidate,
  SearchHotelItem,
  Trip,
  VerifiedPlaceFacts,
} from "@/lib/types";
import { GenerativeTripWidget } from "./generative-trip-widget";
import { HotelSearchModal } from "./hotel-search-modal";
import { captureMichiEvent } from "@/lib/telemetry";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionChips?: ActionChip[];
  status?: "completed" | "awaiting_confirmation" | "rejected" | "failed";
  pendingAction?: PendingTripMutation | null;
  alternatives?: ReplacementCandidate[];
  verifiedPlaceFacts?: VerifiedPlaceFacts | null;
  resultTrip?: Trip | null;
  errorCode?: string | null;
}

export interface TripProfile {
  partySize: "1" | "2" | "3+";
  /** 서울 도착일과 여행을 시작할 수 있는 시각. */
  arrivalDate?: string;
  arrivalTime?: string;
  /** 서울 출발일과 여행을 마쳐야 하는 시각. */
  departureDate?: string;
  departureTime?: string;
  hotel?: SearchHotelItem;
  hasLuggage: boolean;
}

interface GenerativeChatPlannerProps {
  onTripGenerated?: (tripId: string) => void;
}

let idCounter = 0;
function generateMessageId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}-${Math.random().toString(36).slice(2, 7)}`;
}

export function GenerativeChatPlanner({ onTripGenerated }: GenerativeChatPlannerProps) {
  const { lang } = useI18n();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadSecret, setThreadSecret] = useState<string | null>(null);
  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string | null>(null);

  const [profile, setProfile] = useState<TripProfile>({
    partySize: "2",
    hotel: undefined,
    hasLuggage: false,
  });

  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [isTravelScheduleOpen, setIsTravelScheduleOpen] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-message",
      role: "assistant",
      content:
        lang === "ko"
          ? "안녕하세요! 서울 여행 전문 AI 플래너 Michi입니다. 🇰🇷✨\n원하시는 지역(성수, 홍대, 명동 등), 예산, 좋아하는 분위기나 음식을 자유롭게 말씀해 주세요! 위의 기본 설정(일정·인원·숙소 검색)을 맞추시면 더욱 정밀한 코스를 안내해 드립니다."
          : "こんにちは！ソウル専門AIトラベルプランナーのMichiです。🇰🇷✨\n行きたいエリア（聖水、弘大、明洞など）、予算、好きな雰囲気や料理を自由にお話しください！上部の基本設定（日程・人数・宿泊先検索）を合わせると、よりぴったりのルートをご案内します。",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);

  const currency = new Intl.NumberFormat(lang === "ko" ? "ko-KR" : "ja-JP");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, isLoading]);

  const quickPrompts =
    lang === "ko"
      ? [
          "☕ 내일 성수동에서 5만원으로 조용한 카페랑 저녁 삼겹살",
          "🏯 경복궁 & 서촌 한옥마을 반나절 산책 코스",
          "🛍️ 홍대 & 연남동 맛집 탐방과 쇼핑 코스",
          "🍜 명동교자 먹고 을지로 힙지로 투어",
        ]
      : [
          "☕ 明日、聖水洞で5万ウォン予算で静かなカフェと夜のサムギョプサル",
          "🏯 景福宮＆西村の韓屋村半日散歩ルート",
          "🛍️ 弘大＆延南洞のグルメ巡りとショッピング",
          "🍜 明洞餃子を食べて乙支路ヒップジロツアー",
        ];

  async function getOrCreateThreadInfo(): Promise<{ threadId: string; threadSecret: string }> {
    if (threadId && threadSecret) return { threadId, threadSecret };
    const res = await createChatThread(lang, activeTrip?.id);
    setThreadId(res.threadId);
    setThreadSecret(res.threadSecret);
    return res;
  }

  async function sendMessage(textToSend: string) {
    if (!textToSend.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateMessageId("user"),
      role: "user",
      content: textToSend,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      const threadInfo = await getOrCreateThreadInfo();
      const res = await sendChatMessage(threadInfo.threadId, {
        message: textToSend,
        locale: lang,
        currentTripId: activeTrip?.id,
        profile: {
          hotel: profile.hotel,
          partySize: profile.partySize,
          hasLuggage: profile.hasLuggage,
          arrivalDate: profile.arrivalDate,
          arrivalTime: profile.arrivalTime,
          departureDate: profile.departureDate,
          departureTime: profile.departureTime,
        },
        threadSecret: threadInfo.threadSecret,
        editToken: activeTrip?.id ? (getStoredEditToken(activeTrip.id) ?? undefined) : undefined,
      });

      if (res.threadSecret && !threadSecret) {
        setThreadSecret(res.threadSecret);
      }

      captureMichiEvent("chat_message_sent", {
        context: {
          threadId: threadInfo.threadId,
          messageLength: textToSend.length,
          locale: lang,
          hasActiveTrip: !!activeTrip?.id,
        },
      });

      const assistantMessage: ChatMessage = {
        id: generateMessageId("assistant"),
        role: "assistant",
        content: res.responseMessage,
        actionChips: res.actionChips,
        status: res.status,
        pendingAction: res.pendingAction,
        alternatives: res.alternatives,
        verifiedPlaceFacts: res.verifiedPlaceFacts,
        resultTrip: res.resultTrip,
        errorCode: res.errorCode,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (res.alternatives && res.alternatives.length > 0) {
        setSelectedAlternativeId(res.alternatives[0].placeId);
      }

      if (res.resultTrip?.id) {
        if (res.editToken) {
          storeEditToken(res.resultTrip.id, res.editToken);
          res.resultTrip.editToken = res.editToken;
          res.resultTrip.isEditable = true;
        }
        captureMichiEvent("trip_generated", {
          tripId: res.resultTrip.id,
          context: {
            stopCount: res.resultTrip.stops?.length ?? 0,
            providerMode: res.resultTrip.providerModes?.place ?? "unknown",
            estimatedTotalCost: res.resultTrip.estimatedTotalCost,
          },
        });
        setActiveTrip(res.resultTrip);
        if (onTripGenerated) {
          onTripGenerated(res.resultTrip.id);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateMessageId("err"),
          role: "assistant",
          content:
            lang === "ko"
              ? "응답을 받아오는 중 오류가 발생했습니다. 다시 시도해 주세요."
              : "応答の取得中にエラーが発生しました。もう一度お試しください。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResumeDecision(decision: "approve" | "reject", chosenPlaceId?: string) {
    if (!threadId || isLoading) return;
    setIsLoading(true);

    const editToken = activeTrip?.id ? (getStoredEditToken(activeTrip.id) ?? undefined) : undefined;

    try {
      const res = await resumeChatThread(threadId, {
        decision,
        chosenPlaceId: decision === "approve" ? (chosenPlaceId || selectedAlternativeId || undefined) : undefined,
        threadSecret: threadSecret || undefined,
        editToken,
      });

      const assistantMessage: ChatMessage = {
        id: generateMessageId("assistant"),
        role: "assistant",
        content: res.responseMessage,
        actionChips: res.actionChips,
        status: res.status,
        pendingAction: res.pendingAction,
        resultTrip: res.resultTrip,
        errorCode: res.errorCode,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (res.resultTrip?.id) {
        if (decision === "approve") {
          captureMichiEvent("trip_modified", {
            tripId: res.resultTrip.id,
            context: {
              threadId,
              action: "replace",
              newPlaceId: chosenPlaceId || selectedAlternativeId,
            },
          });
        }
        setActiveTrip(res.resultTrip);
        if (onTripGenerated) {
          onTripGenerated(res.resultTrip.id);
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: generateMessageId("err"),
          role: "assistant",
          content:
            lang === "ko"
              ? "일정 변경 처리 중 오류가 발생했습니다."
              : "プラン変更の処理中にエラーが発生しました。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  function handleSelectTrip(trip: Trip) {
    setActiveTrip(trip);
  }

  return (
    <div className="generative-chat-container" style={{ width: "100%" }}>
      {/* Layout Container: Single centered column initially, 2-column split when trip is generated */}
      <div className={activeTrip ? "chat-split-layout" : "chat-single-layout"}>
        {/* Chat Column: Chat Stream & Input */}
        <div
          className="chat-column"
          style={{
            display: "flex",
            flexDirection: "column",
            height: "760px",
            backgroundColor: "#ffffff",
            borderRadius: "20px",
            border: "1.5px solid #e2e8f0",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Quick Profile Bar */}
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              overflowX: "auto",
              whiteSpace: "nowrap",
              fontSize: "0.82rem",
            }}
          >
            <span style={{ fontWeight: 700, color: "#475569", display: "flex", alignItems: "center", gap: "4px" }}>
              ⚙️ {lang === "ko" ? "여행 조건:" : "条件:"}
            </span>

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
                  ? "입국·출국 일정"
                  : "入国・出国日程"}
            </button>

            {/* Party Size Selector */}
            <select
              value={profile.partySize}
              onChange={(e) => setProfile({ ...profile, partySize: e.target.value as TripProfile["partySize"] })}
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
              <option value="1">👤 {lang === "ko" ? "1인(혼자)" : "1人(ソロ)"}</option>
              <option value="2">👥 {lang === "ko" ? "2인(커플·친구)" : "2人(ペア)"}</option>
              <option value="3+">👨‍👩‍👧 {lang === "ko" ? "3인+(그룹)" : "3人+(グループ)"}</option>
            </select>

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

          {/* Chat Messages List */}
          <div
            className="chat-messages-scroll"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              backgroundColor: "#f8fafc",
            }}
          >
            {messages.map((message) => {
              const isUser = message.role === "user";
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
                  {message.content && (
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
                      {message.content}
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
                        <span>{webEvidence.cacheHit ? (lang === "ko" ? "캐시" : "キャッシュ") : "LIVE"}</span>
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

                  {/* LangGraph Interrupt Approval & Confirmation Card */}
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
                                onClick={() => setSelectedAlternativeId(alt.placeId)}
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
                                      📍 도보 약 {Math.max(1, Math.round(alt.distanceMeters / 70))}분
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
                          ? (lang === "ko" ? "👉 우측 동선 보기" : "👉 右側で表示中")
                          : (lang === "ko" ? "동선 선택" : "選択")}
                      </span>
                    </div>
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
                          onClick={() => void sendMessage(chip.query)}
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
                  {lang === "ko"
                    ? "LangGraph 워크플로를 통해 장소를 검증하고 동선을 계산하는 중..."
                    : "LangGraphワークフローでスポットを検証し、旅程を計算中..."}
                </span>
              </div>
            )}

            {/* Quick Suggestion Chips (Initial screen only) */}
            {messages.length === 1 && (
              <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>
                  💡 {lang === "ko" ? "추천 질문 예시를 눌러보세요" : "おすすめの質問例をタップ"}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void sendMessage(prompt)}
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
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              padding: "14px 16px",
              backgroundColor: "#ffffff",
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                lang === "ko"
                  ? "예: 성수동에서 조용한 카페와 삼겹살 맛집"
                  : "例：聖水洞でおすすめカフェとサムギョプサル"
              }
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
          </form>
        </div>

        {/* Right Column: Interactive Itinerary & Map Panel (Appears only when trip exists) */}
        {activeTrip && (
          <div
            className="itinerary-column"
            style={{
              height: "760px",
              backgroundColor: "#ffffff",
              borderRadius: "20px",
              border: "1.5px solid #e2e8f0",
              overflowY: "auto",
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.05)",
              animation: "chatFadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                padding: "8px 14px",
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTrip(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 8px",
                  borderRadius: "6px",
                }}
              >
                ✕ {lang === "ko" ? "동선 패널 닫기" : "プランを閉じる"}
              </button>
            </div>
            <GenerativeTripWidget
              trip={activeTrip}
              style={{
                border: "none",
                borderRadius: 0,
                boxShadow: "none",
                margin: 0,
              }}
            />
          </div>
        )}
      </div>

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
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lang === "ko" ? "입국 및 출국 일정" : "入国・出国日程"}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            background: "rgba(15, 23, 42, 0.42)",
          }}
        >
          <div
            style={{
              width: "min(100%, 430px)",
              borderRadius: "16px",
              background: "#fff",
              padding: "24px",
              boxShadow: "0 24px 56px rgba(15, 23, 42, 0.24)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "16px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.15rem", color: "#0f172a" }}>
                  {lang === "ko" ? "입국 · 출국 일정" : "入国・出国日程"}
                </h2>
                <p style={{ margin: "6px 0 20px", fontSize: "0.84rem", lineHeight: 1.5, color: "#64748b" }}>
                  {lang === "ko"
                    ? "첫날에는 입국 시간 이후, 마지막 날에는 출국 시간 전까지만 일정을 만듭니다."
                    : "初日は到着時刻以降、最終日は出国時刻までの旅程を作成します。"}
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
                {lang === "ko" ? "입국 날짜" : "入国日"}
                <input
                  aria-label={lang === "ko" ? "입국 날짜" : "入国日"}
                  type="date"
                  value={profile.arrivalDate ?? ""}
                  onChange={(e) => setProfile({ ...profile, arrivalDate: e.target.value })}
                />
              </label>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
                {lang === "ko" ? "입국 시간" : "入国時刻"}
                <input
                  aria-label={lang === "ko" ? "입국 시간" : "入国時刻"}
                  type="time"
                  value={profile.arrivalTime ?? ""}
                  onChange={(e) => setProfile({ ...profile, arrivalTime: e.target.value })}
                />
              </label>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
                {lang === "ko" ? "출국 날짜" : "出国日"}
                <input
                  aria-label={lang === "ko" ? "출국 날짜" : "出国日"}
                  type="date"
                  min={profile.arrivalDate}
                  value={profile.departureDate ?? ""}
                  onChange={(e) => setProfile({ ...profile, departureDate: e.target.value })}
                />
              </label>
              <label style={{ display: "grid", gap: "6px", fontSize: "0.85rem", fontWeight: 700, color: "#334155" }}>
                {lang === "ko" ? "출국 시간" : "出国時刻"}
                <input
                  aria-label={lang === "ko" ? "출국 시간" : "出国時刻"}
                  type="time"
                  value={profile.departureTime ?? ""}
                  onChange={(e) => setProfile({ ...profile, departureTime: e.target.value })}
                />
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "22px", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setProfile({ ...profile, arrivalDate: undefined, arrivalTime: undefined, departureDate: undefined, departureTime: undefined })}
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
          </div>
        </div>
      )}
    </div>
  );
}
