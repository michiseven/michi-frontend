import { call, put, takeLatest } from "redux-saga/effects";
import { loginUser, registerUser } from "@/lib/api";
import { setAuthSession } from "@/lib/auth";
import type { AuthResponse } from "@/lib/types";
import { authActions, type AuthSubmission } from "./auth-slice";

function* submitAuth(
  action: ReturnType<typeof authActions.submissionRequested>,
) {
  try {
    const request: AuthSubmission = action.payload;
    const response: AuthResponse =
      request.mode === "login"
        ? yield call(loginUser, request.input)
        : yield call(registerUser, request.input);
    yield call(setAuthSession, response);
    yield put(
      authActions.submissionSucceeded({ redirectTo: request.redirectTo }),
    );
  } catch (error) {
    yield put(
      authActions.submissionFailed(
        error instanceof Error ? error.message : "Authentication failed",
      ),
    );
  }
}

export function* authSaga() {
  yield takeLatest(authActions.submissionRequested.type, submitAuth);
}
