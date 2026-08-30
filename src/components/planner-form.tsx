"use client";

import { useEffect, useState, type FormEvent } from "react";
import { searchHotels } from "@/lib/api";
import type { GenerateTripInput, SearchHotelItem } from "@/lib/types";
import { useI18n, type QuickPrompt } from "@/lib/i18n";
import { ArrowRightIcon } from "./icons";
import { HotelSearchModal } from "./hotel-search-modal";

interface PlannerFormProps {
  loading: boolean;
  onSubmit: (input: GenerateTripInput) => Promise<void>;
}

interface FormValues {
  text: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  budget: string;
  startArea: string;
  airport: string;
  hotel: string;
}

interface FormError {
  field: "text" | "time" | "date" | "budget";
  message: string;
}

const todaySeoul = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const initialValues: FormValues = {
  text: "",
  startDate: "",
  endDate: "",
  startTime: "13:00",
  endTime: "21:00",
  budget: "80000",
  startArea: "",
  airport: "",
  hotel: "",
};

export function PlannerForm({ loading, onSubmit }: PlannerFormProps) {
  const { t, quickPrompts, lang } = useI18n();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [error, setError] = useState<FormError>();
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [selectedHotelAddress, setSelectedHotelAddress] = useState<string | null>(null);
  const [hotelSuggestions, setHotelSuggestions] = useState<SearchHotelItem[]>([]);
  const [isSearchingHotel, setIsSearchingHotel] = useState(false);
  const [showHotelDropdown, setShowHotelDropdown] = useState(false);

  useEffect(() => {
    if (!values.hotel || values.hotel.trim().length < 2) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setIsSearchingHotel(true);
        const results = await searchHotels(values.hotel, values.startArea);
        setHotelSuggestions(results);
        setShowHotelDropdown(results.length > 0);
      } catch {
        setHotelSuggestions([]);
      } finally {
        setIsSearchingHotel(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [values.hotel, values.startArea]);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    if (key === "hotel" && (!value || (value as string).trim().length < 2)) {
      setHotelSuggestions([]);
      setShowHotelDropdown(false);
    }
    setError(undefined);
  }

  function handleSelectQuickPrompt(prompt: QuickPrompt) {
    setValues((current) => ({
      ...current,
      text: prompt.prompt,
      startArea: prompt.area,
      budget: prompt.budget ? String(prompt.budget) : current.budget,
    }));
    setError(undefined);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = values.text.trim();
    if (text.length < 10) {
      setError({ field: "text", message: t.formErrTextRequired });
      return;
    }
    if (values.startDate && values.startDate < todaySeoul) {
      setError({
        field: "date",
        message:
          lang === "ko"
            ? "시작일은 오늘 이후여야 합니다."
            : "開始日は本日以降を指定してください。",
      });
      return;
    }
    if (values.startDate && values.endDate && values.startDate > values.endDate) {
      setError({ field: "date", message: t.formErrDateWindow });
      return;
    }
    if (values.startTime && values.endTime && values.startTime >= values.endTime) {
      setError({ field: "time", message: t.formErrTimeWindow });
      return;
    }
    const budget = values.budget ? Number(values.budget) : undefined;
    if (budget !== undefined && (!Number.isInteger(budget) || budget < 0)) {
      setError({ field: "budget", message: t.formErrBudget });
      return;
    }
    await onSubmit({
      text,
      travelDate: values.startDate || undefined,
      startDate: values.startDate || undefined,
      endDate: values.endDate || undefined,
      startTime: values.startTime || undefined,
      endTime: values.endTime || undefined,
      budget,
      startArea: values.startArea.trim() || undefined,
      airport: values.airport || undefined,
      hotel: values.hotel.trim() || undefined,
      locale: lang,
    });
  }

  return (
    <form className="planner-form" onSubmit={submit} noValidate aria-busy={loading}>
      {/* Quick Prompts */}
      <section className="quick-prompts-section" aria-labelledby="quick-prompts-title">
        <p id="quick-prompts-title" className="quick-prompts-heading">
          {t.quickPromptHeading}
        </p>
        <div className="quick-prompts-grid">
          {quickPrompts.map((qp) => (
            <button
              key={qp.id}
              type="button"
              className="quick-prompt-chip"
              disabled={loading}
              onClick={() => handleSelectQuickPrompt(qp)}
            >
              <span>📍</span>
              <span>{qp.title}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="field">
        <label htmlFor="trip-request">
          {t.formRequestLabel} <span className="required" aria-hidden="true">*</span>
        </label>
        <textarea
          className="textarea"
          id="trip-request"
          value={values.text}
          onChange={(event) => update("text", event.target.value)}
          aria-describedby={`trip-request-hint${error?.field === "text" ? " trip-request-error" : ""}`}
          aria-invalid={error?.field === "text"}
          placeholder={t.formRequestPlaceholder}
          required
          disabled={loading}
        />
        <p className="hint" id="trip-request-hint">{t.formRequestHint}</p>
        {error?.field === "text" && <p className="field-error" id="trip-request-error" role="alert">{error.message}</p>}
      </div>

      {/* 1행: 시작 날짜 & 시작 시각 */}
      <div className="field-grid">
        <div className="field">
          <label htmlFor="start-date">{t.formStartDateLabel}</label>
          <input
            className="input"
            id="start-date"
            type="date"
            min={todaySeoul}
            value={values.startDate}
            onChange={(event) => update("startDate", event.target.value)}
            aria-describedby={error?.field === "date" ? "date-window-error" : undefined}
            aria-invalid={error?.field === "date"}
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="start-time">{t.formStartTimeLabel}</label>
          <input
            className="input"
            id="start-time"
            type="time"
            value={values.startTime}
            onChange={(event) => update("startTime", event.target.value)}
            aria-describedby={error?.field === "time" ? "time-window-error" : undefined}
            aria-invalid={error?.field === "time"}
            disabled={loading}
          />
        </div>
      </div>

      {/* 2행: 종료 날짜 & 종료 시각 */}
      <div className="field-grid">
        <div className="field">
          <label htmlFor="end-date">{t.formEndDateLabel}</label>
          <input
            className="input"
            id="end-date"
            type="date"
            min={values.startDate || todaySeoul}
            value={values.endDate}
            onChange={(event) => update("endDate", event.target.value)}
            aria-describedby={error?.field === "date" ? "date-window-error" : undefined}
            aria-invalid={error?.field === "date"}
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="end-time">{t.formEndTimeLabel}</label>
          <input
            className="input"
            id="end-time"
            type="time"
            value={values.endTime}
            onChange={(event) => update("endTime", event.target.value)}
            aria-describedby={error?.field === "time" ? "time-window-error" : undefined}
            aria-invalid={error?.field === "time"}
            disabled={loading}
          />
        </div>
      </div>
      {error?.field === "date" && (
        <p className="field-error" id="date-window-error" role="alert">
          {error.message}
        </p>
      )}
      {error?.field === "time" && (
        <p className="field-error" id="time-window-error" role="alert">
          {error.message}
        </p>
      )}

      {/* 3행: 출발 지역 & 예산 */}
      <div className="field-grid">
        <div className="field">
          <label htmlFor="start-area">{t.formStartAreaLabel}</label>
          <input
            className="input"
            id="start-area"
            value={values.startArea}
            onChange={(event) => update("startArea", event.target.value)}
            placeholder={t.formStartAreaPlaceholder}
            disabled={loading}
          />
        </div>
        <div className="field">
          <label htmlFor="budget">{t.formBudgetLabel}</label>
          <input
            className="input"
            id="budget"
            type="number"
            inputMode="numeric"
            min="0"
            step="1000"
            value={values.budget}
            onChange={(event) => update("budget", event.target.value)}
            aria-describedby={`budget-hint${error?.field === "budget" ? " budget-error" : ""}`}
            aria-invalid={error?.field === "budget"}
            disabled={loading}
          />
        </div>
      </div>
      <p className="hint" id="budget-hint" style={{ marginTop: 8 }}>{t.formBudgetHint}</p>
      {error?.field === "budget" && <p className="field-error" id="budget-error" role="alert">{error.message}</p>}

      {/* 4행: 이용 공항 & 숙소/호텔 */}
      <div className="field-grid" style={{ marginTop: 12 }}>
        <div className="field">
          <label htmlFor="airport">{t.formAirportLabel}</label>
          <select
            className="input"
            id="airport"
            value={values.airport}
            onChange={(event) => update("airport", event.target.value)}
            disabled={loading}
            style={{ appearance: "auto" }}
          >
            <option value="">{t.formAirportNone}</option>
            <option value="ICN_T1">{t.formAirportIcn1}</option>
            <option value="ICN_T2">{t.formAirportIcn2}</option>
            <option value="GMP">{t.formAirportGmp}</option>
          </select>
        </div>
        <div className="field" style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <label htmlFor="hotel" style={{ margin: 0 }}>{t.formHotelLabel}</label>
            <button
              type="button"
              onClick={() => setIsHotelModalOpen(true)}
              style={{
                background: "none",
                border: "none",
                color: "#2563eb",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "4px",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              {t.formHotelSearchBtn}
            </button>
          </div>

          <div style={{ display: "flex", gap: "6px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <input
                className="input"
                id="hotel"
                value={values.hotel}
                onChange={(event) => {
                  update("hotel", event.target.value);
                  setSelectedHotelAddress(null);
                }}
                onFocus={() => {
                  if (hotelSuggestions.length > 0) setShowHotelDropdown(true);
                }}
                placeholder={t.formHotelPlaceholder}
                disabled={loading}
                autoComplete="off"
              />
              {isSearchingHotel && (
                <span
                  className="spinner"
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 14,
                    height: 14,
                    borderWidth: 2,
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setIsHotelModalOpen(true)}
              disabled={loading}
              style={{
                height: "auto",
                padding: "0 12px",
                fontSize: "13px",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              {t.formHotelSearchBtn}
            </button>
          </div>

          {selectedHotelAddress && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 6,
                padding: "4px 8px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "6px",
                fontSize: "12px",
                color: "#166534",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span>📍</span>
                <span style={{ fontWeight: 600 }}>{selectedHotelAddress}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  update("hotel", "");
                  setSelectedHotelAddress(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#dc2626",
                  fontSize: "11px",
                  cursor: "pointer",
                  marginLeft: 8,
                }}
              >
                {t.formHotelClearBtn}
              </button>
            </div>
          )}

          {showHotelDropdown && hotelSuggestions.length > 0 && (
            <ul
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                zIndex: 50,
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)",
                marginTop: 4,
                maxHeight: 220,
                overflowY: "auto",
                listStyle: "none",
                padding: "4px 0",
              }}
            >
              {hotelSuggestions.map((h, idx) => (
                <li
                  key={`${h.name}-${idx}`}
                  onClick={() => {
                    update("hotel", h.name);
                    setSelectedHotelAddress(h.roadAddress || h.address || null);
                    setShowHotelDropdown(false);
                  }}
                  style={{
                    padding: "8px 12px",
                    cursor: "pointer",
                    borderBottom: idx < hotelSuggestions.length - 1 ? "1px solid #f1f5f9" : "none",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f0fdf4")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#0f172a" }}>
                    🏨 {h.name}
                  </div>
                  {h.roadAddress && (
                    <div style={{ fontSize: "11px", color: "#64748b", marginTop: 2 }}>
                      📍 {h.roadAddress}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="form-actions">
        <button className="button button-primary" type="submit" disabled={loading || !values.text.trim()}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" />
              {t.formSubmittingBtn}
            </>
          ) : (
            <>
              {t.formSubmitBtn}
              <ArrowRightIcon />
            </>
          )}
        </button>
      </div>

      <HotelSearchModal
        isOpen={isHotelModalOpen}
        onClose={() => setIsHotelModalOpen(false)}
        onSelect={(hotel) => {
          update("hotel", hotel.name);
          setSelectedHotelAddress(hotel.roadAddress || hotel.address || null);
          setShowHotelDropdown(false);
        }}
        initialQuery={values.hotel}
      />
    </form>
  );
}
