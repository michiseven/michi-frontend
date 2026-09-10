import { call, put, takeLatest } from "redux-saga/effects";
import { getTrip, getUserSavedTrip } from "@/lib/api";
import type { Trip, UserSavedTrip } from "@/lib/types";
import { tripDetailActions } from "./trip-detail-slice";

function* loadTripDetail(
  action: ReturnType<typeof tripDetailActions.loadRequested>,
) {
  try {
    let trip: Trip;
    if (action.payload.savedId) {
      const saved: UserSavedTrip = yield call(
        getUserSavedTrip,
        action.payload.savedId,
      );
      if (!saved.tripSnapshot)
        throw new Error("저장된 일정 스냅샷을 찾을 수 없습니다.");
      trip = saved.tripSnapshot;
    } else {
      trip = yield call(getTrip, action.payload.tripId);
    }
    yield put(tripDetailActions.loaded(trip));
  } catch (error) {
    yield put(
      tripDetailActions.loadFailed(
        error instanceof Error ? error.message : "旅程を読み込めませんでした。",
      ),
    );
  }
}

export function* tripDetailSaga() {
  yield takeLatest(tripDetailActions.loadRequested.type, loadTripDetail);
}
