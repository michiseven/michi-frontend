import type {
  EvaluationDataMode,
  EvaluationMetric,
  EvaluationMetricKey,
  EvaluationMetricUnit,
  EvaluationResponse,
  EvaluationVariant,
  EvidenceControlledBenchmark,
  ExpectedDispersionEffect,
} from "@/lib/evaluation-api";

interface MetricDefinition {
  key: EvaluationMetricKey;
  label: string;
  note: string;
  unit: EvaluationMetricUnit;
}

const metricDefinitions: MetricDefinition[] = [
  {
    key: "averagePreferenceScore",
    label: "平均好み適合度",
    note: "高いほど望ましい",
    unit: "ratio",
  },
  {
    key: "tourismConcentrationScore",
    label: "観光集中度",
    note: "低いほど分散に寄与",
    unit: "ratio",
  },
  {
    key: "nonHotspotInclusionRate",
    label: "非ホットスポット含有率",
    note: "高いほど分散に寄与",
    unit: "ratio",
  },
  {
    key: "averageTravelDistanceKm",
    label: "平均移動距離",
    note: "短いほど移動負担が小さい",
    unit: "km",
  },
  {
    key: "averageTravelTimeMinutes",
    label: "平均移動時間",
    note: "短いほど移動負担が小さい",
    unit: "minutes",
  },
  {
    key: "localImpactScore",
    label: "ローカルインパクト",
    note: "高いほどローカル発見に寄与",
    unit: "ratio",
  },
];

const concentrationLabels = {
  low: "集中度 低",
  medium: "集中度 中",
  high: "集中度 高",
  unavailable: "集中度 データなし",
} as const;

function numberText(
  value: number,
  unit: EvaluationMetricUnit,
  signed = false,
): string {
  const sign = signed && value > 0 ? "+" : "";
  if (unit === "ratio") return `${sign}${Math.round(value * 100)}%`;
  if (unit === "km") return `${sign}${value.toFixed(2)} km`;
  return `${sign}${value.toFixed(1)}分`;
}

function metricText(metric: EvaluationMetric): string {
  if (metric.status === "unavailable" || metric.value === null)
    return "データなし";
  return numberText(metric.value, metric.unit);
}

function deltaText(value: number | null, unit: EvaluationMetricUnit): string {
  return value === null ? "データなし" : numberText(value, unit, true);
}

function modeLabel(mode: EvaluationDataMode): string {
  if (mode === "live") return "LIVE DATA";
  if (mode === "mock") return "MOCK DATA";
  return "MIXED DATA";
}

function ExpectedDispersionSummary({
  effect,
  title = "推薦結果に基づく予想分散効果",
  titleId = "evaluation-effect-title",
}: {
  effect: ExpectedDispersionEffect;
  title?: string;
  titleId?: string;
}) {
  const statusLabel = {
    available: "データに基づく比較が可能",
    partial: "一部データのみ存在",
    unavailable: "データなし",
  }[effect.evidenceStatus];

  return (
    <section
      className="evaluation-effect-section"
      aria-labelledby={titleId}
    >
      <div className="evaluation-effect-header">
        <div>
          <h3 id={titleId}>{title}</h3>
          <p className="evaluation-effect-version">{effect.algorithmVersion}</p>
        </div>
        <span
          className={`evaluation-effect-status-badge evaluation-effect-status-${effect.evidenceStatus}`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="evaluation-effect-grid">
        <div className="evaluation-effect-card">
          <div className="evaluation-effect-card-title">
            <span>観光集中度 削減</span>
            <span className="evaluation-effect-card-calc">Baseline − Michi</span>
          </div>
          <div className="evaluation-effect-card-val">
            {deltaText(effect.concentrationReduction, "ratio")}
          </div>
          <div className="evaluation-effect-card-note">
            正の値（+）ほど観光集中度の緩和効果が高い
          </div>
        </div>

        <div className="evaluation-effect-card">
          <div className="evaluation-effect-card-title">
            <span>非ホットスポット含有率 向上</span>
            <span className="evaluation-effect-card-calc">Michi − Baseline</span>
          </div>
          <div className="evaluation-effect-card-val">
            {deltaText(effect.nonHotspotInclusionLift, "ratio")}
          </div>
          <div className="evaluation-effect-card-note">
            正の値（+）ほど非集中エリアの含有率が高い
          </div>
        </div>

        <div className="evaluation-effect-card">
          <div className="evaluation-effect-card-title">
            <span>平均好み適合度 変化</span>
            <span className="evaluation-effect-card-calc">Michi − Baseline</span>
          </div>
          <div className="evaluation-effect-card-val">
            {deltaText(effect.preferenceChange, "ratio")}
          </div>
          <div className="evaluation-effect-card-note">
            負の値（−）は分散のための適合度トレードオフを示す
          </div>
        </div>

        <div className="evaluation-effect-card">
          <div className="evaluation-effect-card-title">
            <span>追加移動距離</span>
            <span className="evaluation-effect-card-calc">Michi − Baseline</span>
          </div>
          <div className="evaluation-effect-card-val">
            {deltaText(effect.extraTravelDistanceKm, "km")}
          </div>
          <div className="evaluation-effect-card-note">
            正の値（+）は分散に伴う追加移動距離を示す
          </div>
        </div>

        <div className="evaluation-effect-card">
          <div className="evaluation-effect-card-title">
            <span>追加移動時間</span>
            <span className="evaluation-effect-card-calc">Michi − Baseline</span>
          </div>
          <div className="evaluation-effect-card-val">
            {deltaText(effect.extraTravelTimeMinutes, "minutes")}
          </div>
          <div className="evaluation-effect-card-note">
            正の値（+）は分散に伴う追加移動時間を示す
          </div>
        </div>

        <div className="evaluation-effect-card">
          <div className="evaluation-effect-card-title">
            <span>ローカルインパクト 向上</span>
            <span className="evaluation-effect-card-calc">Michi − Baseline</span>
          </div>
          <div className="evaluation-effect-card-val">
            {deltaText(effect.localImpactLift, "ratio")}
          </div>
          <div className="evaluation-effect-card-note">
            正の値（+）ほど地域発見・分散プロキシに寄与
          </div>
        </div>
      </div>

      <div className="evaluation-effect-disclaimer" role="note">
        <strong>注意事項：</strong>
        これは推薦結果に基づく推定比較であり、実際の観光客減少効果を示すものではありません。
      </div>
    </section>
  );
}

function MetricComparisonTable({
  baseline,
  michi,
  delta,
  caption,
}: {
  baseline: EvaluationVariant;
  michi: EvaluationVariant;
  delta: EvaluationResponse["delta"];
  caption: string;
}) {
  return (
    <div className="evaluation-table-wrap">
      <table className="evaluation-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">評価指標</th>
            <th scope="col">Baseline</th>
            <th scope="col">Michi</th>
            <th scope="col">差（Michi − Baseline）</th>
          </tr>
        </thead>
        <tbody>
          {metricDefinitions.map((definition) => (
            <tr key={definition.key}>
              <th scope="row">
                <span>{definition.label}</span>
                <small>{definition.note}</small>
              </th>
              <td>{metricText(baseline.metrics[definition.key])}</td>
              <td>{metricText(michi.metrics[definition.key])}</td>
              <td>{deltaText(delta[definition.key], definition.unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RouteSummary({
  title,
  variant,
}: {
  title: string;
  variant: EvaluationVariant;
}) {
  return (
    <section
      className="evaluation-route"
      aria-labelledby={`evaluation-route-${title.toLowerCase()}`}
    >
      <div className="evaluation-route-heading">
        <h3 id={`evaluation-route-${title.toLowerCase()}`}>{title}</h3>
        <span>{variant.algorithmVersion}</span>
      </div>
      {variant.route.stops.length === 0 ? (
        <p className="evaluation-empty">選択された場所はありません。</p>
      ) : (
        <ol className="evaluation-route-list">
          {variant.route.stops.map((stop, index) => (
            <li key={`${stop.placeId}-${index}`}>
              <span className="evaluation-route-index" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <strong>{stop.placeName}</strong>
                <span>
                  {stop.arrivalAt || "時刻未定"}
                  {stop.concentrationLevel
                    ? ` ・ ${concentrationLabels[stop.concentrationLevel]}`
                    : ""}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function EvidenceControlledBenchmarkSummary({
  benchmark,
}: {
  benchmark: EvidenceControlledBenchmark;
}) {
  const statusLabel = {
    available: "比較可能",
    partial: "候補不足",
    unavailable: "比較不可",
  }[benchmark.status];
  const pool = benchmark.candidatePool;

  return (
    <section
      className="evaluation-controlled"
      aria-labelledby="evidence-controlled-title"
    >
      <div className="evaluation-effect-header">
        <div>
          <p className="eyebrow">EVIDENCE-CONTROLLED BENCHMARK</p>
          <h3 id="evidence-controlled-title">測定可能な候補だけの比較</h3>
          <p className="evaluation-effect-version">{benchmark.algorithmVersion}</p>
        </div>
        <span
          className={`evaluation-effect-status-badge evaluation-effect-status-${benchmark.status}`}
        >
          {statusLabel}
        </span>
      </div>

      <p className="evaluation-controlled-description">
        観光集中度データがあり、好み適合度の基準も通過した同一候補だけで
        BaselineとMichiを比較します。データがない場所を「低集中」とは扱いません。
      </p>

      <dl className="evaluation-controlled-pool">
        <div>
          <dt>全候補</dt>
          <dd>{pool.totalCandidates}</dd>
        </div>
        <div>
          <dt>集中度データあり</dt>
          <dd>{pool.candidatesWithConcentration}</dd>
        </div>
        <div>
          <dt>比較対象</dt>
          <dd>{pool.eligibleCandidates}</dd>
        </div>
        <div>
          <dt>選択数</dt>
          <dd>
            {pool.evaluatedSelectionCount}/{pool.requestedSelectionCount}
          </dd>
        </div>
      </dl>

      {benchmark.status === "unavailable" ? (
        <div className="status-banner warning" role="status">
          <strong>比較不可</strong>
          <span>観光集中度と好み基準を満たす候補がありません。</span>
        </div>
      ) : (
        <>
          {benchmark.status === "partial" && (
            <div className="status-banner warning" role="status">
              <strong>候補不足</strong>
              <span>要求された訪問数を満たさない限定的な比較です。</span>
            </div>
          )}
          <MetricComparisonTable
            baseline={benchmark.baseline}
            michi={benchmark.michi}
            delta={benchmark.delta}
            caption="観光集中度を測定できる同一候補群に対するBaselineとMichiの比較"
          />
          <ExpectedDispersionSummary
            effect={benchmark.expectedEffect}
            title="測定可能な候補内の予想分散効果"
            titleId="evidence-controlled-effect-title"
          />
          <div className="evaluation-route-grid">
            <RouteSummary title="Controlled Baseline" variant={benchmark.baseline} />
            <RouteSummary title="Controlled Michi" variant={benchmark.michi} />
          </div>
        </>
      )}
    </section>
  );
}

export function EvaluationComparison({
  evaluation,
}: {
  evaluation: EvaluationResponse;
}) {
  return (
    <section
      className="evaluation-result"
      aria-labelledby="evaluation-result-title"
    >
      <div className="evaluation-result-heading">
        <div>
          <p className="eyebrow">SAME INPUT, TWO ALGORITHMS</p>
          <h2 id="evaluation-result-title">Baseline と Michi の比較</h2>
          <p className="evaluation-generated-at">
            評価ID: {evaluation.evaluationId} ・ {evaluation.generatedAt}
          </p>
        </div>
        <span
          className={`evaluation-mode evaluation-mode-${evaluation.dataMode}`}
        >
          {modeLabel(evaluation.dataMode)}
        </span>
      </div>

      {evaluation.dataMode !== "live" && (
        <div className="status-banner warning" role="status">
          <strong>{evaluation.dataMode === "mock" ? "MOCK" : "MIXED"}</strong>
          <span>
            {evaluation.dataMode === "mock"
              ? "この結果はモック観光データを含み、実測成果ではありません。"
              : "この結果にはモックデータが混在しています。データ提供元を確認してください。"}
          </span>
        </div>
      )}
      {evaluation.warnings.map((warning, index) => (
        <div
          className="status-banner warning"
          role="status"
          key={`${warning}-${index}`}
        >
          <strong>注意</strong>
          <span>{warning}</span>
        </div>
      ))}

      <MetricComparisonTable
        baseline={evaluation.baseline}
        michi={evaluation.michi}
        delta={evaluation.delta}
        caption="同一候補に対するBaselineとMichiの評価指標"
      />

      <ExpectedDispersionSummary effect={evaluation.expectedEffect} />

      <EvidenceControlledBenchmarkSummary
        benchmark={evaluation.evidenceControlledBenchmark}
      />

      <div className="evaluation-route-grid">
        <RouteSummary title="Baseline" variant={evaluation.baseline} />
        <RouteSummary title="Michi" variant={evaluation.michi} />
      </div>

      <section
        className="evaluation-sources"
        aria-labelledby="evaluation-sources-title"
      >
        <h3 id="evaluation-sources-title">使用データと参照期間</h3>
        {evaluation.dataSources.length === 0 ? (
          <p className="evaluation-empty">
            追跡可能な観光データ提供元はありません。
          </p>
        ) : (
          <ul>
            {evaluation.dataSources.map((source) => (
              <li key={source.sourceRef}>
                <div>
                  <strong>{source.sourceName}</strong>
                  <span>{source.dataset}</span>
                </div>
                <div className="evaluation-source-meta">
                  <span>{source.referencePeriod ?? "参照期間なし"}</span>
                  <span className={`evaluation-source-mode ${source.mode}`}>
                    {source.mode.toUpperCase()}
                  </span>
                  {source.mode === "live" && source.sourceUrl && (
                    <a href={source.sourceUrl} target="_blank" rel="noreferrer">
                      出典を確認
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
