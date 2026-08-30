import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  compareEvaluation,
  type EvaluationResponse,
} from "@/lib/evaluation-api";
import { captureMichiEvent } from "@/lib/telemetry";
import EvaluationPage from "./page";

vi.mock("@/lib/evaluation-api", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/evaluation-api")>();
  return { ...original, compareEvaluation: vi.fn() };
});

vi.mock("@/lib/telemetry", () => ({ captureMichiEvent: vi.fn() }));

const measured = (value: number, unit: "ratio" | "km" | "minutes") => ({
  value,
  unit,
  status: "measured" as const,
  sampleSize: 4,
});

const unavailable = (unit: "ratio" | "km" | "minutes") => ({
  value: null,
  unit,
  status: "unavailable" as const,
  sampleSize: 0,
});

const evaluationFixture: EvaluationResponse = {
  evaluationId: "evaluation-test-1",
  generatedAt: "2026-08-20T12:00:00.000Z",
  preference: {
    area: "성수",
    startTime: "13:00",
    endTime: "21:00",
    budget: 80000,
    companions: "solo",
    pace: "relaxed",
    interests: ["cafe"],
    preferences: ["quiet"],
    avoid: ["crowded"],
  },
  dataMode: "mixed",
  baseline: {
    algorithmVersion: "baseline-v1",
    metrics: {
      averagePreferenceScore: measured(0.84, "ratio"),
      tourismConcentrationScore: measured(0.73, "ratio"),
      nonHotspotInclusionRate: measured(0.18, "ratio"),
      averageTravelDistanceKm: measured(5.2, "km"),
      averageTravelTimeMinutes: measured(51, "minutes"),
      localImpactScore: unavailable("ratio"),
    },
    route: {
      stops: [
        {
          placeId: "place-a",
          placeName: "人気スポットA",
          arrivalAt: "13:00",
          concentrationLevel: "high",
        },
      ],
    },
  },
  michi: {
    algorithmVersion: "michi-v1",
    metrics: {
      averagePreferenceScore: measured(0.82, "ratio"),
      tourismConcentrationScore: measured(0.51, "ratio"),
      nonHotspotInclusionRate: measured(0.41, "ratio"),
      averageTravelDistanceKm: measured(5.8, "km"),
      averageTravelTimeMinutes: measured(57, "minutes"),
      localImpactScore: measured(0.71, "ratio"),
    },
    route: {
      stops: [
        {
          placeId: "place-b",
          placeName: "ローカルスポットB",
          arrivalAt: "13:10",
          concentrationLevel: "low",
        },
      ],
    },
  },
  delta: {
    averagePreferenceScore: -0.02,
    tourismConcentrationScore: -0.22,
    nonHotspotInclusionRate: 0.23,
    averageTravelDistanceKm: 0.6,
    averageTravelTimeMinutes: 6,
    localImpactScore: null,
  },
  expectedEffect: {
    algorithmVersion: "expected-dispersion-effect-v1",
    claimScope: "recommendation_estimate",
    evidenceStatus: "available",
    concentrationReduction: 0.22,
    nonHotspotInclusionLift: 0.23,
    preferenceChange: -0.02,
    extraTravelDistanceKm: 0.6,
    extraTravelTimeMinutes: 6,
    localImpactLift: null,
  },
  evidenceControlledBenchmark: {
    algorithmVersion: "evidence-controlled-benchmark-v1",
    status: "available",
    candidatePool: {
      totalCandidates: 12,
      candidatesWithConcentration: 6,
      excludedMissingConcentration: 6,
      excludedBelowPreferenceThreshold: 2,
      eligibleCandidates: 4,
      requestedSelectionCount: 3,
      evaluatedSelectionCount: 3,
    },
    baseline: {
      algorithmVersion: "baseline-v1",
      metrics: {
        averagePreferenceScore: measured(0.84, "ratio"),
        tourismConcentrationScore: measured(0.73, "ratio"),
        nonHotspotInclusionRate: measured(0.18, "ratio"),
        averageTravelDistanceKm: measured(5.2, "km"),
        averageTravelTimeMinutes: measured(51, "minutes"),
        localImpactScore: unavailable("ratio"),
      },
      route: { stops: [] },
    },
    michi: {
      algorithmVersion: "michi-v1",
      metrics: {
        averagePreferenceScore: measured(0.82, "ratio"),
        tourismConcentrationScore: measured(0.51, "ratio"),
        nonHotspotInclusionRate: measured(0.41, "ratio"),
        averageTravelDistanceKm: measured(5.8, "km"),
        averageTravelTimeMinutes: measured(57, "minutes"),
        localImpactScore: measured(0.71, "ratio"),
      },
      route: { stops: [] },
    },
    delta: {
      averagePreferenceScore: -0.02,
      tourismConcentrationScore: -0.22,
      nonHotspotInclusionRate: 0.23,
      averageTravelDistanceKm: 0.6,
      averageTravelTimeMinutes: 6,
      localImpactScore: null,
    },
    expectedEffect: {
      algorithmVersion: "expected-dispersion-effect-v1",
      claimScope: "recommendation_estimate",
      evidenceStatus: "available",
      concentrationReduction: 0.22,
      nonHotspotInclusionLift: 0.23,
      preferenceChange: -0.02,
      extraTravelDistanceKm: 0.6,
      extraTravelTimeMinutes: 6,
      localImpactLift: null,
    },
  },
  dataSources: [
    {
      sourceRef: "kto-datalab-visit",
      sourceName: "한국관광 데이터랩",
      dataset: "지역별 방문자 수",
      sourceUrl: "https://datalab.visitkorea.or.kr/",
      referencePeriod: "2026-07",
      mode: "live",
    },
    {
      sourceRef: "mock-flow",
      sourceName: "Michi fixture",
      dataset: "관광 흐름 테스트 데이터",
      sourceUrl: null,
      referencePeriod: "2026-07",
      mode: "mock",
    },
  ],
  warnings: ["観光フロー指標の一部はMOCKです。"],
};

describe("evaluation page", () => {
  beforeEach(() => {
    vi.mocked(compareEvaluation).mockReset();
    vi.mocked(captureMichiEvent).mockReset();
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("compares six metrics, routes, expected dispersion effect, and traceable sources without telemetry", async () => {
    vi.mocked(compareEvaluation).mockResolvedValue(evaluationFixture);
    const user = userEvent.setup();
    render(<EvaluationPage />);

    await user.click(
      screen.getByRole("button", { name: "BaselineとMichiを比較" }),
    );

    await waitFor(() =>
      expect(compareEvaluation).toHaveBeenCalledWith(
        expect.objectContaining({
          startArea: "聖水",
          startTime: "13:00",
          endTime: "21:00",
          budget: 80000,
        }),
      ),
    );
    expect(
      await screen.findByRole("heading", { name: "Baseline と Michi の比較" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(2);
    expect(screen.getAllByText("平均好み適合度")).toHaveLength(2);
    expect(screen.getAllByText("観光集中度")).toHaveLength(2);
    expect(screen.getAllByText("非ホットスポット含有率")).toHaveLength(2);
    expect(screen.getAllByText("平均移動距離")).toHaveLength(2);
    expect(screen.getAllByText("平均移動時間")).toHaveLength(2);
    expect(screen.getAllByText("ローカルインパクト")).toHaveLength(2);
    expect(screen.getAllByText("データなし").length).toBeGreaterThan(0);
    expect(screen.getByText("人気スポットA")).toBeInTheDocument();
    expect(screen.getByText("ローカルスポットB")).toBeInTheDocument();
    expect(screen.getByText("지역별 방문자 수")).toBeInTheDocument();
    expect(screen.getAllByText("2026-07")).toHaveLength(2);
    expect(screen.getByText("MIXED DATA")).toBeInTheDocument();
    expect(screen.getByText(/モックデータが混在/)).toBeInTheDocument();

    // ExpectedDispersionEffect assertions
    expect(
      screen.getByRole("heading", { name: "推薦結果に基づく予想分散効果" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("データに基づく比較が可能")).toHaveLength(2);
    expect(screen.getAllByText("観光集中度 削減")).toHaveLength(2);
    expect(screen.getAllByText("非ホットスポット含有率 向上")).toHaveLength(2);
    expect(screen.getAllByText("平均好み適合度 変化")).toHaveLength(2);
    expect(screen.getAllByText("追加移動距離")).toHaveLength(2);
    expect(screen.getAllByText("追加移動時間")).toHaveLength(2);
    expect(screen.getAllByText("ローカルインパクト 向上")).toHaveLength(2);
    expect(
      screen.getByRole("heading", { name: "測定可能な候補だけの比較" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/データがない場所を「低集中」とは扱いません/)).toBeInTheDocument();
    expect(screen.getByText("測定可能な候補内の予想分散効果")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(
      screen.getAllByText(
        /これは推薦結果に基づく推定比較であり、実際の観光客減少効果を示すものではありません。/,
      ),
    ).toHaveLength(2);

    expect(captureMichiEvent).not.toHaveBeenCalled();
  });

  it("preserves the input and shows a backend error", async () => {
    vi.mocked(compareEvaluation).mockRejectedValue(
      new Error("評価用データがありません。"),
    );
    const user = userEvent.setup();
    render(<EvaluationPage />);
    const request = screen.getByLabelText("比較する旅行条件");

    await user.click(
      screen.getByRole("button", { name: "BaselineとMichiを比較" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "評価用データがありません。",
    );
    expect(request).toHaveValue(
      "静かなカフェとセレクトショップを巡り、混雑しすぎないソウルを楽しみたいです。",
    );
  });
});
