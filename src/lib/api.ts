import { clearAuthSession, getAccessToken, setAuthSession } from "./auth";
import { demoTrip } from "./demo-data";
import type {
  AuthResponse,
  ChangePasswordInput,
  ChatResponse,
  CreateThreadResponse,
  GenerateTripInput,
  LoginInput,
  PaginatedSavedTrips,
  RegisterInput,
  SaveTripInput,
  SearchHotelItem,
  StopPatch,
  Trip,
  UpdateProfileInput,
  User,
  UserSavedTrip,
} from "./types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
).replace(/\/$/, "");
export const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
let demoState: Trip = structuredClone(demoTrip);
let demoSavedTrips: UserSavedTrip[] = [];

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window !== "undefined") {
    try {
      const token = getAccessToken();
      if (token) {
        return { Authorization: `Bearer ${token}` };
      }
    } catch {
      // Ignore on server
    }
  }
  return {};
}

let activeRefreshPromise: Promise<AuthResponse | null> | null = null;

export async function refreshAuthTokens(): Promise<AuthResponse | null> {
  if (demoMode) {
    const demoAuth: AuthResponse = {
      user: {
        id: "demo-user-1",
        displayName: "デモユーザー",
        email: "demo@michi.local",
        locale: "ja",
        createdAt: new Date().toISOString(),
      },
      accessToken: "demo-access-token",
      expiresIn: 3600,
    };
    setAuthSession(demoAuth);
    return demoAuth;
  }

  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!response.ok) {
        clearAuthSession();
        return null;
      }

      const payload = (await response.json()) as AuthResponse;
      setAuthSession(payload);
      return payload;
    } catch {
      clearAuthSession();
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
  isRetry = false,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
        ...init?.headers,
      },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[API FETCH ERROR] ${apiBaseUrl}${path}:`, error);
    throw new ApiError(
      `서버 연결 실패 (${apiBaseUrl}${path}): ${errorMsg}`,
      undefined,
      "NETWORK_ERROR",
    );
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const isAuthEndpoint =
    path.startsWith("/auth/login") ||
    path.startsWith("/auth/register") ||
    path.startsWith("/auth/refresh");

  if (response.status === 401 && !isAuthEndpoint && !isRetry) {
    const refreshed = await refreshAuthTokens();
    if (refreshed) {
      return requestJson<T>(path, init, true);
    }
  }

  const payload = (await response.json().catch(() => undefined)) as
    { message?: string; code?: string } | undefined;
  if (!response.ok) {
    if (response.status === 401 && path.startsWith("/users/")) {
      clearAuthSession();
    }
    throw new ApiError(
      payload?.message ?? "リクエストを完了できませんでした。",
      response.status,
      payload?.code,
    );
  }
  return payload as T;
}

function normalizeTrip(payload: unknown): Trip {
  const envelope = payload as {
    data?: unknown;
    trip?: unknown;
    editToken?: string;
    providerModes?: Trip["providerModes"];
    providerSources?: Trip["providerSources"];
    warnings?: string[];
    meta?: {
      providerModes?: Trip["providerModes"];
      providerSources?: Trip["providerSources"];
      warnings?: string[];
    };
  };
  const raw = (envelope?.data ?? envelope?.trip ?? payload) as Partial<Trip>;
  if (!raw || typeof raw !== "object" || !raw.id || !Array.isArray(raw.stops)) {
    throw new ApiError(
      "APIの応答形式が正しくありません。",
      undefined,
      "INVALID_RESPONSE",
    );
  }
  const editToken = envelope.editToken ?? raw.editToken;
  return {
    ...raw,
    id: String(raw.id),
    ...(editToken ? { editToken } : {}),
    date: raw.date ?? "",
    startTime: raw.startTime ?? raw.preference?.startTime ?? "",
    endTime: raw.endTime ?? raw.preference?.endTime ?? "",
    stops: [...raw.stops].sort((a, b) => a.order - b.order),
    providerModes:
      raw.providerModes ??
      envelope.providerModes ??
      envelope.meta?.providerModes ??
      {},
    providerSources:
      raw.providerSources ??
      envelope.providerSources ??
      envelope.meta?.providerSources,
    warnings:
      raw.warnings ?? envelope.warnings ?? envelope.meta?.warnings ?? [],
  } as Trip;
}

export function getStoredEditToken(tripId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(`michi_edit_token_${tripId}`);
  } catch {
    return null;
  }
}

export function storeEditToken(tripId: string, token: string | null | undefined): void {
  if (typeof window === "undefined" || !token) return;
  try {
    localStorage.setItem(`michi_edit_token_${tripId}`, token);
  } catch {
    // Ignore storage failure
  }
}

export async function generateTrip(input: GenerateTripInput): Promise<Trip> {
  if (demoMode) {
    demoState = structuredClone(demoTrip);
    if (input.travelDate) demoState.date = input.travelDate;
    return structuredClone(demoState);
  }
  const payload = await requestJson<{ trip: Trip; editToken?: string }>("/trips/generate", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const normalized = normalizeTrip(payload);
  const token = payload?.editToken ?? normalized.editToken;
  if (token) {
    storeEditToken(normalized.id, token);
    normalized.editToken = token;
    normalized.isEditable = true;
  }
  return normalized;
}

export async function getTrip(id: string): Promise<Trip> {
  if (demoMode) {
    if (id !== demoTrip.id)
      throw new ApiError("デモ旅程が見つかりません。", 404, "NOT_FOUND");
    return structuredClone(demoState);
  }
  const editToken = getStoredEditToken(id);
  const payload = await requestJson<unknown>(
    `/trips/${encodeURIComponent(id)}`,
    {
      headers: editToken ? { "x-edit-token": editToken } : undefined,
    },
  );
  const normalized = normalizeTrip(payload);
  if (normalized.editToken) {
    storeEditToken(normalized.id, normalized.editToken);
  }
  return normalized;
}

export async function patchTripStops(
  id: string,
  patch: StopPatch,
  explicitToken?: string | null,
): Promise<Trip> {
  if (demoMode) {
    const trip = structuredClone(demoState);
    if (patch.action === "remove")
      trip.stops = trip.stops.filter((stop) => stop.id !== patch.stopId);
    if (patch.action === "reorder") {
      trip.stops.sort(
        (a, b) => patch.stopIds.indexOf(a.id) - patch.stopIds.indexOf(b.id),
      );
    }
    trip.stops = trip.stops.map((stop, index) => ({
      ...stop,
      order: index + 1,
    }));
    demoState = trip;
    return structuredClone(demoState);
  }
  const editToken = explicitToken || getStoredEditToken(id);
  const payload = await requestJson<unknown>(
    `/trips/${encodeURIComponent(id)}/stops`,
    {
      method: "PATCH",
      headers: editToken ? { "x-edit-token": editToken } : undefined,
      body: JSON.stringify(patch),
    },
  );
  return normalizeTrip(payload);
}

export async function getStopAlternatives(
  tripId: string,
  stopId: string,
): Promise<import("./types").StopAlternativesResponse> {
  if (demoMode) {
    return {
      targetStop: { id: stopId, name: "현재 장소", category: "음식점" },
      alternatives: [
        {
          placeId: "demo-alt-1",
          name: "대안 추천 장소 1",
          category: "한식",
          address: "서울 중구 명동",
          roadAddress: "서울 중구 명동길 12",
          latitude: 37.563,
          longitude: 126.985,
          estimatedCost: 11000,
          priceEvidence: {
            source: "manual",
            verificationStatus: "verified",
            sourceTitle: "DEMO fixture",
            averageCostKrw: 11000,
            minPriceKrw: 9000,
            maxPriceKrw: 11000,
            representativeMenu: "대표 메뉴 (9,000원 ~ 11,000원)",
            lastFetchedAt: new Date().toISOString(),
          },
          reason: "대체 가능한 한식 맛집 (도보 3분)",
          distanceMeters: 250,
        },
      ],
    };
  }
  return requestJson<import("./types").StopAlternativesResponse>(
    `/trips/${encodeURIComponent(tripId)}/stops/${encodeURIComponent(stopId)}/alternatives`,
  );
}

// ─── 회원 및 인증 API ───────────────────────────────────────────────────────

export async function registerUser(
  input: RegisterInput,
): Promise<AuthResponse> {
  if (demoMode) {
    return {
      user: {
        id: "demo-user-1",
        displayName: input.displayName,
        email: input.email,
        locale: input.locale ?? "ja",
        createdAt: new Date().toISOString(),
      },
      accessToken: "demo-access-token",
      expiresIn: 3600,
    };
  }
  return requestJson<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  if (demoMode) {
    return {
      user: {
        id: "demo-user-1",
        displayName: "デモユーザー",
        email: input.email,
        locale: "ja",
        createdAt: new Date().toISOString(),
      },
      accessToken: "demo-access-token",
      expiresIn: 3600,
    };
  }
  return requestJson<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function logoutUser(): Promise<void> {
  if (!demoMode) {
    await fetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      credentials: "include",
    }).catch(() => {});
  }
  clearAuthSession();
}

export async function getProfile(): Promise<User> {
  if (demoMode) {
    return {
      id: "demo-user-1",
      displayName: "デモユーザー",
      email: "demo@michi.local",
      locale: "ja",
      createdAt: new Date().toISOString(),
    };
  }
  return requestJson<User>("/users/me");
}

export async function updateProfile(input: UpdateProfileInput): Promise<User> {
  if (demoMode) {
    return {
      id: "demo-user-1",
      displayName: input.displayName ?? "デモユーザー",
      email: "demo@michi.local",
      locale: input.locale ?? "ja",
      createdAt: new Date().toISOString(),
    };
  }
  return requestJson<User>("/users/me", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<void> {
  if (demoMode) return;
  return requestJson<void>("/users/me/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── 저장된 일정 관리 ────────────────────────────────────────────────────

export async function saveUserTrip(
  input: SaveTripInput,
): Promise<UserSavedTrip> {
  if (demoMode) {
    const item: UserSavedTrip = {
      id: `saved-${Date.now()}`,
      userId: "demo-user-1",
      tripId: input.tripId,
      title: input.title ?? "保存された旅程",
      travelDate: input.travelDate ?? "",
      stopsCount: input.stopsCount ?? 0,
      estimatedTotalCost: input.estimatedTotalCost ?? null,
      tripSnapshot: input.tripSnapshot ?? null,
      memo: input.memo ?? null,
      savedAt: new Date().toISOString(),
    };
    demoSavedTrips.unshift(item);
    return item;
  }
  return requestJson<UserSavedTrip>("/users/me/saved-trips", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getUserSavedTrips(
  page = 1,
  limit = 20,
): Promise<PaginatedSavedTrips> {
  if (demoMode) {
    return {
      items: demoSavedTrips,
      total: demoSavedTrips.length,
      page,
      limit,
    };
  }
  return requestJson<PaginatedSavedTrips>(
    `/users/me/saved-trips?page=${page}&limit=${limit}`,
  );
}

export async function getUserSavedTrip(
  savedId: string,
): Promise<UserSavedTrip> {
  if (demoMode) {
    const found = demoSavedTrips.find((s) => s.id === savedId);
    if (!found)
      throw new ApiError("保存された旅程が見つかりません。", 404, "NOT_FOUND");
    return found;
  }
  return requestJson<UserSavedTrip>(
    `/users/me/saved-trips/${encodeURIComponent(savedId)}`,
  );
}

export async function updateUserSavedTripMemo(
  savedId: string,
  memo: string | null,
): Promise<UserSavedTrip> {
  if (demoMode) {
    const found = demoSavedTrips.find((s) => s.id === savedId);
    if (!found)
      throw new ApiError("保存された旅程が見つかりません。", 404, "NOT_FOUND");
    found.memo = memo;
    return found;
  }
  return requestJson<UserSavedTrip>(
    `/users/me/saved-trips/${encodeURIComponent(savedId)}/memo`,
    {
      method: "PATCH",
      body: JSON.stringify({ memo }),
    },
  );
}

export async function deleteUserSavedTrip(savedId: string): Promise<void> {
  if (demoMode) {
    demoSavedTrips = demoSavedTrips.filter((s) => s.id !== savedId);
    return;
  }
  return requestJson<void>(
    `/users/me/saved-trips/${encodeURIComponent(savedId)}`,
    {
      method: "DELETE",
    },
  );
}

export async function searchHotels(
  query: string,
  area?: string,
): Promise<SearchHotelItem[]> {
  if (!query || query.trim().length === 0) return [];
  if (demoMode) {
    const mockHotels: SearchHotelItem[] = [
      {
        name: "신라스테이 공덕",
        roadAddress: "서울특별시 마포구 마포대로 83",
        address: "서울특별시 마포구 도화동 25-13",
        category: "숙박>호텔",
        latitude: 37.5422,
        longitude: 126.9511,
      },
      {
        name: "신라스테이 마포",
        roadAddress: "서울특별시 마포구 마포대로 92",
        address: "서울특별시 마포구 도화동 17-22",
        category: "숙박>호텔",
        latitude: 37.5426,
        longitude: 126.9507,
      },
      {
        name: "신라스테이 광화문",
        roadAddress: "서울특별시 종로구 삼봉로 71",
        address: "서울특별시 종로구 수송동 51-8",
        category: "숙박>호텔",
        latitude: 37.5724,
        longitude: 126.9816,
      },
      {
        name: "신라스테이 서초",
        roadAddress: "서울특별시 서초구 효령로 427",
        address: "서울특별시 서초구 서초동 1341-7",
        category: "숙박>호텔",
        latitude: 37.4903,
        longitude: 127.0275,
      },
      {
        name: "신라스테이 역삼",
        roadAddress: "서울특별시 강남구 언주로 517",
        address: "서울특별시 강남구 역삼동 675-3",
        category: "숙박>호텔",
        latitude: 37.5045,
        longitude: 127.0428,
      },
      {
        name: "신라스테이 삼성",
        roadAddress: "서울특별시 강남구 영동대로 506",
        address: "서울특별시 강남구 삼성동 168-3",
        category: "숙박>호텔",
        latitude: 37.5097,
        longitude: 127.0617,
      },
      {
        name: "서울신라호텔",
        roadAddress: "서울특별시 중구 동호로 249",
        address: "서울특별시 중구 장충동2가 202",
        category: "숙박>호텔",
        latitude: 37.5562,
        longitude: 127.0051,
      },
      {
        name: "롯데시티호텔 마포",
        roadAddress: "서울특별시 마포구 마포대로 109",
        address: "서울특별시 마포구 공덕동 467",
        category: "숙박>호텔",
        latitude: 37.5434,
        longitude: 126.9518,
      },
      {
        name: "롯데시티호텔 명동",
        roadAddress: "서울특별시 중구 삼일대로 362",
        address: "서울특별시 중구 장교동 22-4",
        category: "숙박>호텔",
        latitude: 37.5663,
        longitude: 126.9882,
      },
      {
        name: "롯데호텔 서울",
        roadAddress: "서울특별시 중구 을지로 30",
        address: "서울특별시 중구 소공동 1",
        category: "숙박>호텔",
        latitude: 37.5658,
        longitude: 126.9812,
      },
      {
        name: "롯데호텔 월드",
        roadAddress: "서울특별시 송파구 올림픽로 240",
        address: "서울특별시 송파구 잠실동 40-1",
        category: "숙박>호텔",
        latitude: 37.5113,
        longitude: 127.0980,
      },
      {
        name: "L7 홍대 바이 롯데",
        roadAddress: "서울특별시 마포구 양화로 141",
        address: "서울특별시 마포구 동교동 160-5",
        category: "숙박>호텔",
        latitude: 37.5552,
        longitude: 126.9228,
      },
      {
        name: "L7 명동 바이 롯데",
        roadAddress: "서울특별시 중구 퇴계로 137",
        address: "서울특별시 중구 충무로2가 62-12",
        category: "숙박>호텔",
        latitude: 37.5606,
        longitude: 126.9863,
      },
      {
        name: "나인트리 프리미어 호텔 명동",
        roadAddress: "서울특별시 중구 명동길 61",
        address: "서울특별시 중구 명동2가 83-5",
        category: "숙박>호텔",
        latitude: 37.5638,
        longitude: 126.9858,
      },
      {
        name: "나인트리 프리미어 호텔 인사동",
        roadAddress: "서울특별시 종로구 인사동길 49",
        address: "서울특별시 종로구 관훈동 155-2",
        category: "숙박>호텔",
        latitude: 37.5746,
        longitude: 126.9839,
      },
      {
        name: "웨스틴 조선 서울",
        roadAddress: "서울특별시 중구 소공로 106",
        address: "서울특별시 중구 소공동 87",
        category: "숙박>호텔",
        latitude: 37.5645,
        longitude: 126.9798,
      },
      {
        name: "글래드 마포",
        roadAddress: "서울특별시 마포구 마포대로 92",
        address: "서울특별시 마포구 도화동 25-13",
        category: "숙박>호텔",
        latitude: 37.5427,
        longitude: 126.9508,
      },
      {
        name: "글래드 여의도",
        roadAddress: "서울특별시 영등포구 의사당대로 16",
        address: "서울특별시 영등포구 여의도동 17-5",
        category: "숙박>호텔",
        latitude: 37.5287,
        longitude: 126.9174,
      },
      {
        name: "콘래드 서울",
        roadAddress: "서울특별시 영등포구 국제금융로 10",
        address: "서울특별시 영등포구 여의도동 23",
        category: "숙박>호텔",
        latitude: 37.5254,
        longitude: 126.9255,
      },
      {
        name: "그랜드 하얏트 서울",
        roadAddress: "서울특별시 용산구 소월로 322",
        address: "서울특별시 용산구 한남동 747-7",
        category: "숙박>호텔",
        latitude: 37.5392,
        longitude: 126.9975,
      },
      {
        name: "포시즌스 호텔 서울",
        roadAddress: "서울특별시 종로구 새문안로 97",
        address: "서울특별시 종로구 당주동 29",
        category: "숙박>호텔",
        latitude: 37.5707,
        longitude: 126.9754,
      },
    ];

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = mockHotels.filter((h) => {
      const searchable = `${h.name} ${h.roadAddress || ""} ${h.address || ""}`.toLowerCase();
      return terms.every((t) => searchable.includes(t)) || terms.some((t) => searchable.includes(t));
    });
    return filtered.length > 0 ? filtered : mockHotels.slice(0, 6);
  }
  const params = new URLSearchParams({ query: query.trim() });
  if (area) params.set("area", area);
  try {
    return await requestJson<SearchHotelItem[]>(
      `/trips/search-hotels?${params.toString()}`,
    );
  } catch {
    // If backend offline or error, fallback to client-side hotel search
    return [
      {
        name: "신라스테이 공덕",
        roadAddress: "서울특별시 마포구 마포대로 83",
        address: "서울특별시 마포구 도화동 25-13",
        category: "숙박>호텔",
        latitude: 37.5422,
        longitude: 126.9511,
      },
      {
        name: "신라스테이 마포",
        roadAddress: "서울특별시 마포구 마포대로 92",
        address: "서울특별시 마포구 도화동 17-22",
        category: "숙박>호텔",
        latitude: 37.5426,
        longitude: 126.9507,
      },
      {
        name: "롯데시티호텔 마포",
        roadAddress: "서울특별시 마포구 마포대로 109",
        address: "서울특별시 마포구 공덕동 467",
        category: "숙박>호텔",
        latitude: 37.5434,
        longitude: 126.9518,
      },
      {
        name: "롯데호텔 서울",
        roadAddress: "서울특별시 중구 을지로 30",
        address: "서울특별시 중구 소공동 1",
        category: "숙박>호텔",
        latitude: 37.5658,
        longitude: 126.9812,
      },
      {
        name: "서울신라호텔",
        roadAddress: "서울특별시 중구 동호로 249",
        address: "서울특별시 중구 장충동2가 202",
        category: "숙박>호텔",
        latitude: 37.5562,
        longitude: 127.0051,
      },
      {
        name: "나인트리 프리미어 호텔 명동",
        roadAddress: "서울특별시 중구 명동길 61",
        address: "서울특별시 중구 명동2가 83-5",
        category: "숙박>호텔",
        latitude: 37.5638,
        longitude: 126.9858,
      },
      {
        name: "L7 홍대 바이 롯데",
        roadAddress: "서울특별시 마포구 양화로 141",
        address: "서울특별시 마포구 동교동 160-5",
        category: "숙박>호텔",
        latitude: 37.5552,
        longitude: 126.9228,
      },
    ].filter((h) => {
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      const searchable = `${h.name} ${h.roadAddress || ""} ${h.address || ""}`.toLowerCase();
      return terms.some((t) => searchable.includes(t));
    });
  }
}

// ==========================================
// LangGraph Chat API
// ==========================================

export async function createChatThread(
  locale?: 'ko' | 'ja',
  currentTripId?: string,
): Promise<CreateThreadResponse> {
  if (demoMode) {
    return {
      threadId: `demo-thread-${Date.now()}`,
      threadSecret: `demo-secret-${Date.now()}`,
    };
  }
  return requestJson<CreateThreadResponse>('/chat/threads', {
    method: 'POST',
    body: JSON.stringify({ locale, currentTripId }),
  });
}

export async function sendChatMessage(
  threadId: string,
  input: {
    message: string;
    locale?: 'ko' | 'ja';
    currentTripId?: string;
    profile?: Record<string, unknown> | null;
    threadSecret?: string;
    editToken?: string;
  },
): Promise<ChatResponse> {
  if (demoMode) {
    return {
      threadId,
      status: 'completed',
      responseMessage: '데모 모드에서는 실시간 추천을 시뮬레이션합니다.',
    };
  }
  const headers: Record<string, string> = {};
  if (input.threadSecret) {
    headers['X-Thread-Secret'] = input.threadSecret;
  }
  if (input.editToken) {
    headers['X-Trip-Edit-Token'] = input.editToken;
  }
  return requestJson<ChatResponse>(`/chat/threads/${encodeURIComponent(threadId)}/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
}

export async function resumeChatThread(
  threadId: string,
  input: {
    decision: 'approve' | 'reject';
    chosenPlaceId?: string;
    threadSecret?: string;
    editToken?: string;
  },
): Promise<ChatResponse> {
  if (demoMode) {
    return {
      threadId,
      status: 'completed',
      responseMessage: '데모 모드에서는 변경 사항이 즉시 적용됩니다.',
    };
  }
  const headers: Record<string, string> = {};
  if (input.threadSecret) {
    headers['X-Thread-Secret'] = input.threadSecret;
  }
  if (input.editToken) {
    headers['X-Trip-Edit-Token'] = input.editToken;
  }
  return requestJson<ChatResponse>(`/chat/threads/${encodeURIComponent(threadId)}/resume`, {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
}

export async function getChatThreadState(
  threadId: string,
  threadSecret?: string,
): Promise<ChatResponse> {
  const headers: Record<string, string> = {};
  if (threadSecret) {
    headers['X-Thread-Secret'] = threadSecret;
  }
  return requestJson<ChatResponse>(`/chat/threads/${encodeURIComponent(threadId)}/state`, {
    method: 'GET',
    headers,
  });
}
