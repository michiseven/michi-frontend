"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAuthenticated, subscribeAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { UserSavedTrip } from "@/lib/types";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { savedTripsActions } from "@/store/saved-trips/saved-trips-slice";
import {
  ArrowRightIcon,
  CalendarIcon,
  EditIcon,
  MapPinIcon,
  TrashIcon,
} from "@/components/icons";
import {
  AuthHeading,
  AuthNarrow,
  AuthPageShell,
} from "@/components/styles/auth.styles";
import { StatusBanner } from "@/components/styles/profile.styles";
import {
  DeleteAction,
  EmptyMemo,
  EmptyState,
  EmptyStateLink,
  GhostAction,
  LoadingCard,
  LoadingState,
  MemoDisplay,
  MemoEditor,
  MemoEditorActions,
  MemoLabel,
  MemoSection,
  MemoTextarea,
  PrimaryAction,
  SavedTripActions,
  SavedTripCard,
  SavedTripHeader,
  SavedTripMeta,
  SavedTripTitle,
  SavedTripsList,
  SecondaryAction,
} from "@/components/styles/saved-trips.styles";

export default function SavedTripsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    items: savedTrips,
    isLoading: loading,
    error,
    savingMemoId,
    deletingId,
  } = useAppSelector((state) => state.savedTrips);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [memoText, setMemoText] = useState("");
  const savingMemo = savingMemoId !== null;

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth");
      return;
    }

    dispatch(savedTripsActions.listRequested());

    const unsubscribe = subscribeAuth((user) => {
      if (!user) router.replace("/auth");
    });
    return unsubscribe;
  }, [dispatch, router]);

  function handleDelete(savedId: string) {
    if (!window.confirm(t.authDeleteConfirm)) return;
    dispatch(savedTripsActions.deleteRequested(savedId));
  }

  function startEditMemo(trip: UserSavedTrip) {
    setEditingMemoId(trip.id);
    setMemoText(trip.memo ?? "");
  }

  function handleSaveMemo(savedId: string) {
    dispatch(
      savedTripsActions.memoSaveRequested({
        id: savedId,
        memo: memoText.trim() || null,
      }),
    );
    setEditingMemoId(null);
  }

  return (
    <AuthPageShell id="main-content">
      <AuthNarrow>
        <AuthHeading>
          <p className="eyebrow">{t.authProfile}</p>
          <h1>{t.authMySavedTrips}</h1>
          <p className="lede">
            保存した旅行日程と個人メモを確認・管理できます。
          </p>
        </AuthHeading>

        {error && (
          <StatusBanner $tone="error" role="alert">
            <span>{error}</span>
          </StatusBanner>
        )}

        {loading ? (
          <LoadingState role="status">
            <LoadingCard />
            <LoadingCard />
          </LoadingState>
        ) : savedTrips.length === 0 ? (
          <EmptyState>
            <p>{t.authNoSavedTrips}</p>
            <EmptyStateLink href="/">
              新しい旅程を作成する
              <ArrowRightIcon />
            </EmptyStateLink>
          </EmptyState>
        ) : (
          <SavedTripsList>
            {savedTrips.map((item) => (
              <SavedTripCard key={item.id}>
                <SavedTripHeader>
                  <div>
                    <SavedTripTitle>
                      {item.title || "ソウル旅程"}
                    </SavedTripTitle>
                    <SavedTripMeta>
                      <span>
                        <CalendarIcon />
                        {item.travelDate || "日付未設定"}
                      </span>
                      <span>
                        <MapPinIcon />
                        {item.stopsCount}箇所
                      </span>
                      {item.estimatedTotalCost && (
                        <span>
                          約{item.estimatedTotalCost.toLocaleString()} KRW
                        </span>
                      )}
                    </SavedTripMeta>
                  </div>
                  <SavedTripActions>
                    <SecondaryAction
                      href={`/trips/${encodeURIComponent(item.tripId)}?savedId=${encodeURIComponent(item.id)}`}
                    >
                      旅程を見る
                    </SecondaryAction>
                    <DeleteAction
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      aria-label={`${item.title}を削除`}
                    >
                      <TrashIcon />
                      {t.authDeleteSavedTrip}
                    </DeleteAction>
                  </SavedTripActions>
                </SavedTripHeader>

                {/* Memo section */}
                <MemoSection>
                  {editingMemoId === item.id ? (
                    <MemoEditor>
                      <MemoTextarea
                        value={memoText}
                        onChange={(e) => setMemoText(e.target.value)}
                        placeholder={t.authMemoPlaceholder}
                        rows={2}
                        disabled={savingMemo}
                      />
                      <MemoEditorActions>
                        <PrimaryAction
                          type="button"
                          onClick={() => handleSaveMemo(item.id)}
                          disabled={savingMemo}
                        >
                          {savingMemo ? "保存中…" : t.authSaveMemo}
                        </PrimaryAction>
                        <GhostAction
                          type="button"
                          onClick={() => setEditingMemoId(null)}
                          disabled={savingMemo}
                        >
                          キャンセル
                        </GhostAction>
                      </MemoEditorActions>
                    </MemoEditor>
                  ) : (
                    <MemoDisplay
                      onClick={() => startEditMemo(item)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") startEditMemo(item);
                      }}
                    >
                      <MemoLabel>
                        <EditIcon />
                        {t.authMemo}:
                      </MemoLabel>
                      <span>
                        {item.memo || (
                          <EmptyMemo>メモを追加するにはクリック…</EmptyMemo>
                        )}
                      </span>
                    </MemoDisplay>
                  )}
                </MemoSection>
              </SavedTripCard>
            ))}
          </SavedTripsList>
        )}
      </AuthNarrow>
    </AuthPageShell>
  );
}
