import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendChatMessage } from "@/lib/api";
import { plannerSaga } from "./planner-saga";
import { plannerActions, plannerReducer } from "./planner-slice";

vi.mock("@/lib/api", () => ({
  createChatThread: vi.fn(), getStoredEditToken: vi.fn(), resumeChatThread: vi.fn(),
  sendChatMessage: vi.fn(), storeEditToken: vi.fn(),
}));
vi.mock("@/lib/telemetry", () => ({ captureMichiEvent: vi.fn() }));

function setup() {
  const saga = createSagaMiddleware();
  const store = configureStore({ reducer: { planner: plannerReducer }, middleware: (defaults) => defaults().concat(saga) });
  const task = saga.run(plannerSaga);
  store.dispatch(plannerActions.threadReady({ threadId: "thread", threadSecret: "test-secret" }));
  return { store, task };
}

afterEach(() => vi.resetAllMocks());

describe("planner request errors", () => {
  it.each(["ko", "ja"] as const)("does not mislabel HTTP failure as cancellation in %s", async (locale) => {
    vi.mocked(sendChatMessage).mockRejectedValue(Object.assign(new Error("Conflict"), { status: 409 }));
    const { store, task } = setup();
    const pending = { id: "pending", role: "assistant" as const, content: "Approve a candidate", status: "awaiting_confirmation" as const,
      pendingAction: { type: "trip_mutation_confirmation" as const, action: "replace" as const, tripId: "trip",
        targetStop: { stopId: "stop", placeId: "place", placeName: "Tea shop" }, alternatives: [], warnings: [] } };
    store.dispatch(plannerActions.messageAppended(pending));
    store.dispatch(plannerActions.sendRequested({ message: "candidate evidence?", displayMessage: "candidate evidence?", requestId: "request", locale }));
    await vi.waitFor(() => expect(store.getState().planner.isLoading).toBe(false));
    const state = store.getState().planner;
    expect(state.messages.at(-1)?.status).toBe("failed");
    expect(state.messages.at(-1)?.content).not.toMatch(/취소|キャンセル|Conflict/);
    expect(state.messages).toContainEqual(pending);
    expect(state.lastRetry?.message).toBe("candidate evidence?");
    task.cancel();
  });

  it("shows cancellation only after the user aborts the active request", async () => {
    vi.mocked(sendChatMessage).mockImplementation((_threadId, request) => new Promise((_resolve, reject) => {
      request.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    }));
    const { store, task } = setup();
    store.dispatch(plannerActions.sendRequested({ message: "plan", displayMessage: "plan", requestId: "request", locale: "ja" }));
    store.dispatch(plannerActions.cancelRequested());
    await vi.waitFor(() => expect(store.getState().planner.messages.at(-1)?.content).toMatch(/キャンセル/));
    expect(store.getState().planner.messages.at(-1)?.status).not.toBe("failed");
    task.cancel();
  });
});
