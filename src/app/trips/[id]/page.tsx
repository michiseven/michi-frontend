"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { EnvironmentBanner } from "@/components/environment-banner";
import { TripView } from "@/components/trip-view";
import {
  BackLink,
  ContentPage,
  ErrorState,
  InlineLoading,
  LoadingCard,
  LoadingTitle,
} from "@/components/styles/content-page.styles";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { tripDetailActions } from "@/store/trip-detail/trip-detail-slice";

export default function TripDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const savedId = searchParams.get("savedId");
  const dispatch = useAppDispatch();
  const { trip, error } = useAppSelector((state) => state.tripDetail);

  useEffect(() => {
    dispatch(tripDetailActions.loadRequested({ tripId: params.id, savedId }));
  }, [dispatch, params.id, savedId]);

  return (
    <ContentPage id="main-content">
      <EnvironmentBanner />
      <BackLink href="/">プランナーへ戻る</BackLink>
      {error && (
        <ErrorState role="alert">
          <h2>旅程を読み込めません</h2>
          <p>{error}</p>
        </ErrorState>
      )}
      {!trip && !error && (
        <InlineLoading role="status">
          <LoadingTitle />
          <LoadingCard />
          <p>旅程を読み込んでいます…</p>
        </InlineLoading>
      )}
      {trip && <TripView initialTrip={trip} editable={!savedId} />}
    </ContentPage>
  );
}
