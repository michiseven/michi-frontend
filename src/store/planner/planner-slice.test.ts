import { describe, expect, it } from "vitest";
import { plannerActions, plannerReducer, type PlannerMessage } from "./planner-slice";

const pending: PlannerMessage = {
  id: "first", role: "assistant", content: "choose", status: "awaiting_confirmation",
  pendingAction: { type: "trip_mutation_confirmation", action: "replace", tripId: "trip",
    targetStop: { stopId: "stop", placeId: "old", placeName: "Old" }, warnings: [],
    alternatives: ["one", "two"].map(placeId => ({ placeId, name: placeId, category: "cafe", reason: "Provider evidence", distanceMeters: 71, evidenceStatus: "verified_place", estimatedCost: null })) },
};
function setup() {
  return plannerReducer(undefined, plannerActions.responseReceived(pending));
}
describe("approval checkpoint ownership", () => {
  it("keeps one current card and the selected candidate after read-only QA", () => {
    let state = plannerReducer(setup(), plannerActions.alternativeSelected("two"));
    state = plannerReducer(state, plannerActions.responseReceived({ ...pending, id: "answer", content: "unknown" }));
    expect(state.messages.filter(message => message.pendingAction).map(message => message.id)).toEqual(["answer"]);
    expect(state.selectedAlternativeId).toBe("two");
  });
  it.each(["completed", "rejected"] as const)("retires old actions only after server %s", status => {
    const state = plannerReducer(setup(), plannerActions.responseReceived({ id: "done", role: "assistant", content: "done", status }));
    expect(state.messages.every(message => !message.pendingAction)).toBe(true);
    expect(state.selectedAlternativeId).toBeNull();
  });
  it("keeps approval and selection after failed resume", () => {
    let state = plannerReducer(setup(), plannerActions.alternativeSelected("two"));
    state = plannerReducer(state, plannerActions.resumeFailed({ id: "error", role: "assistant", content: "retry" }));
    expect(state.messages[0].pendingAction).toEqual(pending.pendingAction);
    expect(state.selectedAlternativeId).toBe("two");
  });
  it("opens only a new card after a resolved mutation", () => {
    let state = plannerReducer(setup(), plannerActions.responseReceived({ id: "done", role: "assistant", content: "done", status: "completed" }));
    state = plannerReducer(state, plannerActions.responseReceived({ ...pending, id: "new" }));
    expect(state.messages.filter(message => message.pendingAction).map(message => message.id)).toEqual(["new"]);
  });
  it("cannot revive resolved controls with a late read-only response", () => {
    let state = plannerReducer(setup(), plannerActions.responseReceived({ id: "done", role: "assistant", content: "done", status: "rejected" }));
    state = plannerReducer(state, plannerActions.responseReceived({ ...pending, id: "late", pendingSourceId: "first" }));
    expect(state.messages.every(message => !message.pendingAction)).toBe(true);
  });
});
