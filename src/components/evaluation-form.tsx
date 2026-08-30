"use client";

import { useState, type FormEvent } from "react";
import type { EvaluationRequest } from "@/lib/evaluation-api";

interface EvaluationFormProps {
  loading: boolean;
  onSubmit: (input: EvaluationRequest) => Promise<void>;
}

interface EvaluationFormValues {
  text: string;
  travelDate: string;
  startTime: string;
  endTime: string;
  budget: string;
  startArea: string;
}

const initialValues: EvaluationFormValues = {
  text: "静かなカフェとセレクトショップを巡り、混雑しすぎないソウルを楽しみたいです。",
  travelDate: "",
  startTime: "13:00",
  endTime: "21:00",
  budget: "80000",
  startArea: "聖水",
};

export function EvaluationForm({ loading, onSubmit }: EvaluationFormProps) {
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string>();

  function update<K extends keyof EvaluationFormValues>(
    key: K,
    value: EvaluationFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setError(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = values.text.trim();
    if (text.length < 10) {
      setError("希望を10文字以上で入力してください。");
      return;
    }
    if (
      values.startTime &&
      values.endTime &&
      values.startTime >= values.endTime
    ) {
      setError("終了時刻は開始時刻より後にしてください。");
      return;
    }
    const budget = values.budget ? Number(values.budget) : undefined;
    if (budget !== undefined && (!Number.isInteger(budget) || budget < 0)) {
      setError("予算は0以上のウォン単位で入力してください。");
      return;
    }
    await onSubmit({
      text,
      travelDate: values.travelDate || undefined,
      startTime: values.startTime || undefined,
      endTime: values.endTime || undefined,
      budget,
      startArea: values.startArea.trim() || undefined,
    });
  }

  return (
    <form
      className="planner-form evaluation-form"
      onSubmit={submit}
      noValidate
      aria-busy={loading}
    >
      <div className="field">
        <label htmlFor="evaluation-request">比較する旅行条件</label>
        <textarea
          className="textarea"
          id="evaluation-request"
          value={values.text}
          onChange={(event) => update("text", event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? "evaluation-form-error" : "evaluation-request-hint"
          }
          disabled={loading}
          required
        />
        <p className="hint" id="evaluation-request-hint">
          同じ条件と候補データをBaselineとMichiに適用します。
        </p>
      </div>

      <div className="field-grid">
        <div className="field">
          <label htmlFor="evaluation-date">日付</label>
          <input
            className="input"
            id="evaluation-date"
            type="date"
            value={values.travelDate}
            onChange={(event) => update("travelDate", event.target.value)}
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="evaluation-area">出発エリア</label>
          <input
            className="input"
            id="evaluation-area"
            value={values.startArea}
            onChange={(event) => update("startArea", event.target.value)}
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="evaluation-start-time">開始時刻</label>
          <input
            className="input"
            id="evaluation-start-time"
            type="time"
            value={values.startTime}
            onChange={(event) => update("startTime", event.target.value)}
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="evaluation-end-time">終了時刻</label>
          <input
            className="input"
            id="evaluation-end-time"
            type="time"
            value={values.endTime}
            onChange={(event) => update("endTime", event.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <div className="field evaluation-budget-field">
        <label htmlFor="evaluation-budget">予算（KRW）</label>
        <input
          className="input"
          id="evaluation-budget"
          type="number"
          inputMode="numeric"
          min="0"
          step="1000"
          value={values.budget}
          onChange={(event) => update("budget", event.target.value)}
          disabled={loading}
        />
      </div>

      {error && (
        <p className="field-error" id="evaluation-form-error" role="alert">
          {error}
        </p>
      )}
      <div className="form-actions">
        <button
          className="button button-primary"
          type="submit"
          disabled={loading || !values.text.trim()}
        >
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              比較中
            </>
          ) : (
            "BaselineとMichiを比較"
          )}
        </button>
      </div>
    </form>
  );
}
