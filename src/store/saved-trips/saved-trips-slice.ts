import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { UserSavedTrip } from "@/lib/types";

interface SavedTripsState {
  items: UserSavedTrip[];
  isLoading: boolean;
  error: string | null;
  savingMemoId: string | null;
  deletingId: string | null;
}

const initialState: SavedTripsState = {
  items: [],
  isLoading: false,
  error: null,
  savingMemoId: null,
  deletingId: null,
};

const savedTripsSlice = createSlice({
  name: "savedTrips",
  initialState,
  reducers: {
    listRequested(state) {
      state.isLoading = true;
      state.error = null;
    },
    listReceived(state, action: PayloadAction<UserSavedTrip[]>) {
      state.items = action.payload;
      state.isLoading = false;
    },
    requestFailed(state, action: PayloadAction<string>) {
      state.error = action.payload;
      state.isLoading = false;
      state.savingMemoId = null;
      state.deletingId = null;
    },
    deleteRequested(state, action: PayloadAction<string>) {
      state.deletingId = action.payload;
      state.error = null;
    },
    deleted(state, action: PayloadAction<string>) {
      state.items = state.items.filter((trip) => trip.id !== action.payload);
      state.deletingId = null;
    },
    memoSaveRequested(
      state,
      action: PayloadAction<{ id: string; memo: string | null }>,
    ) {
      state.savingMemoId = action.payload.id;
      state.error = null;
    },
    memoSaved(
      state,
      action: PayloadAction<{ id: string; memo: string | null }>,
    ) {
      const trip = state.items.find((item) => item.id === action.payload.id);
      if (trip) trip.memo = action.payload.memo;
      state.savingMemoId = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
});

export const savedTripsActions = savedTripsSlice.actions;
export const savedTripsReducer = savedTripsSlice.reducer;
