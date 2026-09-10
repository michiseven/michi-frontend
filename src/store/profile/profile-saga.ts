import { call, put, takeLatest } from "redux-saga/effects";
import {
  changePassword,
  getProfile,
  logoutUser,
  updateProfile,
} from "@/lib/api";
import { getCurrentUser, updateCurrentUser } from "@/lib/auth";
import type { User } from "@/lib/types";
import { profileActions } from "./profile-slice";

const message = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

function* loadProfile() {
  try {
    const profile: User = yield call(getProfile);
    yield call(updateCurrentUser, profile);
    yield put(profileActions.profileLoaded(profile));
  } catch {
    const cached: User | null = yield call(getCurrentUser);
    if (cached) yield put(profileActions.profileLoaded(cached));
    else yield put(profileActions.updateFailed("Profile loading failed"));
  }
}

function* updateUserProfile(
  action: ReturnType<typeof profileActions.updateRequested>,
) {
  try {
    const profile: User = yield call(updateProfile, action.payload);
    yield call(updateCurrentUser, profile);
    yield put(profileActions.updateSucceeded(profile));
  } catch (error) {
    yield put(
      profileActions.updateFailed(message(error, "Profile update failed")),
    );
  }
}

function* changeUserPassword(
  action: ReturnType<typeof profileActions.passwordChangeRequested>,
) {
  try {
    yield call(changePassword, action.payload);
    yield put(profileActions.passwordChangeSucceeded());
  } catch (error) {
    yield put(
      profileActions.passwordChangeFailed(
        message(error, "Password change failed"),
      ),
    );
  }
}

function* logout() {
  yield call(logoutUser);
  yield put(profileActions.logoutCompleted());
}

export function* profileSaga() {
  yield takeLatest(profileActions.loadRequested.type, loadProfile);
  yield takeLatest(profileActions.updateRequested.type, updateUserProfile);
  yield takeLatest(
    profileActions.passwordChangeRequested.type,
    changeUserPassword,
  );
  yield takeLatest(profileActions.logoutRequested.type, logout);
}
