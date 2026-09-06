"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EnvironmentBanner } from "@/components/environment-banner";
import { TripView } from "@/components/trip-view";
import { getTrip, getUserSavedTrip } from "@/lib/api";
import type { Trip } from "@/lib/types";

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const savedId = searchParams.get("savedId");
  const [trip, setTrip] = useState<Trip>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    const load = savedId
      ? getUserSavedTrip(savedId).then((savedTrip) => {
          if (!savedTrip.tripSnapshot) {
            throw new Error("저장된 일정 스냅샷을 찾을 수 없습니다.");
          }
          return savedTrip.tripSnapshot;
        })
      : getTrip(params.id);

    load
      .then((result) => { if (active) setTrip(result); })
      .catch((loadError: unknown) => { if (active) setError(loadError instanceof Error ? loadError.message : "旅程を読み込めませんでした。"); });
    return () => { active = false; };
  }, [params.id, savedId]);

  return (
    <main className="page-shell" id="main-content">
      <EnvironmentBanner />
      <Link className="button button-secondary" href="/">プランナーへ戻る</Link>
      {error && (
        <div className="empty-state" role="alert" style={{ marginTop: 24 }}>
          <h2>旅程を読み込めません</h2>
          <p>{error}</p>
        </div>
      )}
      {!trip && !error && (
        <div className="loading-state" role="status" style={{ marginTop: 24 }}>
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-card" />
          <p>旅程を読み込んでいます…</p>
        </div>
      )}
      {trip && <TripView initialTrip={trip} editable={!savedId} />}
    </main>
  );
}
