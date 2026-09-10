import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Trip } from "@/lib/types";

interface TripDetailState {
  trip: Trip | null;
  isLoading: boolean;
  error: string | null;
}
const initialState: TripDetailState = {
  trip: null,
  isLoading: false,
  error: null,
};

const tripDetailSlice = createSlice({
  name: "tripDetail",
  initialState,
  reducers: {
    loadRequested(
      state,
      action: PayloadAction<{ tripId: string; savedId: string | null }>,
    ) {
      void action;
      state.trip = null;
      state.isLoading = true;
      state.error = null;
    },
    loaded(state, action: PayloadAction<Trip>) {
      state.trip = action.payload;
      state.isLoading = false;
    },
    loadFailed(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
    },
  },
});

export const tripDetailActions = tripDetailSlice.actions;
export const tripDetailReducer = tripDetailSlice.reducer;
