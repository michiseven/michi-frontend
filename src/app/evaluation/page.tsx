"use client";

import Link from "next/link";
import { useState } from "react";
import { EnvironmentBanner } from "@/components/environment-banner";
import { EvaluationComparison } from "@/components/evaluation-comparison";
import { EvaluationForm } from "@/components/evaluation-form";
import { useI18n } from "@/lib/i18n";
import {
  compareEvaluation,
  type EvaluationRequest,
  type EvaluationResponse,
} from "@/lib/evaluation-api";

export default function EvaluationPage() {
  const { lang } = useI18n();
  const [evaluation, setEvaluation] = useState<EvaluationResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  async function handleSubmit(input: EvaluationRequest) {
    setLoading(true);
    setError(undefined);
    try {
      const result = await compareEvaluation(input);
      setEvaluation(result);
      window.setTimeout(
        () =>
          document
            .querySelector(".evaluation-result")
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        0,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : lang === "ko"
            ? "평가를 완료하지 못했습니다."
            : "評価を完了できませんでした。",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell evaluation-shell" id="main-content">
      <div className="evaluation-heading">
        <div>
          <p className="eyebrow">CONTEST EVALUATION</p>
          <h1>{lang === "ko" ? "관광 분산 효과를 동일한 조건에서 비교." : "観光分散効果を、同じ条件で比較。"}</h1>
          <p className="lede">
            {lang === "ko"
              ? "일반적인 기준 추천과 Michi를 동일한 장소 후보 스냅샷에서 실행하여, 직접 취향을 유지하며 과밀 관광 수요를 분산하는지 측정합니다."
              : "一般的な推薦とMichiを同じ候補データで実行し、好みを保ちながら観光集中を緩和できるかを測定します。"}
          </p>
        </div>
        <Link className="button button-secondary" href="/">
          {lang === "ko" ? "플래너로 돌아가기" : "プランナーへ戻る"}
        </Link>
      </div>

      <EnvironmentBanner />
      <div className="status-banner evaluation-purpose">
        <strong>{lang === "ko" ? "평가용" : "評価用"}</strong>
        <span>
          {lang === "ko"
            ? "이 화면은 일반 내비게이션에는 노출되지 않는 재현 가능한 알고리즘 비교/검증 화면입니다."
            : "この画面は一般ナビゲーションには表示されない、再現可能なアルゴリズム比較画面です。"}
        </span>
      </div>
      {error && (
        <div className="status-banner error" role="alert">
          <strong>{lang === "ko" ? "비교 실패" : "比較失敗"}</strong>
          <span>{error}</span>
        </div>
      )}
      <EvaluationForm loading={loading} onSubmit={handleSubmit} />

      {loading && (
        <div
          className="loading-state evaluation-loading"
          role="status"
          aria-label={lang === "ko" ? "추천 알고리즘 비교 계산 중" : "推薦アルゴリズムを比較中"}
        >
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-card" />
          <p>
            {lang === "ko"
              ? "동일한 후보 스냅샷에서 Baseline과 Michi를 계산하고 있습니다…"
              : "同じ候補でBaselineとMichiを計算しています…"}
          </p>
        </div>
      )}
      {evaluation && !loading && (
        <EvaluationComparison evaluation={evaluation} />
      )}
    </main>
  );
}
