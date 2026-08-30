import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { patchTripStops } from "@/lib/api";
import { I18nProvider, resetLanguage } from "@/lib/i18n";
import { captureMichiEvent } from "@/lib/telemetry";
import { testTrip } from "@/test/fixtures";
import { TripView } from "./trip-view";

vi.mock("@/lib/api", () => ({
  patchTripStops: vi.fn(),
}));

vi.mock("@/lib/telemetry", () => ({
  captureMichiEvent: vi.fn(),
}));

describe("trip detail editing", () => {
  beforeEach(() => {
    vi.mocked(patchTripStops).mockReset();
    vi.mocked(captureMichiEvent).mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete (Navigator.prototype as unknown as { share?: unknown }).share;
    delete (window.navigator as unknown as { share?: unknown }).share;
    delete (Navigator.prototype as unknown as { clipboard?: unknown })
      .clipboard;
    delete (window.navigator as unknown as { clipboard?: unknown }).clipboard;
  });

  it("removes a stop through the backend contract", async () => {
    vi.mocked(patchTripStops).mockResolvedValue({
      ...testTrip,
      stops: [testTrip.stops[1]],
    });
    const user = userEvent.setup();
    render(<TripView initialTrip={testTrip} editable />);

    await user.click(
      screen.getByRole("button", { name: "テストカフェを旅程から削除" }),
    );

    expect(patchTripStops).toHaveBeenCalledWith("trip-test-1", {
      action: "remove",
      stopId: "stop-1",
    });
    expect(await screen.findByText("場所を削除しました。")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "テストカフェ" }),
    ).not.toBeInTheDocument();
    expect(captureMichiEvent).toHaveBeenCalledWith("place_removed", {
      tripId: "trip-test-1",
      placeId: "place-1",
      context: { previousOrder: 1 },
    });
  });

  it("sends the new stop order", async () => {
    const reordered = {
      ...testTrip,
      stops: [testTrip.stops[1], testTrip.stops[0]],
    };
    vi.mocked(patchTripStops).mockResolvedValue(reordered);
    const user = userEvent.setup();
    render(<TripView initialTrip={testTrip} editable />);

    await user.click(
      screen.getByRole("button", { name: "テストカフェを一つ後へ" }),
    );

    expect(patchTripStops).toHaveBeenCalledWith("trip-test-1", {
      action: "reorder",
      stopIds: ["stop-2", "stop-1"],
    });
    expect(await screen.findByText("順番を更新しました。")).toBeInTheDocument();
    expect(captureMichiEvent).toHaveBeenCalledWith("place_reordered", {
      tripId: "trip-test-1",
      placeId: "place-1",
      context: { fromOrder: 1, toOrder: 2 },
    });
  });

  it("records score detail views and explicit route progress without content capture", async () => {
    const user = userEvent.setup();
    render(<TripView initialTrip={testTrip} editable />);

    await user.click(
      screen.getAllByText("なぜここがおすすめ？ スコア内訳")[0]!,
    );
    expect(captureMichiEvent).toHaveBeenCalledWith("place_viewed", {
      tripId: "trip-test-1",
      placeId: "place-1",
    });

    await user.click(screen.getByRole("button", { name: "ルートを開始" }));
    expect(captureMichiEvent).toHaveBeenCalledWith("route_started", {
      tripId: "trip-test-1",
      context: { stopCount: 2 },
    });
    await user.click(screen.getByRole("button", { name: "ルートを完了" }));
    expect(captureMichiEvent).toHaveBeenCalledWith("route_completed", {
      tripId: "trip-test-1",
      context: { stopCount: 2 },
    });
    expect(screen.getByText("ルートを完了しました。")).toBeInTheDocument();
  });

  it("shows optional tourism evidence without presenting raw concentration as a positive score", () => {
    const tourismTrip = structuredClone(testTrip);
    tourismTrip.stops[0]!.tourism = {
      concentration: {
        value: 0.2,
        level: "low",
        scope: "area",
        areaName: "聖水",
        referencePeriod: "2026-07",
      },
      localDiscovery: { value: 0.84, level: "high" },
      isAlternative: true,
      sourceRef: "kto-datalab-visit",
    };
    tourismTrip.stops[0]!.scoreBreakdown.tourismDispersion = null;
    tourismTrip.stops[0]!.scoreBreakdown.localImpact = 0.84;

    render(<TripView initialTrip={tourismTrip} />);

    expect(screen.getByText("観光データによる補足")).toBeInTheDocument();
    expect(
      screen.getByText("比較的低い（エリア単位・聖水）"),
    ).toBeInTheDocument();
    expect(screen.getByText("参照期間：2026-07")).toBeInTheDocument();
    expect(
      screen.getByText(/現在の店内混雑を示すものではありません/),
    ).toBeInTheDocument();
    expect(screen.queryByText("観光集中度 20%")).not.toBeInTheDocument();
    expect(screen.queryByText("観光分散との相性")).not.toBeInTheDocument();
    expect(screen.getAllByText("ローカル発見")).toHaveLength(2);
  });

  it("keeps existing trips free of unsupported tourism claims", () => {
    render(<TripView initialTrip={testTrip} />);
    expect(screen.queryByText("観光データによる補足")).not.toBeInTheDocument();
    expect(screen.queryByText(/38%/)).not.toBeInTheDocument();
  });

  it("shows a safe Kakao detail link only when the backend provides one", () => {
    const kakaoTrip = structuredClone(testTrip);
    kakaoTrip.stops[0]!.placeDetailLink = {
      provider: "kakao-map",
      url: "https://place.map.kakao.com/123456",
    };

    render(<TripView initialTrip={kakaoTrip} />);

    const link = screen.getByRole("link", {
      name: "テストカフェの営業時間と詳細をカカオマップで確認",
    });
    expect(link).toHaveAttribute("href", "https://place.map.kakao.com/123456");
    expect(link).toHaveAttribute("target", "_blank");
    expect(
      screen.getByText(
        "営業時間・価格などの最新情報は外部ページで確認してください。",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("カカオマップで詳細を見る")).toHaveLength(1);
  });

  it("renders a source-grounded localized NAVER place description", () => {
    const translatedTrip = structuredClone(testTrip);
    translatedTrip.stops[0]!.placeDescription = {
      text: "聖水洞にあるカフェで、出典で確認した場所情報です。",
      locale: "ja",
      provider: "openai-web-search",
      fetchedAt: "2026-08-29T00:00:00.000Z",
      sources: [{ title: "Example source", url: "https://example.com/place" }],
    };

    render(<TripView initialTrip={translatedTrip} />);

    expect(screen.getByText("出典付きスポット紹介")).toBeInTheDocument();
    expect(
      screen.getByText("聖水洞にあるカフェで、出典で確認した場所情報です。"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Example source" }),
    ).toHaveAttribute("href", "https://example.com/place");
  });

  it("renders multi-day date range, day tabs, stopType badges, and rain fallback", async () => {
    const multiDayTrip = {
      ...testTrip,
      date: "2026-08-29",
      stops: [
        {
          ...testTrip.stops[0]!,
          id: "stop-day-1",
          dayNumber: 1,
          dayDate: "2026-08-29",
          stopType: "fixed_appointment",
          placeName: "リウム美術館",
          rainFallback: {
            placeId: "fb-1",
            placeName: "国立中央博物館",
            category: "museum",
          },
        },
        {
          ...testTrip.stops[1]!,
          id: "stop-day-2",
          dayNumber: 2,
          dayDate: "2026-08-30",
          stopType: "meal",
          placeName: "聖水クッパ",
        },
        {
          ...testTrip.stops[0]!,
          id: "stop-day-3",
          dayNumber: 3,
          dayDate: "2026-08-31",
          stopType: "basecamp",
          placeName: "孔徳駅",
        },
      ],
    };

    const user = userEvent.setup();
    render(<TripView initialTrip={multiDayTrip} editable />);

    expect(screen.getByText(/2026-08-29 ~ 2026-08-31/)).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Day 1 (08-29) (1件)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Day 2 (08-30) (1件)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Day 3 (08-31) (1件)" }),
    ).toBeInTheDocument();

    // Check stopType badge & rain fallback
    expect(screen.getByText("🟣 予約")).toBeInTheDocument();
    expect(screen.getByText(/雨天時の代替候補/)).toBeInTheDocument();
    expect(screen.getByText(/国立中央博物館/)).toBeInTheDocument();

    // Switch to Day 2
    await user.click(screen.getByRole("tab", { name: "Day 2 (08-30) (1件)" }));
    expect(screen.getByText("🍽️ 食事")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "聖水クッパ" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("リウム美術館")).not.toBeInTheDocument();
  });

  it("renders subway and bus transit route details in timeline connector", () => {
    const transitTrip = {
      ...testTrip,
      stops: [
        testTrip.stops[0]!,
        {
          ...testTrip.stops[1]!,
          inboundRoute: {
            distanceKm: 7.8,
            durationMinutes: 24,
            method: "seoul-subway-path-v1",
            evidence: "mixed" as const,
            transportMode: "subway" as const,
            requestedTransportMode: "subway" as const,
            subwayDetails: {
              departureStation: "孔徳",
              arrivalStation: "安国",
              subwayDurationMinutes: 18,
              subwayDistanceKm: 7.8,
              fareKrw: 1400,
              transferCount: 1,
              accessWalkMinutes: 3,
              accessWalkDistanceKm: 0.2,
              egressWalkMinutes: 3,
              egressWalkDistanceKm: 0.2,
            },
            disclaimer: "地下鉄区間は公式実測です。",
          },
        },
      ],
    };

    render(<TripView initialTrip={transitTrip} />);

    expect(
      screen.getByText(/🚇 地下鉄 孔徳駅 → 安国駅 約24分/),
    ).toBeInTheDocument();
    expect(screen.getByText(/1400ウォン/)).toBeInTheDocument();
    expect(
      screen.getByText(/出発〜乗車3分 \/ 下車〜到着3分/),
    ).toBeInTheDocument();
  });

  it("renders contextual tripSummary and 4-part stop explanations when provided", () => {
    const explainedTrip = {
      ...testTrip,
      explanation: {
        tripSummary:
          "聖水エリアのカフェとショップを巡る充実した1日プランです。",
        locale: "ja" as const,
        mode: "live" as const,
        model: "gpt-5.6-luna",
      },
      stops: [
        {
          ...testTrip.stops[0]!,
          explanation: {
            shortDescription: "テストカフェは城東区の静かな路地裏カフェです。",
            previousStopFit: null,
            nextStopFit: "徒歩5分のテストショップへスムーズに移動できます。",
            overallTripFit: "静かに過ごしたい希望にぴったりです。",
          },
        },
        {
          ...testTrip.stops[1]!,
          explanation: {
            shortDescription:
              "テストショップは最新のファッションを扱うセレクトショップです。",
            previousStopFit: "テストカフェの後に買い物を楽しむのに最適です。",
            nextStopFit: null,
            overallTripFit: "ショッピングの希望に適合しています。",
          },
        },
      ],
    };

    render(<TripView initialTrip={explainedTrip} />);

    // Trip Summary
    expect(
      screen.getByRole("heading", { name: /旅程の概要/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "聖水エリアのカフェとショップを巡る充実した1日プランです。",
      ),
    ).toBeInTheDocument();

    // Stop 1 Explanations
    expect(
      screen.getByText("テストカフェは城東区の静かな路地裏カフェです。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("徒歩5分のテストショップへスムーズに移動できます。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("静かに過ごしたい希望にぴったりです。"),
    ).toBeInTheDocument();

    // Stop 2 Explanations
    expect(
      screen.getByText(
        "テストショップは最新のファッションを扱うセレクトショップです。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("テストカフェの後に買い物を楽しむのに最適です。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("ショッピングの希望に適合しています。"),
    ).toBeInTheDocument();
  });

  it("한국어 화면에서 Mock 장소명, 카테고리, 설명을 한국어로 표시한다", () => {
    const koreanTrip = structuredClone(testTrip);
    koreanTrip.stops[0]!.placeName = "[MOCK] 焼肉店";
    koreanTrip.stops[0]!.category = "restaurant";
    koreanTrip.stops[0]!.explanation = {
      shortDescription: "[MOCK] 焼肉店는 성동구의 음식점입니다.",
      previousStopFit: null,
      nextStopFit: "다음 장소인 '[MOCK] セレクトショップ'으로 이동합니다.",
      overallTripFit: "혼잡 상태 MOCK_NORMAL을 참고했습니다.",
    };

    resetLanguage("ko");
    render(
      <I18nProvider>
        <TripView initialTrip={koreanTrip} />
      </I18nProvider>,
    );

    expect(
      screen.getByRole("heading", { name: "[MOCK] 고깃집" }),
    ).toBeInTheDocument();
    expect(screen.getByText("음식점")).toBeInTheDocument();
    expect(screen.getByText("1번째 장소")).toBeInTheDocument();
    expect(
      screen.getByText("[MOCK] 고깃집은 성동구의 음식점입니다."),
    ).toBeInTheDocument();
    expect(screen.getByText(/\[MOCK\] 편집숍/)).toBeInTheDocument();
    expect(screen.getByText(/보통\(모의 데이터\)/)).toBeInTheDocument();

    resetLanguage("ja");
  });

  it("renders legacy trips without explanation using standard reason fallback", () => {
    render(<TripView initialTrip={testTrip} />);

    expect(
      screen.queryByRole("heading", { name: /旅程の概要/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("静かなカフェという希望と一致します。"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("セレクトショップの希望と一致します。"),
    ).toBeInTheDocument();
  });

  it("renders timeline summary bar with duration and stops count", () => {
    render(<TripView initialTrip={testTrip} />);

    expect(screen.getByText(/2スポット/)).toBeInTheDocument();
    expect(screen.getByText(/約2時間/)).toBeInTheDocument();
  });

  it("toggles map visibility when clicking the map toggle button", async () => {
    const user = userEvent.setup();
    render(<TripView initialTrip={testTrip} />);

    expect(screen.getByText("地図を表示できません")).toBeInTheDocument();
    const toggleBtn = screen.getByRole("button", { name: "地図の表示切替" });
    expect(toggleBtn).toHaveTextContent("地図を閉じる");

    await user.click(toggleBtn);
    expect(screen.queryByText("地図を表示できません")).not.toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent("地図を表示");

    await user.click(toggleBtn);
    expect(screen.getByText("地図を表示できません")).toBeInTheDocument();
  });

  it("shares trip via navigator.share when available", async () => {
    const shareMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "share", {
      value: shareMock,
      configurable: true,
    });
    Object.defineProperty(globalThis.navigator, "share", {
      value: shareMock,
      configurable: true,
    });

    const user = userEvent.setup();
    const { unmount } = render(<TripView initialTrip={testTrip} />);

    const shareBtn = screen.getByRole("button", { name: "旅程を共有" });
    await user.click(shareBtn);

    expect(shareMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining("Michi"),
      }),
    );
    expect(
      await screen.findByText(/旅程のリンクをコピーしました！/),
    ).toBeInTheDocument();

    unmount();
    delete (window.navigator as unknown as { share?: unknown }).share;
    delete (globalThis.navigator as unknown as { share?: unknown }).share;
  });

  it("falls back to clipboard copy when navigator.share is unavailable", async () => {
    delete (window.navigator as unknown as { share?: unknown }).share;
    delete (globalThis.navigator as unknown as { share?: unknown }).share;

    const user = userEvent.setup();
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    const clipObj = { writeText: writeTextMock };
    Object.defineProperty(window.navigator, "clipboard", {
      value: clipObj,
      configurable: true,
    });
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: clipObj,
      configurable: true,
    });

    const { unmount } = render(<TripView initialTrip={testTrip} />);

    const shareBtn = screen.getByRole("button", { name: "旅程を共有" });
    await user.click(shareBtn);

    expect(
      await screen.findByText(/旅程のリンクをコピーしました！/),
    ).toBeInTheDocument();
    expect(writeTextMock).toHaveBeenCalled();

    unmount();
    delete (window.navigator as unknown as { clipboard?: unknown }).clipboard;
    delete (globalThis.navigator as unknown as { clipboard?: unknown })
      .clipboard;
  });
});
