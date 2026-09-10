import { call, put, takeLatest } from "redux-saga/effects";
import { searchHotels } from "@/lib/api";
import type { SearchHotelItem } from "@/lib/types";
import { hotelSearchActions } from "./hotel-search-slice";
function* search(
  action: ReturnType<typeof hotelSearchActions.searchRequested>,
) {
  try {
    const results: SearchHotelItem[] = yield call(searchHotels, action.payload);
    yield put(hotelSearchActions.searchReceived(results));
  } catch {
    yield put(hotelSearchActions.searchFailed());
  }
}
export function* hotelSearchSaga() {
  yield takeLatest(hotelSearchActions.searchRequested.type, search);
}
