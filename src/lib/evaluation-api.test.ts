import { afterEach, describe, expect, it, vi } from "vitest";
import { compareEvaluation, EvaluationApiError } from "./evaluation-api";

const responseFixture = {
  evaluationId: "evaluation-1",
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
  dataMode: "live",
  baseline: {
    algorithmVersion: "baseline-v1",
    metrics: {},
    route: { stops: [] },
  },
  michi: { algorithmVersion: "michi-v1", metrics: {}, route: { stops: [] } },
  delta: {},
  expectedEffect: {
    algorithmVersion: "expected-dispersion-effect-v1",
    claimScope: "recommendation_estimate",
    evidenceStatus: "unavailable",
    concentrationReduction: null,
    nonHotspotInclusionLift: null,
    preferenceChange: null,
    extraTravelDistanceKm: null,
    extraTravelTimeMinutes: null,
    localImpactLift: null,
  },
  evidenceControlledBenchmark: {
    algorithmVersion: "evidence-controlled-benchmark-v1",
    status: "unavailable",
    candidatePool: {
      totalCandidates: 0,
      candidatesWithConcentration: 0,
      excludedMissingConcentration: 0,
      excludedBelowPreferenceThreshold: 0,
      eligibleCandidates: 0,
      requestedSelectionCount: 0,
      evaluatedSelectionCount: 0,
    },
    baseline: { algorithmVersion: "baseline-v1", metrics: {}, route: { stops: [] } },
    michi: { algorithmVersion: "michi-v1", metrics: {}, route: { stops: [] } },
    delta: {},
    expectedEffect: {
      algorithmVersion: "expected-dispersion-effect-v1",
      claimScope: "recommendation_estimate",
      evidenceStatus: "unavailable",
      concentrationReduction: null,
      nonHotspotInclusionLift: null,
      preferenceChange: null,
      extraTravelDistanceKm: null,
      extraTravelTimeMinutes: null,
      localImpactLift: null,
    },
  },
  dataSources: [],
  warnings: [],
};

afterEach(() => vi.unstubAllGlobals());

describe("evaluation API", () => {
  it("posts one input to the comparison endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(responseFixture), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await compareEvaluation({
      text: "静かなカフェを一人で巡りたいです。",
      startArea: "聖水",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/api/evaluations/compare",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          text: "静かなカフェを一人で巡りたいです。",
          startArea: "聖水",
        }),
      }),
    );
    expect(result.evaluationId).toBe("evaluation-1");
  });

  it("rejects a malformed success response instead of displaying invented values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const error = await compareEvaluation({
      text: "静かな場所を巡りたいです。",
    }).catch((cause) => cause);

    expect(error).toBeInstanceOf(EvaluationApiError);
    expect(error).toMatchObject({ code: "INVALID_RESPONSE" });
  });

  it("rejects a response that omits the required expected effect contract", async () => {
    const withoutExpectedEffect: Record<string, unknown> = { ...responseFixture };
    delete withoutExpectedEffect.expectedEffect;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(withoutExpectedEffect), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const error = await compareEvaluation({ text: "静かな場所を巡りたいです。" }).catch(
      (cause) => cause,
    );

    expect(error).toBeInstanceOf(EvaluationApiError);
    expect(error).toMatchObject({ code: "INVALID_RESPONSE" });
  });
});
