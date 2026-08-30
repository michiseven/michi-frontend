import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import { GenerativeChatPlanner } from "./generative-chat-planner";

const apiMocks = vi.hoisted(() => ({
  createChatThread: vi.fn(),
  sendChatMessage: vi.fn(),
  resumeChatThread: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  ...apiMocks,
  getStoredEditToken: vi.fn(() => null),
  storeEditToken: vi.fn(),
}));

describe("GenerativeChatPlanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
