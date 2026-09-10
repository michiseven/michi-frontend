import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  EvaluationRequest,
  EvaluationResponse,
} from "@/lib/evaluation-api";

interface EvaluationState {
  result: EvaluationResponse | null;
  isLoading: boolean;
  error: string | null;
}
const initialState: EvaluationState = {
  result: null,
  isLoading: false,
  error: null,
};

const evaluationSlice = createSlice({
  name: "evaluation",
  initialState,
  reducers: {
    comparisonRequested(state, action: PayloadAction<EvaluationRequest>) {
      void action;
      state.isLoading = true;
      state.error = null;
    },
    comparisonReceived(state, action: PayloadAction<EvaluationResponse>) {
      state.result = action.payload;
      state.isLoading = false;
    },
    comparisonFailed(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
    reset() {
      return initialState;
    },
  },
});

export const evaluationActions = evaluationSlice.actions;
export const evaluationReducer = evaluationSlice.reducer;
