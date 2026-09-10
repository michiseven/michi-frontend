import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { SearchHotelItem } from "@/lib/types";

interface HotelSearchState {
  results: SearchHotelItem[];
  isLoading: boolean;
  hasSearched: boolean;
}
const initialState: HotelSearchState = {
  results: [],
  isLoading: false,
  hasSearched: false,
};
const hotelSearchSlice = createSlice({
  name: "hotelSearch",
  initialState,
  reducers: {
    searchRequested(state, action: PayloadAction<string>) {
      void action;
      state.isLoading = true;
      state.hasSearched = true;
    },
    searchReceived(state, action: PayloadAction<SearchHotelItem[]>) {
      state.results = action.payload;
      state.isLoading = false;
    },
    searchFailed(state) {
      state.results = [];
      state.isLoading = false;
    },
    reset() {
      return initialState;
    },
  },
});
export const hotelSearchActions = hotelSearchSlice.actions;
export const hotelSearchReducer = hotelSearchSlice.reducer;
