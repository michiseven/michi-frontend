import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  ActionChip,
  PendingChatQuestion,
  PendingTripMutation,
  ReplacementCandidate,
  Trip,
  VerifiedPlaceFacts,
  SearchHotelItem,
  SafetyConstraint,
} from "@/lib/types";

export interface PlannerProfile {
  partySize?: number;
  budget?: number;
  budgetScope: "per_person" | "total";
  companions?: "solo" | "couple" | "friends" | "family" | "with_children";
  pace?: "relaxed" | "standard" | "packed";
  safetyConstraints: SafetyConstraint[];
  arrivalDate?: string;
  arrivalTime?: string;
  departureDate?: string;
  departureTime?: string;
  arrivalAirport?: "ICN_T1" | "ICN_T2" | "GMP_INTL" | "GMP_DOM";
  departureAirport?: "ICN_T1" | "ICN_T2" | "GMP_INTL" | "GMP_DOM";
  hotel?: SearchHotelItem;
  hasLuggage: boolean;
}

export interface PlannerMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionChips?: ActionChip[];
  status?: "completed" | "awaiting_confirmation" | "rejected" | "failed";
  pendingAction?: PendingTripMutation | null;
  pendingQuestion?: PendingChatQuestion | null;
  alternatives?: ReplacementCandidate[];
  verifiedPlaceFacts?: VerifiedPlaceFacts | null;
  resultTrip?: Trip | null;
  errorCode?: string | null;
}

export interface PlannerRequest {
  message: string;
  /** Human-visible message. Context appended for the API must not be echoed back into the chat. */
  displayMessage: string;
  requestId: string;
  locale: "ko" | "ja";
  currentTripId?: string;
  profile?: Record<string, unknown> | null;
  startFreshTrip?: boolean;
  relaxations?: Array<"meal_cuisine" | "search_radius" | "route_constraints">;
  mealPreference?: ActionChip["mealPreference"];
  mealCuisine?: ActionChip["mealCuisine"];
  chatIntent?: ActionChip["intent"];
  mutationTarget?: ActionChip["mutationTarget"];
  structuredChoice?: { questionId: string; optionId: string; expectedRevision?: number };
}

export interface PlannerState {
  threadId: string | null;
  threadSecret: string | null;
  messages: PlannerMessage[];
  activeTrip: Trip | null;
  isLoading: boolean;
  loadingStage: "checking" | "routing" | "waiting";
  selectedAlternativeId: string | null;
  lastRetry: { message: string; startFreshTrip: boolean } | null;
  profile: PlannerProfile;
}

export interface ResumeRequest {
  decision: "approve" | "reject";
  chosenPlaceId?: string;
  locale: "ko" | "ja";
}

const initialState: PlannerState = {
  threadId: null,
  threadSecret: null,
  messages: [],
  activeTrip: null,
  isLoading: false,
  loadingStage: "checking",
  selectedAlternativeId: null,
  lastRetry: null,
  profile: { budgetScope: "per_person", safetyConstraints: [], hasLuggage: false },
};

const plannerSlice = createSlice({
  name: "planner",
  initialState,
  reducers: {
    initializeMessages(state, action: PayloadAction<PlannerMessage[]>) {
      if (state.messages.length === 0) state.messages = action.payload;
    },
    reset() {
      return initialState;
    },
    messageAppended(state, action: PayloadAction<PlannerMessage>) {
      state.messages.push(action.payload);
    },
    loadingChanged(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    sendRequested(state, action: PayloadAction<PlannerRequest>) {
      state.messages.push({ id: action.payload.requestId, role: "user", content: action.payload.displayMessage });
      state.isLoading = true;
      state.loadingStage = "checking";
      state.lastRetry = null;
    },
    threadReady(state, action: PayloadAction<{ threadId: string; threadSecret: string }>) {
      state.threadId = action.payload.threadId;
      state.threadSecret = action.payload.threadSecret;
    },
    responseReceived(state, action: PayloadAction<PlannerMessage>) {
      state.messages.push(action.payload);
      if (action.payload.alternatives?.[0]) state.selectedAlternativeId = action.payload.alternatives[0].placeId;
      if (action.payload.resultTrip) state.activeTrip = action.payload.resultTrip;
      state.isLoading = false;
    },
    requestFailed(
      state,
      action: PayloadAction<{ message: PlannerMessage; retry: { message: string; startFreshTrip: boolean } }>,
    ) {
      state.messages.push(action.payload.message);
      state.lastRetry = action.payload.retry;
      state.isLoading = false;
    },
    resumeRequested(state, action: PayloadAction<ResumeRequest>) {
      void action;
      state.isLoading = true;
      state.loadingStage = "checking";
    },
    resumeFailed(state, action: PayloadAction<PlannerMessage>) {
      state.messages.push(action.payload);
      state.isLoading = false;
    },
    loadingStageChanged(state, action: PayloadAction<PlannerState["loadingStage"]>) {
      state.loadingStage = action.payload;
    },
    alternativeSelected(state, action: PayloadAction<string | null>) {
      state.selectedAlternativeId = action.payload;
    },
    activeTripSelected(state, action: PayloadAction<Trip | null>) {
      state.activeTrip = action.payload;
    },
    profileReplaced(state, action: PayloadAction<PlannerProfile>) {
      state.profile = action.payload;
    },
    retryPrepared(state) {
      state.lastRetry = null;
    },
    cancelRequested(state) {
      state.isLoading = false;
      state.loadingStage = "checking";
    },
  },
});

export const plannerActions = plannerSlice.actions;
export const plannerReducer = plannerSlice.reducer;
