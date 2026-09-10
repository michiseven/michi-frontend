import { call, put, select, takeEvery, takeLatest } from "redux-saga/effects";
import {
  createChatThread,
  getStoredEditToken,
  resumeChatThread,
  sendChatMessage,
  storeEditToken,
} from "@/lib/api";
import { captureMichiEvent } from "@/lib/telemetry";
import type { ChatResponse } from "@/lib/types";
import { plannerActions, type PlannerRequest, type PlannerState } from "./planner-slice";
import type { RootState } from "../store";

const messageId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
const selectPlanner = (state: RootState) => state.planner;
let activeRequestAbortController: AbortController | null = null;

function* sendPlannerMessage(action: ReturnType<typeof plannerActions.sendRequested>) {
  const request: PlannerRequest = action.payload;
  const abortController = new AbortController();
  activeRequestAbortController = abortController;
  const planner: PlannerState = yield select(selectPlanner);
  try {
    let threadId = planner.threadId;
    let threadSecret = planner.threadSecret;
    if (!threadId || !threadSecret) {
      const thread: { threadId: string; threadSecret: string } = yield call(
        createChatThread,
        request.locale,
        request.currentTripId,
      );
      threadId = thread.threadId;
      threadSecret = thread.threadSecret;
      yield put(plannerActions.threadReady(thread));
    }
    const response: ChatResponse = yield call(sendChatMessage, threadId, {
      message: request.message,
      locale: request.locale,
      currentTripId: request.currentTripId,
      profile: request.profile,
      ...(request.startFreshTrip ? { startFreshTrip: true, profilePolicy: "ignore" as const } : {}),
      ...(request.relaxations?.length ? { relaxations: request.relaxations } : {}),
      ...(request.mealPreference ? { mealPreference: request.mealPreference } : {}),
      ...(request.mealCuisine ? { mealCuisine: request.mealCuisine } : {}),
      ...(request.chatIntent ? { chatIntent: request.chatIntent } : {}),
      ...(request.mutationTarget ? { mutationTarget: request.mutationTarget } : {}),
      ...(request.structuredChoice ?? {}),
      requestId: request.requestId,
      threadSecret,
      editToken: request.currentTripId ? getStoredEditToken(request.currentTripId) ?? undefined : undefined,
      signal: abortController.signal,
    });
    if (response.threadSecret) yield put(plannerActions.threadReady({ threadId, threadSecret: response.threadSecret }));
    const trip = response.resultTrip
      ? { ...response.resultTrip, ...(response.editToken ? { editToken: response.editToken, isEditable: true } : {}) }
      : null;
    if (trip?.id && response.editToken) storeEditToken(trip.id, response.editToken);
    yield call(captureMichiEvent, "chat_message_sent", {
      context: { threadId, messageLength: request.displayMessage.length, locale: request.locale, hasActiveTrip: Boolean(request.currentTripId) },
    });
    if (trip?.id) {
      yield call(captureMichiEvent, "trip_generated", {
        tripId: trip.id,
        componentPath: ["GenerativeChatPlanner", "ReduxSaga", "ChatResponse"],
        context: { stopCount: trip.stops?.length ?? 0, providerMode: trip.providerModes?.place ?? "unknown" },
      });
    }
    yield put(plannerActions.responseReceived({
      id: messageId("assistant"), role: "assistant", content: response.responseMessage,
      actionChips: response.actionChips, status: response.status, pendingAction: response.pendingAction,
      pendingQuestion: response.pendingQuestion, alternatives: response.alternatives,
      verifiedPlaceFacts: response.verifiedPlaceFacts, resultTrip: trip, errorCode: response.errorCode,
    }));
  } catch {
    const cancelled = request.locale === "ko" ? "일정 생성을 취소했어요. 요청을 고쳐서 다시 보낼 수 있어요." : "旅程作成をキャンセルしました。内容を直してもう一度送れます。";
    yield put(plannerActions.requestFailed({
      message: { id: messageId("error"), role: "assistant", content: cancelled },
      retry: { message: request.displayMessage, startFreshTrip: Boolean(request.startFreshTrip) },
    }));
  } finally {
    if (activeRequestAbortController === abortController) activeRequestAbortController = null;
  }
}

function cancelPlannerMessage() {
  activeRequestAbortController?.abort();
}

function* resumePlannerMessage(action: ReturnType<typeof plannerActions.resumeRequested>) {
  const planner: PlannerState = yield select(selectPlanner);
  if (!planner.threadId) {
    yield put(plannerActions.resumeFailed({
      id: messageId("resume-error"), role: "assistant",
      content: action.payload.locale === "ko" ? "변경할 일정 대화가 없습니다." : "変更する旅程の会話がありません。",
    }));
    return;
  }
  try {
    const response: ChatResponse = yield call(resumeChatThread, planner.threadId, {
      decision: action.payload.decision,
      chosenPlaceId: action.payload.decision === "approve" ? action.payload.chosenPlaceId : undefined,
      threadSecret: planner.threadSecret ?? undefined,
      editToken: planner.activeTrip?.id ? getStoredEditToken(planner.activeTrip.id) ?? undefined : undefined,
    });
    const trip = response.resultTrip
      ? { ...response.resultTrip, ...(response.editToken ? { editToken: response.editToken, isEditable: true } : {}) }
      : null;
    if (trip?.id && response.editToken) storeEditToken(trip.id, response.editToken);
    if (trip?.id && action.payload.decision === "approve") {
      yield call(captureMichiEvent, "trip_modified", {
        tripId: trip.id,
        context: { threadId: planner.threadId, action: "replace", newPlaceId: action.payload.chosenPlaceId },
      });
    }
    yield put(plannerActions.responseReceived({
      id: messageId("assistant"), role: "assistant", content: response.responseMessage,
      actionChips: response.actionChips, status: response.status, pendingAction: response.pendingAction,
      pendingQuestion: response.pendingQuestion, alternatives: response.alternatives,
      verifiedPlaceFacts: response.verifiedPlaceFacts, resultTrip: trip, errorCode: response.errorCode,
    }));
  } catch {
    yield put(plannerActions.resumeFailed({
      id: messageId("resume-error"), role: "assistant",
      content: action.payload.locale === "ko" ? "일정 변경 처리 중 오류가 발생했습니다." : "プラン変更の処理中にエラーが発生しました。",
    }));
  }
}

export function* plannerSaga() {
  yield takeLatest(plannerActions.sendRequested.type, sendPlannerMessage);
  yield takeLatest(plannerActions.resumeRequested.type, resumePlannerMessage);
  yield takeEvery(plannerActions.cancelRequested.type, cancelPlannerMessage);
}
