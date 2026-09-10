import { call, put, takeLatest } from "redux-saga/effects";
import {
  compareEvaluation,
  type EvaluationResponse,
} from "@/lib/evaluation-api";
import { evaluationActions } from "./evaluation-slice";

function* compare(
  action: ReturnType<typeof evaluationActions.comparisonRequested>,
) {
  try {
    const result: EvaluationResponse = yield call(
      compareEvaluation,
      action.payload,
    );
    yield put(evaluationActions.comparisonReceived(result));
  } catch (error) {
    yield put(
      evaluationActions.comparisonFailed(
        error instanceof Error ? error.message : "評価を完了できませんでした。",
      ),
    );
  }
}

export function* evaluationSaga() {
  yield takeLatest(evaluationActions.comparisonRequested.type, compare);
}
