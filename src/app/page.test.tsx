import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateTrip } from "@/lib/api";
import { captureMichiEvent, getLogFriendsClient } from "@/lib/telemetry";
import { I18nProvider, resetLanguage } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { testTrip } from "@/test/fixtures";
import HomePage from "./page";

vi.mock("@/lib/api", () => ({
  demoMode: false,
  generateTrip: vi.fn(),
  patchTripStops: vi.fn(),
}));

vi.mock("@/lib/telemetry", () => ({
  captureMichiEvent: vi.fn(),
  getLogFriendsClient: vi.fn(),
}));

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <I18nProvider>
      <header>
        <LanguageSwitcher />
      </header>
      {ui}
    </I18nProvider>,
  );
}

describe("trip planner flow and i18n", () => {
  beforeEach(() => {
    vi.mocked(generateTrip).mockReset();
    vi.mocked(captureMichiEvent).mockReset();
    vi.mocked(getLogFriendsClient).mockReset();
    Element.prototype.scrollIntoView = vi.fn();
    resetLanguage("ja");
  });

  it("links to the NAVER Maps preview page", () => {
    renderWithI18n(<HomePage />);

    expect(screen.getByRole("link", { name: "地図の表示を確認" })).toHaveAttribute(
      "href",
      "/map-preview",
    );
  });

  it("sends explicit constraints and renders an explainable trip", async () => {
    vi.mocked(generateTrip).mockResolvedValue(testTrip);
    const user = userEvent.setup();
    renderWithI18n(<HomePage />);

    await user.type(screen.getByLabelText(/どんな一日にしたいですか/), "静かなカフェとショップを一人で巡りたいです。");
    await user.click(screen.getByRole("button", { name: "旅程を作る" }));

    await waitFor(() => expect(generateTrip).toHaveBeenCalledWith(expect.objectContaining({
      text: "静かなカフェとショップを一人で巡りたいです。",
      startTime: "13:00",
      endTime: "21:00",
      budget: 80000,
      locale: "ja",
    })));
    expect(await screen.findByRole("heading", { name: "聖水の静かな午後" })).toBeInTheDocument();
    expect(screen.getAllByText("テストカフェ").length).toBeGreaterThan(0);
    expect(screen.getByText(/特定店舗の店内混雑度ではありません/)).toBeInTheDocument();
    expect(screen.getByText("AI解析: MOCK")).toBeInTheDocument();
    expect(screen.getAllByText("なぜここがおすすめ？ スコア内訳")).toHaveLength(2);
    expect(captureMichiEvent).toHaveBeenCalledWith("trip_requested", {
      context: { hasDate: false, hasTimeWindow: true, hasBudget: true, hasStartArea: false },
    });
    expect(captureMichiEvent).toHaveBeenCalledWith("trip_generated", {
      tripId: "trip-test-1",
      context: { stopCount: 2, usesMockProvider: true },
    });
  });

  it("switches language between Japanese and Korean seamlessly", async () => {
    vi.mocked(generateTrip).mockResolvedValue(testTrip);
    const user = userEvent.setup();
    renderWithI18n(<HomePage />);

    expect(screen.getByRole("heading", { name: "あなたらしいソウルの道を。" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "旅程を作る" })).toBeInTheDocument();

    // Switch to Korean
    await user.click(screen.getByRole("button", { name: "한국어" }));

    expect(screen.getByRole("heading", { name: "나만의 서울 여행길을 찾아서." })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "일정 만들기" })).toBeInTheDocument();
    expect(screen.getByText("추천 여행 테마로 시작하기")).toBeInTheDocument();

    // Click a Korean quick prompt chip
    await user.click(screen.getByRole("button", { name: /마포·공덕 로컬 미식 탐방/ }));

    expect(screen.getByLabelText(/어떤 하루를 보내고 싶으신가요/)).toHaveValue(
      "공덕과 마포 일대에서 로컬 맛집과 분위기 좋은 카페를 탐방하고 싶어요. 과밀한 곳을 피해 여유로운 동선을 원합니다.",
    );

    // Submit in Korean
    await user.click(screen.getByRole("button", { name: "일정 만들기" }));

    await waitFor(() => expect(generateTrip).toHaveBeenCalledWith(expect.objectContaining({
      locale: "ko",
      startArea: "공덕",
      budget: 70000,
    })));
  });

  it("keeps the input and shows an API failure", async () => {
    vi.mocked(generateTrip).mockRejectedValue(new Error("백엔드에 연결할 수 없습니다."));
    const user = userEvent.setup();
    renderWithI18n(<HomePage />);
    const input = screen.getByLabelText(/どんな一日にしたいですか/);
    await user.type(input, "静かな場所だけをゆっくり歩きたいです。");
    await user.click(screen.getByRole("button", { name: "旅程を作る" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("백엔드에 연결할 수 없습니다.");
    expect(input).toHaveValue("静かな場所だけをゆっくり歩きたいです。");
  });

  it("clears a previous trip when the next request fails", async () => {
    vi.mocked(generateTrip)
      .mockResolvedValueOnce(testTrip)
      .mockRejectedValueOnce(new Error("混雑データを取得できません。"));
    const user = userEvent.setup();
    renderWithI18n(<HomePage />);
    const input = screen.getByLabelText(/どんな一日にしたいですか/);
    await user.type(input, "静かなカフェとショップを一人で巡りたいです。");
    await user.click(screen.getByRole("button", { name: "旅程を作る" }));
    expect(await screen.findByRole("heading", { name: "聖水の静かな午後" })).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, "孔徳で静かなカフェと食堂を巡りたいです。");
    await user.click(screen.getByRole("button", { name: "旅程を作る" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("混雑データを取得できません。");
    expect(screen.queryByRole("heading", { name: "聖水の静かな午後" })).not.toBeInTheDocument();
  });

  it("associates a time-window error with the time inputs", async () => {
    const user = userEvent.setup();
    renderWithI18n(<HomePage />);
    const request = screen.getByLabelText(/どんな一日にしたいですか/);
    const endTime = screen.getByLabelText("終了時刻");

    await user.type(request, "静かなカフェを一人でゆっくり巡りたいです。");
    await user.clear(endTime);
    await user.type(endTime, "12:00");
    await user.click(screen.getByRole("button", { name: "旅程を作る" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("終了時刻は開始時刻より後にしてください。");
    expect(endTime).toHaveAttribute("aria-invalid", "true");
    expect(endTime).toHaveAttribute("aria-describedby", "time-window-error");
    expect(request).toHaveAttribute("aria-invalid", "false");
    expect(generateTrip).not.toHaveBeenCalled();
  });
});
