import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";
import { authReducer } from "./auth/auth-slice";
import { evaluationReducer } from "./evaluation/evaluation-slice";
import { hotelSearchReducer } from "./hotel-search/hotel-search-slice";
import { plannerReducer } from "./planner/planner-slice";
import { profileReducer } from "./profile/profile-slice";
import { rootSaga } from "./root-saga";
import { savedTripsReducer } from "./saved-trips/saved-trips-slice";
import { tripDetailReducer } from "./trip-detail/trip-detail-slice";

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    evaluation: evaluationReducer,
    hotelSearch: hotelSearchReducer,
    planner: plannerReducer,
    profile: profileReducer,
    savedTrips: savedTripsReducer,
    tripDetail: tripDetailReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }).concat(sagaMiddleware),
  devTools: process.env.NODE_ENV !== "production",
});

sagaMiddleware.run(rootSaga);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
