import { call, put, takeLatest } from "redux-saga/effects";
import {
  deleteUserSavedTrip,
  getUserSavedTrips,
  updateUserSavedTripMemo,
} from "@/lib/api";
import type { UserSavedTrip } from "@/lib/types";
import { captureMichiEvent } from "@/lib/telemetry";
import { savedTripsActions } from "./saved-trips-slice";

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function* loadSavedTrips() {
  try {
    const response: { items: UserSavedTrip[] } = yield call(
      getUserSavedTrips,
      1,
      50,
    );
    yield put(savedTripsActions.listReceived(response.items));
  } catch (error) {
    yield put(
      savedTripsActions.requestFailed(
        errorText(error, "Failed to load saved trips"),
      ),
    );
  }
}

function* deleteSavedTrip(
  action: ReturnType<typeof savedTripsActions.deleteRequested>,
) {
  try {
    yield call(deleteUserSavedTrip, action.payload);
    yield call(captureMichiEvent, "saved_trip_deleted", {
      context: { savedTripId: action.payload },
    });
    yield put(savedTripsActions.deleted(action.payload));
  } catch (error) {
    yield put(
      savedTripsActions.requestFailed(
        errorText(error, "Failed to delete trip"),
      ),
    );
  }
}

function* saveMemo(
  action: ReturnType<typeof savedTripsActions.memoSaveRequested>,
) {
  try {
    const updated: UserSavedTrip = yield call(
      updateUserSavedTripMemo,
      action.payload.id,
      action.payload.memo,
    );
    yield put(
      savedTripsActions.memoSaved({
        id: action.payload.id,
        memo: updated.memo ?? null,
      }),
    );
  } catch (error) {
    yield put(
      savedTripsActions.requestFailed(errorText(error, "Failed to save memo")),
    );
  }
}

export function* savedTripsSaga() {
  yield takeLatest(savedTripsActions.listRequested.type, loadSavedTrips);
  yield takeLatest(savedTripsActions.deleteRequested.type, deleteSavedTrip);
  yield takeLatest(savedTripsActions.memoSaveRequested.type, saveMemo);
}
