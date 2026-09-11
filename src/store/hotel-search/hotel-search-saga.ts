import { call, put, takeLatest } from "redux-saga/effects";
import { searchHotels } from "@/lib/api";
import type { SearchHotelItem } from "@/lib/types";
import { captureMichiEvent } from "@/lib/telemetry";
import { hotelSearchActions } from "./hotel-search-slice";
function* search(
  action: ReturnType<typeof hotelSearchActions.searchRequested>,
) {
  try {
    yield call(captureMichiEvent, "hotel_search_requested", {
      context: { queryLength: action.payload.length },
    });
    const results: SearchHotelItem[] = yield call(searchHotels, action.payload);
    yield put(hotelSearchActions.searchReceived(results));
  } catch {
    yield put(hotelSearchActions.searchFailed());
  }
}
export function* hotelSearchSaga() {
  yield takeLatest(hotelSearchActions.searchRequested.type, search);
}
