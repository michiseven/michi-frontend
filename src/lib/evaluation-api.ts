import type { GenerateTripInput, TripPreference } from "./types";

const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
).replace(/\/$/, "");

export type EvaluationDataMode = "live" | "mock" | "mixed";
export type EvaluationMetricUnit = "ratio" | "km" | "minutes";

export interface EvaluationMetric {
  value: number | null;
  unit: EvaluationMetricUnit;
  status: "measured" | "unavailable";
  sampleSize: number;
}

export type EvaluationMetricKey =
  | "averagePreferenceScore"
  | "tourismConcentrationScore"
  | "nonHotspotInclusionRate"
  | "averageTravelDistanceKm"
  | "averageTravelTimeMinutes"
  | "localImpactScore";

export type EvaluationMetrics = Record<EvaluationMetricKey, EvaluationMetric>;
export type EvaluationDelta = Record<EvaluationMetricKey, number | null>;

export interface EvaluationRouteStop {
  placeId: string;
  placeName: string;
  arrivalAt: string;
  concentrationLevel?: "low" | "medium" | "high" | "unavailable";
}

export interface EvaluationVariant {
  algorithmVersion: string;
  metrics: EvaluationMetrics;
  route: {
    stops: EvaluationRouteStop[];
  };
}

export interface EvaluationDataSource {
  sourceRef: string;
  sourceName: string;
  dataset: string;
  sourceUrl?: string | null;
  referencePeriod: string | null;
  mode: "live" | "mock";
}

export type ExpectedDispersionEvidenceStatus =
  | "available"
  | "partial"
  | "unavailable";

export interface ExpectedDispersionEffect {
  algorithmVersion: string;
  claimScope: "recommendation_estimate";
  evidenceStatus: ExpectedDispersionEvidenceStatus;
  concentrationReduction: number | null;
  nonHotspotInclusionLift: number | null;
  preferenceChange: number | null;
  extraTravelDistanceKm: number | null;
  extraTravelTimeMinutes: number | null;
  localImpactLift: number | null;
}

export interface EvidenceControlledBenchmark {
  algorithmVersion: string;
  status: "available" | "partial" | "unavailable";
  candidatePool: {
    totalCandidates: number;
    candidatesWithConcentration: number;
    excludedMissingConcentration: number;
    excludedBelowPreferenceThreshold: number;
    eligibleCandidates: number;
    requestedSelectionCount: number;
    evaluatedSelectionCount: number;
  };
  baseline: EvaluationVariant;
  michi: EvaluationVariant;
  delta: EvaluationDelta;
  expectedEffect: ExpectedDispersionEffect;
}

export interface EvaluationResponse {
  evaluationId: string;
  generatedAt: string;
  preference: TripPreference;
  dataMode: EvaluationDataMode;
  baseline: EvaluationVariant;
  michi: EvaluationVariant;
  /** Every delta is Michi minus Baseline. */
  delta: EvaluationDelta;
  expectedEffect: ExpectedDispersionEffect;
  evidenceControlledBenchmark: EvidenceControlledBenchmark;
  dataSources: EvaluationDataSource[];
  warnings: string[];
}

export type EvaluationRequest = GenerateTripInput;

export class EvaluationApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "EvaluationApiError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function isExpectedDispersionEffect(
  value: unknown,
): value is ExpectedDispersionEffect {
  if (!isObject(value)) return false;
  return (
    typeof value.algorithmVersion === "string" &&
    value.claimScope === "recommendation_estimate" &&
    ["available", "partial", "unavailable"].includes(
      String(value.evidenceStatus),
    ) &&
    isNullableNumber(value.concentrationReduction) &&
    isNullableNumber(value.nonHotspotInclusionLift) &&
    isNullableNumber(value.preferenceChange) &&
    isNullableNumber(value.extraTravelDistanceKm) &&
    isNullableNumber(value.extraTravelTimeMinutes) &&
    isNullableNumber(value.localImpactLift)
  );
}

function isEvidenceControlledBenchmark(
  value: unknown,
): value is EvidenceControlledBenchmark {
  if (!isObject(value) || !isObject(value.candidatePool)) return false;
  const pool = value.candidatePool;
  return (
    typeof value.algorithmVersion === "string" &&
    ["available", "partial", "unavailable"].includes(String(value.status)) &&
    typeof pool.totalCandidates === "number" &&
    typeof pool.candidatesWithConcentration === "number" &&
    typeof pool.excludedMissingConcentration === "number" &&
    typeof pool.excludedBelowPreferenceThreshold === "number" &&
    typeof pool.eligibleCandidates === "number" &&
    typeof pool.requestedSelectionCount === "number" &&
    typeof pool.evaluatedSelectionCount === "number" &&
    isObject(value.baseline) &&
    isObject(value.michi) &&
    isObject(value.delta) &&
    isExpectedDispersionEffect(value.expectedEffect)
  );
}

function normalizeEvaluation(payload: unknown): EvaluationResponse {
  if (!isObject(payload)) {
    throw new EvaluationApiError(
      "評価APIの応答形式が正しくありません。",
      undefined,
      "INVALID_RESPONSE",
    );
  }
  const candidate = payload.data ?? payload.evaluation ?? payload;
  if (
    !isObject(candidate) ||
    typeof candidate.evaluationId !== "string" ||
    !isObject(candidate.baseline) ||
    !isObject(candidate.michi) ||
    !isExpectedDispersionEffect(candidate.expectedEffect) ||
    !isEvidenceControlledBenchmark(candidate.evidenceControlledBenchmark) ||
    !Array.isArray(candidate.dataSources) ||
    !Array.isArray(candidate.warnings)
  ) {
    throw new EvaluationApiError(
      "評価APIの応答形式が正しくありません。",
      undefined,
      "INVALID_RESPONSE",
    );
  }
  return candidate as unknown as EvaluationResponse;
}

export async function compareEvaluation(
  input: EvaluationRequest,
): Promise<EvaluationResponse> {
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/evaluations/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    throw new EvaluationApiError(
      "評価サーバーに接続できません。バックエンドの起動とAPI URLを確認してください。",
      undefined,
      "NETWORK_ERROR",
    );
  }

  const payload = (await response.json().catch(() => undefined)) as
    { message?: string; code?: string } | undefined;
  if (!response.ok) {
    throw new EvaluationApiError(
      payload?.message ?? "評価を完了できませんでした。",
      response.status,
      payload?.code,
    );
  }
  return normalizeEvaluation(payload);
}
