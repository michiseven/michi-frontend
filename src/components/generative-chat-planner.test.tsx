import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
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
    authMock.useAuth.mockReturnValue({ id: "user-1", displayName: "Michi", email: "michi@example.com" });
  });

  it("renders initial welcome message, profile bar, and input field", () => {
    render(
      <I18nProvider>
        <GenerativeChatPlanner />
      </I18nProvider>,
    );

    expect(screen.getByText(/ソウル専門AIトラベルプランナー|서울 여행 전문 AI 플래너/)).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /送信|전송|보내기/ })).toBeInTheDocument();
    // Profile controls
    expect(screen.getByRole("button", { name: /입국·출국 일정|入国・出国日程/ })).toBeInTheDocument();
    expect(screen.getByText(/荷物|짐 보관/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /숙소 검색|宿泊先検索/ })).toBeInTheDocument();
  });

  it("collects arrival and departure date/time constraints", () => {
    render(
      <I18nProvider>
        <GenerativeChatPlanner />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /입국·출국 일정|入国・出国日程/ }));
    fireEvent.change(screen.getByLabelText(/^(입국 날짜|入国日)$/), { target: { value: "2026-09-01" } });
    fireEvent.change(screen.getByLabelText(/^(입국 시간|入国時刻)$/), { target: { value: "14:30" } });
    fireEvent.change(screen.getByLabelText(/^(출국 날짜|出国日)$/), { target: { value: "2026-09-04" } });
    fireEvent.change(screen.getByLabelText(/^(출국 시간|出国時刻)$/), { target: { value: "11:00" } });

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

    fireEvent.click(screen.getByRole("button", { name: /입국·출국 일정|入国・出国日程/ }));
    fireEvent.change(screen.getByLabelText(/^(입국 날짜|入国日)$/), { target: { value: "2026-10-10" } });
    fireEvent.change(screen.getByLabelText(/^(입국 시간|入国時刻)$/), { target: { value: "14:30" } });
    fireEvent.change(screen.getByLabelText(/입국 공항|到着空港/), { target: { value: "ICN_T2" } });
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "인천공항에서 성수로 가고 싶어요" } });
    fireEvent.click(screen.getByRole("button", { name: /送信|전송|보내기/ }));

    await screen.findByText("일정을 만들었어요.");
    expect(apiMocks.sendChatMessage).toHaveBeenCalledWith(
      "thread-1",
      expect.objectContaining({ profile: expect.objectContaining({ arrivalAirport: "ICN_T2" }) }),
    );
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
    expect(screen.getByText("LIVE")).toBeInTheDocument();
  });
});
