"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  deleteUserSavedTrip,
  getUserSavedTrips,
  updateUserSavedTripMemo,
} from "@/lib/api";
import { isAuthenticated, subscribeAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { UserSavedTrip } from "@/lib/types";
import {
  ArrowRightIcon,
  CalendarIcon,
  EditIcon,
  MapPinIcon,
  TrashIcon,
} from "@/components/icons";

export default function SavedTripsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [savedTrips, setSavedTrips] = useState<UserSavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState("");
  const [savingMemo, setSavingMemo] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth");
      return;
    }

    getUserSavedTrips(1, 50)
      .then((res) => {
        setSavedTrips(res.items);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load saved trips");
      })
      .finally(() => {
        setLoading(false);
      });

    const unsubscribe = subscribeAuth((user) => {
      if (!user) router.replace("/auth");
    });
    return unsubscribe;
  }, [router]);

  async function handleDelete(savedId: string) {
    if (!window.confirm(t.authDeleteConfirm)) return;
    try {
      await deleteUserSavedTrip(savedId);
      setSavedTrips((prev) => prev.filter((s) => s.id !== savedId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete trip");
    }
  }

  function startEditMemo(trip: UserSavedTrip) {
    setEditingMemoId(trip.id);
    setMemoText(trip.memo ?? "");
  }

  async function handleSaveMemo(savedId: string) {
    setSavingMemo(true);
    try {
      const updated = await updateUserSavedTripMemo(savedId, memoText.trim() || null);
      setSavedTrips((prev) =>
        prev.map((s) => (s.id === savedId ? { ...s, memo: updated.memo } : s)),
      );
      setEditingMemoId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save memo");
    } finally {
      setSavingMemo(false);
    }
  }

  return (
    <main className="page-shell" id="main-content">
      <div className="page-narrow">
        <div className="page-heading">
          <p className="eyebrow">{t.authProfile}</p>
          <h1>{t.authMySavedTrips}</h1>
          <p className="lede">
            保存した旅行日程と個人メモを確認・管理できます。
          </p>
        </div>

        {error && (
          <div className="status-banner error" role="alert" style={{ marginBottom: 16 }}>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-state" role="status">
            <div className="skeleton skeleton-card" style={{ height: 120, marginBottom: 12 }} />
            <div className="skeleton skeleton-card" style={{ height: 120 }} />
          </div>
        ) : savedTrips.length === 0 ? (
          <div className="status-banner" style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: "1.1rem", marginBottom: 16 }}>{t.authNoSavedTrips}</p>
            <Link href="/" className="button button-primary">
              新しい旅程を作成する
              <ArrowRightIcon />
            </Link>
          </div>
        ) : (
          <div className="saved-trips-list">
            {savedTrips.map((item) => (
              <article key={item.id} className="saved-trip-card">
                <div className="saved-trip-header">
                  <div>
                    <h2 className="saved-trip-title">
                      {item.title || "ソウル旅程"}
                    </h2>
                    <p className="saved-trip-meta">
                      <span>
                        <CalendarIcon style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                        {item.travelDate || "日付未設定"}
                      </span>
                      <span>
                        <MapPinIcon style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                        {item.stopsCount}箇所
                      </span>
                      {item.estimatedTotalCost && (
                        <span>
                          約{item.estimatedTotalCost.toLocaleString()} KRW
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="saved-trip-actions">
                    <Link
                      href={`/trips/${encodeURIComponent(item.tripId)}`}
                      className="button button-secondary button-sm"
                    >
                      旅程を見る
                    </Link>
                    <button
                      type="button"
                      className="button button-ghost button-sm delete-btn"
                      onClick={() => handleDelete(item.id)}
                      aria-label={`${item.title}を削除`}
                    >
                      <TrashIcon />
                      {t.authDeleteSavedTrip}
                    </button>
                  </div>
                </div>

                {/* Memo section */}
                <div className="saved-trip-memo-section">
                  {editingMemoId === item.id ? (
                    <div className="memo-editor">
                      <textarea
                        className="textarea memo-textarea"
                        value={memoText}
                        onChange={(e) => setMemoText(e.target.value)}
                        placeholder={t.authMemoPlaceholder}
                        rows={2}
                        disabled={savingMemo}
                      />
                      <div className="memo-editor-actions">
                        <button
                          type="button"
                          className="button button-primary button-sm"
                          onClick={() => handleSaveMemo(item.id)}
                          disabled={savingMemo}
                        >
                          {savingMemo ? "保存中…" : t.authSaveMemo}
                        </button>
                        <button
                          type="button"
                          className="button button-ghost button-sm"
                          onClick={() => setEditingMemoId(null)}
                          disabled={savingMemo}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="memo-display"
                      onClick={() => startEditMemo(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") startEditMemo(item);
                      }}
                    >
                      <span className="memo-label">
                        <EditIcon style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                        {t.authMemo}:
                      </span>{" "}
                      <span className="memo-content">
                        {item.memo || (
                          <span className="memo-empty-prompt">
                            メモを追加するにはクリック…
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
