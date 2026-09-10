import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  ChangePasswordInput,
  UpdateProfileInput,
  User,
} from "@/lib/types";

interface ProfileState {
  user: User | null;
  isLoading: boolean;
  isUpdating: boolean;
  isChangingPassword: boolean;
  profileSuccess: boolean;
  profileError: string | null;
  passwordSuccess: boolean;
  passwordError: string | null;
  logoutComplete: boolean;
}

const initialState: ProfileState = {
  user: null,
  isLoading: false,
  isUpdating: false,
  isChangingPassword: false,
  profileSuccess: false,
  profileError: null,
  passwordSuccess: false,
  passwordError: null,
  logoutComplete: false,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    loadRequested(state) {
      state.isLoading = true;
    },
    profileLoaded(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isLoading = false;
    },
    updateRequested(state, action: PayloadAction<UpdateProfileInput>) {
      void action;
      state.isUpdating = true;
      state.profileSuccess = false;
      state.profileError = null;
    },
    updateSucceeded(state, action: PayloadAction<User>) {
      state.user = action.payload;
      state.isUpdating = false;
      state.profileSuccess = true;
    },
    updateFailed(state, action: PayloadAction<string>) {
      state.isUpdating = false;
      state.profileError = action.payload;
    },
    passwordChangeRequested(state, action: PayloadAction<ChangePasswordInput>) {
      void action;
      state.isChangingPassword = true;
      state.passwordSuccess = false;
      state.passwordError = null;
    },
    passwordChangeSucceeded(state) {
      state.isChangingPassword = false;
      state.passwordSuccess = true;
    },
    passwordChangeFailed(state, action: PayloadAction<string>) {
      state.isChangingPassword = false;
      state.passwordError = action.payload;
    },
    logoutRequested(state) {
      state.logoutComplete = false;
    },
    logoutCompleted(state) {
      state.user = null;
      state.logoutComplete = true;
    },
  },
});

export const profileActions = profileSlice.actions;
export const profileReducer = profileSlice.reducer;
