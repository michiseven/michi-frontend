import {
  createBrowserClient,
  defineEvent,
  trackEvent,
  type BrowserLogFriendsClient,
  type EventDefinition,
} from "@logfriends/sdk";

export const MichiEvents = {
  tripRequested: defineEvent<{
    hasDate: boolean;
    hasBudget: boolean;
    hasTimeWindow?: boolean;
    hasStartArea?: boolean;
  }>({
    name: "tripRequested",
    description: "사용자가 여행 일정 생성을 요청했을 때 발생",
    fields: {
      hasDate: { description: "여행 날짜 지정 여부", type: "boolean", required: true },
      hasBudget: { description: "예산 지정 여부", type: "boolean", required: true },
      hasTimeWindow: { description: "시작/종료 시간 지정 여부", type: "boolean", required: false },
      hasStartArea: { description: "출발 지역 입력 여부", type: "boolean", required: false },
    },
  }),

  tripGenerated: defineEvent<{
    tripId: string;
    stopCount: number;
    providerMode?: string;
    usesMockProvider?: boolean;
    estimatedTotalCost?: number;
  }>({
    name: "tripGenerated",
    description: "추천 여행 일정이 성공적으로 생성되었을 때 발생",
    fields: {
      tripId: { description: "생성된 여행 ID", type: "string", required: true },
      stopCount: { description: "경유지 수", type: "number", required: true },
      providerMode: { description: "장소 제공자 모드 (live/mock)", type: "string", required: false },
      usesMockProvider: { description: "Mock 제공자 사용 여부", type: "boolean", required: false },
      estimatedTotalCost: { description: "예상 총 비용 (KRW)", type: "number", required: false },
    },
  }),

  placeViewed: defineEvent<{
    placeId: string;
    tripId?: string;
    category?: string;
  }>({
    name: "placeViewed",
    description: "타임라인 또는 지도에서 장소 카드를 조회했을 때 발생",
    fields: {
      placeId: { description: "장소 식별자", type: "string", required: true },
      tripId: { description: "연결된 여행 ID", type: "string", required: false },
      category: { description: "장소 카테고리", type: "string", required: false },
    },
  }),

  placeRemoved: defineEvent<{
    tripId: string;
    placeId?: string;
    stopCount?: number;
  }>({
    name: "placeRemoved",
    description: "일정에서 장소를 삭제했을 때 발생",
    fields: {
      tripId: { description: "수정된 여행 ID", type: "string", required: true },
      placeId: { description: "삭제된 장소 ID", type: "string", required: false },
      stopCount: { description: "삭제 후 남은 경유지 수", type: "number", required: false },
    },
  }),

  placeReordered: defineEvent<{
    tripId: string;
    stopCount?: number;
  }>({
    name: "placeReordered",
    description: "경유지 방문 순서를 변경했을 때 발생",
    fields: {
      tripId: { description: "수정된 여행 ID", type: "string", required: true },
      stopCount: { description: "전체 경유지 수", type: "number", required: false },
    },
  }),

  chatMessageSent: defineEvent<{
    threadId: string;
    messageLength: number;
    locale: string;
    hasActiveTrip: boolean;
  }>({
    name: "chatMessageSent",
    description: "대화형 플래너에서 채팅 메시지를 전송했을 때 발생",
    fields: {
      threadId: { description: "대화 스레드 ID", type: "string", required: true },
      messageLength: { description: "메시지 글자 수", type: "number", required: true },
      locale: { description: "대화 언어 (ko/ja)", type: "string", required: true },
      hasActiveTrip: { description: "기존 활성 일정 연결 여부", type: "boolean", required: true },
    },
  }),

  tripModified: defineEvent<{
    threadId: string;
    tripId: string;
    action: string;
    newPlaceId?: string;
  }>({
    name: "tripModified",
    description: "대화형 플래너에서 Human-in-the-loop 일정 수정을 승인/완료했을 때 발생",
    fields: {
      threadId: { description: "대화 스레드 ID", type: "string", required: true },
      tripId: { description: "수정된 여행 ID", type: "string", required: true },
      action: { description: "수정 액션 (replace/remove)", type: "string", required: true },
      newPlaceId: { description: "교체된 새 장소 ID", type: "string", required: false },
    },
  }),

  routeStarted: defineEvent<{
    tripId: string;
    stopCount?: number;
  }>({
    name: "routeStarted",
    description: "지도 길찾기 또는 여행 시작 안내를 열람했을 때 발생",
    fields: {
      tripId: { description: "여행 ID", type: "string", required: true },
      stopCount: { description: "경유지 수", type: "number", required: false },
    },
  }),

  routeCompleted: defineEvent<{
    tripId: string;
    stopCount?: number;
  }>({
    name: "routeCompleted",
    description: "전체 경로 열람을 마쳤을 때 발생",
    fields: {
      tripId: { description: "여행 ID", type: "string", required: true },
      stopCount: { description: "경유지 수", type: "number", required: false },
    },
  }),

  placeAdded: defineEvent<{
    tripId: string;
    placeId: string;
    action?: string;
  }>({
    name: "placeAdded",
    description: "일정에서 장소를 교체하거나 추가했을 때 발생",
    fields: {
      tripId: { description: "수정된 여행 ID", type: "string", required: true },
      placeId: { description: "추가 또는 교체된 장소 ID", type: "string", required: true },
      action: { description: "수정 종류", type: "string", required: false },
    },
  }),
};

let browserClient: BrowserLogFriendsClient | undefined;

export function getLogFriendsClient(): BrowserLogFriendsClient {
  if (browserClient) return browserClient;

  const endpoint = process.env.NEXT_PUBLIC_LOG_FRIENDS_ENDPOINT?.trim();
  browserClient = createBrowserClient({
    ingestUrl: endpoint || 'http://localhost:8080/ingest',
    workerId: 'michi-frontend',
    maxQueueSize: 200,
    batchSize: 20,
  });

  return browserClient;
}

export type MichiEventName = keyof typeof MichiEvents | (typeof MichiEvents)[keyof typeof MichiEvents]["name"];

export interface EventFields {
  tripId?: string;
  placeId?: string;
  context?: Record<string, unknown>;
  /** Overrides the default UI branch when the same event can originate from multiple components. */
  componentPath?: string[];
}

const defaultComponentPaths: Record<string, string[]> = {
  tripRequested: ["HomePage", "GenerativeChatPlanner", "ChatComposer"],
  tripGenerated: ["HomePage", "GenerativeChatPlanner", "ChatResponse"],
  placeViewed: ["HomePage", "TripView", "TripTimeline", "PlaceCard"],
  placeRemoved: ["HomePage", "TripView", "TripTimeline", "PlaceCard"],
  placeReordered: ["HomePage", "TripView", "TripTimeline"],
  chatMessageSent: ["HomePage", "GenerativeChatPlanner", "ChatComposer"],
  tripModified: ["HomePage", "GenerativeChatPlanner", "TripEditDecision"],
  routeStarted: ["HomePage", "TripView", "RouteControls"],
  routeCompleted: ["HomePage", "TripView", "RouteControls"],
  placeAdded: ["HomePage", "TripView", "TripTimeline", "PlaceCard"],
};

/**
 * 하위 호환성 텔레메트리 래퍼.
 * 안전하게 Log Friends SDK로 이벤트를 기록하며, UI 렌더링을 절대 방해하지 않습니다.
 */
export function captureMichiEvent(
  eventName: string,
  fields: EventFields = {},
): void {
  try {
    const client = getLogFriendsClient();

    // Map string event names to defined schemas
    const schemaMap: Record<string, EventDefinition<Record<string, unknown>>> = {
      trip_requested: MichiEvents.tripRequested as unknown as EventDefinition<Record<string, unknown>>,
      trip_generated: MichiEvents.tripGenerated as unknown as EventDefinition<Record<string, unknown>>,
      place_viewed: MichiEvents.placeViewed as unknown as EventDefinition<Record<string, unknown>>,
      place_removed: MichiEvents.placeRemoved as unknown as EventDefinition<Record<string, unknown>>,
      place_reordered: MichiEvents.placeReordered as unknown as EventDefinition<Record<string, unknown>>,
      chat_message_sent: MichiEvents.chatMessageSent as unknown as EventDefinition<Record<string, unknown>>,
      trip_modified: MichiEvents.tripModified as unknown as EventDefinition<Record<string, unknown>>,
      route_started: MichiEvents.routeStarted as unknown as EventDefinition<Record<string, unknown>>,
      route_completed: MichiEvents.routeCompleted as unknown as EventDefinition<Record<string, unknown>>,
      place_added: MichiEvents.placeAdded as unknown as EventDefinition<Record<string, unknown>>,
    };

    const targetSchema = schemaMap[eventName] ?? (MichiEvents as Record<string, EventDefinition<Record<string, unknown>>>)[eventName];
    const payload: Record<string, unknown> = {
      ...(fields.context || {}),
    };
    if (fields.tripId !== undefined) payload.tripId = fields.tripId;
    if (fields.placeId !== undefined) payload.placeId = fields.placeId;

    const componentPath = fields.componentPath ?? defaultComponentPaths[targetSchema?.name ?? eventName];
    const trackOptions = componentPath ? { uiContext: { componentPath } } : undefined;

    if (targetSchema) {
      if (trackOptions) {
        trackEvent(client, targetSchema, payload, trackOptions);
      } else {
        trackEvent(client, targetSchema, payload);
      }
    } else {
      client.track(eventName, payload, trackOptions);
    }
  } catch {
    // Fail-safe: Telemetry failures never interrupt UI
  }
}
