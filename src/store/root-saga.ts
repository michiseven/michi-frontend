import { all, fork } from "redux-saga/effects";
import { authSaga } from "./auth/auth-saga";
import { evaluationSaga } from "./evaluation/evaluation-saga";
import { hotelSearchSaga } from "./hotel-search/hotel-search-saga";
import { plannerSaga } from "./planner/planner-saga";
import { profileSaga } from "./profile/profile-saga";
import { savedTripsSaga } from "./saved-trips/saved-trips-saga";
import { tripDetailSaga } from "./trip-detail/trip-detail-saga";

export function* rootSaga() {
  yield all([
    fork(authSaga),
    fork(evaluationSaga),
    fork(hotelSearchSaga),
    fork(plannerSaga),
    fork(profileSaga),
    fork(savedTripsSaga),
    fork(tripDetailSaga),
  ]);
}
