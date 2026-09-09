import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider, resetLanguage } from "@/lib/i18n";
import { GenerativeChatPlanner } from "./generative-chat-planner";

const apiMocks = vi.hoisted(() => ({
  createChatThread: vi.fn(),
  sendChatMessage: vi.fn(),
  resumeChatThread: vi.fn(),
}));
const authMock = vi.hoisted(() => ({ useAuth: vi.fn() }));

vi.mock("@/lib/api", () => ({
  ...apiMocks,
  getStoredEditToken: vi.fn(() => null),
  storeEditToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: authMock.useAuth,
}));

describe("GenerativeChatPlanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetLanguage("ja");
    authMock.useAuth.mockReturnValue({ id: "user-1", displayName: "Michi", email: "michi@example.com" });
  });

  it("renders a one-sentence start before optional travel conditions", () => {
    render(
      <I18nProvider>
        <GenerativeChatPlanner />
      </I18nProvider>,
    );

    expect(screen.getByText(/ソウル専門AIトラベルプランナー|서울 여행 전문 AI 플래너/)).toBeInTheDocument();
    expect(screen.getByText(/エリア・時間・人数だけでも始められます|지역·시간·인원만 말해도 시작할 수 있어요/)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /送信|전송|보내기/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /旅行条件を開く|여행 조건 열기/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: /도착·출발 일정|到着・出発日程/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /旅行条件を開く|여행 조건 열기/ }));
    expect(screen.getByRole("button", { name: /도착·출발 일정|到着・出発日程/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /荷物なし|荷物預かり必要|짐 보관 없음|짐 보관 필요/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /숙소 검색|宿泊先検索/ })).toBeInTheDocument();
  });

  it("shows an input-adjacent minimum request format and situational examples", () => {
    resetLanguage("ko");
    render(
      <I18nProvider>
        <GenerativeChatPlanner />
      </I18nProvider>,
    );

    const input = screen.getByRole("textbox");
    expect(screen.getByText("한 줄로 시작하세요: 지역 · 누구와 · 시간 · 하고 싶은 일")).toBeInTheDocument();
    expect(screen.getByText("예: 홍대, 친구 3명, 토요일 13~18시, 카페와 저녁")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-describedby", "planner-first-request-hint");
    expect(screen.getByRole("button", { name: /홍대에서 친구 3명과 토요일 13~18시/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /아이를 포함한 가족 4명이 토요일 10~16시/ })).toBeInTheDocument();
  });

  it("updates the untouched welcome message when the locale changes", async () => {
    render(
      <I18nProvider>
        <GenerativeChatPlanner />
      </I18nProvider>,
    );

    expect(screen.getByText(/エリア・過ごせる時間・人数だけでも/)).toBeInTheDocument();
    resetLanguage("ko");

    expect(await screen.findByText(/지역·시간·인원만 알려주셔도/)).toBeInTheDocument();
    expect(screen.queryByText(/エリア・過ごせる時間・人数だけでも/)).not.toBeInTheDocument();
  });

  it("puts a quick example in the input instead of sending it immediately", () => {
    render(
      <I18nProvider>
        <GenerativeChatPlanner />
      </I18nProvider>,
    );

    const example = screen.getAllByRole("button", { name: /例文.*入力欄に入れる/ })[0]!;
    fireEvent.click(example);

    expect((screen.getByRole("textbox") as HTMLInputElement).value).toContain("弘大");
    expect(apiMocks.sendChatMessage).not.toHaveBeenCalled();
  });

  it("starts an example from a fresh trip without applying prior profile conditions", async () => {
    apiMocks.createChatThread.mockResolvedValue({ threadId: "thread-1", threadSecret: "secret-1" });
    apiMocks.sendChatMessage.mockResolvedValue({
      threadId: "thread-1",
      status: "completed",
      responseMessage: "日程を作りました。",
    });
    render(
      <I18nProvider>
        <GenerativeChatPlanner />
      </I18nProvider>,
    );

    fireEvent.click(screen.getAllByRole("button", { name: /例文.*入力欄に入れる/ })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    await screen.findByText("日程を作りました。");
    expect(apiMocks.sendChatMessage).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({ startFreshTrip: true, profilePolicy: "ignore" }),
    );
  });

  it("sends an action chip's structured stop target back to the chat API", async () => {
    apiMocks.createChatThread.mockResolvedValue({ threadId: "thread-1", threadSecret: "secret-1" });
    apiMocks.sendChatMessage
      .mockResolvedValueOnce({
        threadId: "thread-1",
        status: "completed",
        responseMessage: "어느 장소를 바꿀까요?",
        actionChips: [{
          label: "서울숲 빼기",
          query: "서울숲을 빼줘",
          type: "mutation:remove",
          mutationTarget: { stopId: "stop-2", stopOrder: 2, placeName: "서울숲" },
        }],
      })
      .mockResolvedValueOnce({ threadId: "thread-1", status: "completed", responseMessage: "서울숲을 뺐어요." });
    render(<I18nProvider><GenerativeChatPlanner /></I18nProvider>);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "장소를 바꾸고 싶어" } });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));
    fireEvent.click(await screen.findByRole("button", { name: "서울숲 빼기" }));

    await screen.findByText("서울숲을 뺐어요.");
    expect(apiMocks.sendChatMessage).toHaveBeenLastCalledWith(
      "thread-1",
      expect.objectContaining({
        message: "서울숲을 빼줘",
        mutationTarget: { stopId: "stop-2", stopOrder: 2, placeName: "서울숲" },
      }),
    );
  });

  it("retries the original request with a structured recovery patch and local-specialty preference", async () => {
    apiMocks.createChatThread.mockResolvedValue({
      threadId: "thread-1",
      threadSecret: "secret-1",
    });
    apiMocks.sendChatMessage
      .mockResolvedValueOnce({
        threadId: "thread-1",
        status: "failed",
        responseMessage: "조건을 조정해 주세요.",
        actionChips: [
          {
            label: "지역 대표 메뉴",
            query: "이 지역 명물로 찾아줘",
            type: "meal",
            mealPreference: "local_specialty",
            requestPatch: { relaxations: ["search_radius"] },
          },
        ],
      })
      .mockResolvedValueOnce({
        threadId: "thread-1",
        status: "completed",
        responseMessage: "다시 만들었어요.",
      });
    render(
      <I18nProvider>
        <GenerativeChatPlanner />
      </I18nProvider>,
    );

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "성수에서 점심 일정 짜줘" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));
    fireEvent.click(await screen.findByRole("button", { name: "지역 대표 메뉴" }));

    await screen.findByText("다시 만들었어요.");
    expect(apiMocks.sendChatMessage).toHaveBeenLastCalledWith(
      "thread-1",
      expect.objectContaining({
        message: "성수에서 점심 일정 짜줘",
        mealPreference: "local_specialty",
        relaxations: ["search_radius"],
      }),
    );
  });

  it("puts an unsafe theme edit suggestion in the composer without sending a hidden retry", async () => {
    apiMocks.createChatThread.mockResolvedValue({ threadId: "thread-1", threadSecret: "secret-1" });
    apiMocks.sendChatMessage.mockResolvedValueOnce({
      threadId: "thread-1",
      status: "failed",
      responseMessage: "테마를 수정해 주세요.",
      actionChips: [{
        label: "테마를 수정하기",
        query: "테마를 바꿔서 다시 일정 짜줘",
        type: "refine",
        requiresUserEdit: true,
      }],
    });
    render(<I18nProvider><GenerativeChatPlanner /></I18nProvider>);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "홍대 산책 일정 짜줘" } });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));
    fireEvent.click(await screen.findByRole("button", { name: "테마를 수정하기" }));

    expect(apiMocks.sendChatMessage).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("textbox")).toHaveValue("테마를 바꿔서 다시 일정 짜줘");
  });

  it("offers cancellation while a recommendation is being generated", async () => {
    apiMocks.createChatThread.mockResolvedValue({ threadId: "thread-1", threadSecret: "secret-1" });
    apiMocks.sendChatMessage.mockImplementation(
      (_threadId: string, input: { signal?: AbortSignal }) => new Promise((_resolve, reject) => {
        input.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
    );
    render(<I18nProvider><GenerativeChatPlanner /></I18nProvider>);

    fireEvent.change(screen.getByRole("textbox"), { target: { value: "聖水でカフェに行きたい" } });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    expect(await screen.findByRole("button", { name: "キャンセル" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(await screen.findByText(/旅程作成をキャンセル/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "入力欄で修正" })).toBeInTheDocument();
  });

  it("collects arrival and departure date/time constraints", () => {
    render(
      <I18nProvider>
        <GenerativeChatPlanner />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /旅行条件を開く|여행 조건 열기/ }));
    fireEvent.click(screen.getByRole("button", { name: /도착·출발 일정|到着・出発日程/ }));
    fireEvent.change(screen.getByLabelText(/^(도착 날짜|到着日)$/), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText(/^(도착 시간|到着時刻)$/), { target: { value: "14:30" } });
    fireEvent.change(screen.getByLabelText(/^(출발 날짜|出発日)$/), { target: { value: "2026-09-04" } });
    fireEvent.change(screen.getByLabelText(/^(출발 시간|出発時刻)$/), { target: { value: "11:00" } });

    expect(screen.getByDisplayValue("2026-09-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("11:00")).toBeInTheDocument();
  });

  it("sends the selected arrival airport only when its schedule is set", async () => {
    apiMocks.createChatThread.mockResolvedValue({ threadId: "thread-1", threadSecret: "secret-1" });
    apiMocks.sendChatMessage.mockResolvedValue({
      threadId: "thread-1",
      status: "completed",
      responseMessage: "일정을 만들었어요.",
    });

    render(
      <I18nProvider>
        <GenerativeChatPlanner />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /旅行条件を開く|여행 조건 열기/ }));
    fireEvent.click(screen.getByRole("button", { name: /도착·출발 일정|到着・出発日程/ }));
    fireEvent.change(screen.getByLabelText(/^(도착 날짜|到着日)$/), { target: { value: "2026-10-10" } });
    fireEvent.change(screen.getByLabelText(/^(도착 시간|到着時刻)$/), { target: { value: "14:30" } });
    fireEvent.change(screen.getByLabelText(/입국 공항|到着空港/), { target: { value: "ICN_T2" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "인천공항에서 성수로 가고 싶어요" } });
    fireEvent.click(screen.getByRole("button", { name: /送信|전송|보내기/ }));

    await screen.findByText("일정을 만들었어요.");
    expect(apiMocks.sendChatMessage).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({ profile: expect.objectContaining({ arrivalAirport: "ICN_T2" }) }),
    );
  });

  it("sends exact party size and explicit budget scope from optional conditions", async () => {
    apiMocks.createChatThread.mockResolvedValue({ threadId: "thread-1", threadSecret: "secret-1" });
    apiMocks.sendChatMessage.mockResolvedValue({ threadId: "thread-1", status: "completed", responseMessage: "日程を作りました。" });
    render(<I18nProvider><GenerativeChatPlanner /></I18nProvider>);

    fireEvent.click(screen.getByRole("button", { name: /旅行条件を開く/ }));
    fireEvent.change(screen.getByLabelText("人数"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("予算（KRW）"), { target: { value: "50000" } });
    fireEvent.change(screen.getByLabelText("予算の基準"), { target: { value: "total" } });
    fireEvent.change(screen.getByLabelText("同行者"), { target: { value: "friends" } });
    fireEvent.change(screen.getByLabelText("ペース"), { target: { value: "relaxed" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "弘大で買い物をしたい" } });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));

    await screen.findByText("日程を作りました。");
    expect(apiMocks.sendChatMessage).toHaveBeenCalledWith("thread-1", expect.objectContaining({
      profile: expect.objectContaining({ partySize: 6, budget: 50000, budgetScope: "total", companions: "friends", pace: "relaxed" }),
    }));
  });

  it("resumes the message written before login after login succeeds", async () => {
    const onLoginRequired = vi.fn();
    authMock.useAuth.mockReturnValue(null);
    apiMocks.createChatThread.mockResolvedValue({ threadId: "thread-1", threadSecret: "secret-1" });
    apiMocks.sendChatMessage.mockResolvedValue({ threadId: "thread-1", status: "completed", responseMessage: "추천을 만들었어요." });

    const view = render(
      <I18nProvider>
        <GenerativeChatPlanner onLoginRequired={onLoginRequired} loginCompletedAt={0} />
      </I18nProvider>,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "성수에서 카페를 가고 싶어요" } });
    fireEvent.click(screen.getByRole("button", { name: /送信|전송|보내기/ }));
    expect(onLoginRequired).toHaveBeenCalledOnce();
    expect(apiMocks.sendChatMessage).not.toHaveBeenCalled();

    authMock.useAuth.mockReturnValue({ id: "user-1", displayName: "Michi", email: "michi@example.com" });
    view.rerender(
      <I18nProvider>
        <GenerativeChatPlanner onLoginRequired={onLoginRequired} loginCompletedAt={1} />
      </I18nProvider>,
    );

    expect(await screen.findByText("추천을 만들었어요.")).toBeInTheDocument();
    expect(apiMocks.sendChatMessage).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({ message: "성수에서 카페를 가고 싶어요" }),
    );
  });

  it("does not resume a message after the login flow is cancelled", async () => {
    const onLoginRequired = vi.fn();
    authMock.useAuth.mockReturnValue(null);
    const view = render(
      <I18nProvider>
        <GenerativeChatPlanner onLoginRequired={onLoginRequired} loginCompletedAt={0} loginCancelledAt={0} />
      </I18nProvider>,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "성수에서 카페를 가고 싶어요" } });
    fireEvent.click(screen.getByRole("button", { name: /送信|전송|보내기/ }));
    expect(onLoginRequired).toHaveBeenCalledOnce();

    view.rerender(
      <I18nProvider>
        <GenerativeChatPlanner onLoginRequired={onLoginRequired} loginCompletedAt={0} loginCancelledAt={1} />
      </I18nProvider>,
    );
    authMock.useAuth.mockReturnValue({ id: "user-1", displayName: "Michi", email: "michi@example.com" });
    view.rerender(
      <I18nProvider>
        <GenerativeChatPlanner onLoginRequired={onLoginRequired} loginCompletedAt={2} loginCancelledAt={1} />
      </I18nProvider>,
    );

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(apiMocks.sendChatMessage).not.toHaveBeenCalled();
  });

  it("renders clickable sources returned by place detail web search", async () => {
    apiMocks.createChatThread.mockResolvedValue({
      threadId: "thread-1",
      threadSecret: "secret-1",
    });
    apiMocks.sendChatMessage.mockResolvedValue({
      threadId: "thread-1",
      status: "completed",
      responseMessage: "웹 검색 근거 운영시간: 11:00~22:00",
      verifiedPlaceFacts: {
        placeId: "place-1",
        name: "대림창고",
        sourceName: "대림창고",
        category: "카페",
        address: "서울 성동구 성수동2가",
        roadAddress: "서울 성동구 성수이로 78",
        overview: null,
        businessHours: null,
        priceEvidence: null,
        crowdContext: null,
        placeDetailLink: null,
        source: "kto",
        sourcePlaceId: "1",
        webEvidence: {
          provider: "openai-web-search",
          model: "gpt-test",
          status: "partial",
          evidence: {
            placeMatched: true,
            matchedName: "대림창고",
            matchedAddress: "서울 성동구 성수이로 78",
            businessHours: {
              status: "sourced",
              value: "11:00~22:00",
              sources: [{ title: "VISITKOREA", url: "https://example.com/visitkorea" }],
            },
            price: { status: "unavailable", value: null, sources: [] },
            warnings: [],
          },
          fetchedAt: "2026-08-29T00:00:00.000Z",
          expiresAt: "2026-08-30T00:00:00.000Z",
          cacheHit: false,
        },
      },
    });

    render(
      <I18nProvider>
        <GenerativeChatPlanner />
      </I18nProvider>,
    );
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "대림창고 최신 영업시간 알려줘" },
    });
    fireEvent.click(screen.getByRole("button", { name: /送信|전송|보내기/ }));

    expect(await screen.findByTestId("place-web-evidence")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /VISITKOREA/ })).toHaveAttribute(
      "href",
      "https://example.com/visitkorea",
    );
    expect(screen.getByText("最新確認")).toBeInTheDocument();
  });
});
