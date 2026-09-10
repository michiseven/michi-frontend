import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LoginInput, RegisterInput } from "@/lib/types";

export type AuthSubmission =
  | { mode: "login"; input: LoginInput; redirectTo: string }
  | { mode: "register"; input: RegisterInput; redirectTo: string };

interface AuthState {
  isSubmitting: boolean;
  error: string | null;
  redirectTo: string | null;
}

const initialState: AuthState = {
  isSubmitting: false,
  error: null,
  redirectTo: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    submissionRequested(state, action: PayloadAction<AuthSubmission>) {
      void action;
      state.isSubmitting = true;
      state.error = null;
      state.redirectTo = null;
    },
    submissionSucceeded(state, action: PayloadAction<{ redirectTo: string }>) {
      state.isSubmitting = false;
      state.redirectTo = action.payload.redirectTo;
    },
    submissionFailed(state, action: PayloadAction<string>) {
      state.isSubmitting = false;
      state.error = action.payload;
    },
    redirectConsumed(state) {
      state.redirectTo = null;
    },
    clearError(state) {
      state.error = null;
    },
    reset() {
      return initialState;
    },
  },
});

export const authActions = authSlice.actions;
export const authReducer = authSlice.reducer;
