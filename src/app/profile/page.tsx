"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { isAuthenticated, subscribeAuth } from "@/lib/auth";
import { useI18n, type Language } from "@/lib/i18n";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { profileActions } from "@/store/profile/profile-slice";
import { LogoutIcon } from "@/components/icons";
import {
  AuthField,
  AuthForm,
  AuthNarrow,
  AuthPageShell,
} from "@/components/styles/auth.styles";
import {
  ProfileActions,
  ProfileCard,
  StatusBanner,
} from "@/components/styles/profile.styles";

export default function ProfilePage() {
  const { t, setLang } = useI18n();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const {
    user,
    isUpdating: updatingProfile,
    isChangingPassword: changingPassword,
    profileSuccess,
    profileError,
    passwordSuccess,
    passwordError,
    logoutComplete,
  } = useAppSelector((state) => state.profile);
  const [displayName, setDisplayName] = useState("");
  const [locale, setLocale] = useState<Language>("ja");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth");
      return;
    }
    dispatch(profileActions.loadRequested());

    const unsubscribe = subscribeAuth((updated) => {
      if (!updated) {
        router.replace("/auth");
      } else {
        dispatch(profileActions.profileLoaded(updated));
        setDisplayName(updated.displayName);
        setLocale(updated.locale);
      }
    });
    return unsubscribe;
  }, [dispatch, router]);

  useEffect(() => {
    if (profileSuccess && user) setLang(user.locale);
  }, [profileSuccess, setLang, user]);

  useEffect(() => {
    if (logoutComplete) router.replace("/");
  }, [logoutComplete, router]);

  async function handleUpdateProfile(e: FormEvent) {
    e.preventDefault();
    dispatch(
      profileActions.updateRequested({
        displayName: displayName.trim() || user?.displayName,
        locale,
      }),
    );
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      dispatch(profileActions.passwordChangeFailed(t.authPasswordHint));
      return;
    }
    dispatch(
      profileActions.passwordChangeRequested({ currentPassword, newPassword }),
    );
  }

  function handleLogout() {
    dispatch(profileActions.logoutRequested());
  }

  if (!user) {
    return (
      <AuthPageShell id="main-content">
        <AuthNarrow>
          <div className="loading-state">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-card" />
          </div>
        </AuthNarrow>
      </AuthPageShell>
    );
  }

  return (
    <AuthPageShell id="main-content">
      <AuthNarrow>
        <div className="page-heading">
          <p className="eyebrow">{t.brandTitle}</p>
          <h1>{t.authProfile}</h1>
          <p className="lede">アカウント情報と基本設定を管理します。</p>
        </div>

        {/* Profile Card */}
        <ProfileCard>
          <h2>基本情報</h2>

          {profileSuccess && (
            <StatusBanner $tone="success" role="status">
              <span>✓ {t.authProfileUpdated}</span>
            </StatusBanner>
          )}

          {profileError && (
            <StatusBanner $tone="error" role="alert">
              <span>{profileError}</span>
            </StatusBanner>
          )}

          <AuthForm onSubmit={handleUpdateProfile} noValidate>
            <AuthField>
              <label htmlFor="profile-email">{t.authEmail}</label>
              <input
                id="profile-email"
                className="input"
                type="email"
                value={user.email}
                disabled
                readOnly
                style={{ opacity: 0.7, cursor: "not-allowed" }}
              />
            </AuthField>

            <AuthField>
              <label htmlFor="profile-name">{t.authDisplayName}</label>
              <input
                id="profile-name"
                className="input"
                type="text"
                value={displayName || user.displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={updatingProfile}
              />
            </AuthField>

            <AuthField>
              <label htmlFor="profile-locale">
                優先言語 / Preferred Language
              </label>
              <select
                id="profile-locale"
                className="input"
                value={locale || user.locale}
                onChange={(e) => setLocale(e.target.value as Language)}
                disabled={updatingProfile}
              >
                <option value="ja">日本語 (Japanese)</option>
                <option value="ko">한국어 (Korean)</option>
              </select>
            </AuthField>

            <button
              type="submit"
              className="button button-primary"
              disabled={updatingProfile || !displayName.trim()}
            >
              {updatingProfile ? "保存中…" : "プロフィールを保存"}
            </button>
          </AuthForm>
        </ProfileCard>

        {/* Change Password Card */}
        <ProfileCard>
          <h2>{t.authChangePassword}</h2>

          {passwordSuccess && (
            <StatusBanner $tone="success" role="status">
              <span>✓ {t.authPasswordChanged}</span>
            </StatusBanner>
          )}

          {passwordError && (
            <StatusBanner $tone="error" role="alert">
              <span>{passwordError}</span>
            </StatusBanner>
          )}

          <AuthForm onSubmit={handleChangePassword} noValidate>
            <AuthField>
              <label htmlFor="current-password">{t.authCurrentPassword}</label>
              <input
                id="current-password"
                className="input"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={changingPassword}
              />
            </AuthField>

            <AuthField>
              <label htmlFor="new-password">{t.authNewPassword}</label>
              <input
                id="new-password"
                className="input"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t.authPasswordHint}
                required
                disabled={changingPassword}
              />
              <p className="hint">{t.authPasswordHint}</p>
            </AuthField>

            <button
              type="submit"
              className="button button-secondary"
              disabled={changingPassword || !currentPassword || !newPassword}
            >
              {changingPassword ? "変更中…" : t.authChangePassword}
            </button>
          </AuthForm>
        </ProfileCard>

        {/* Logout button */}
        <ProfileActions>
          <button
            type="button"
            className="button button-ghost logout-full-btn"
            onClick={handleLogout}
          >
            <LogoutIcon />
            {t.authLogout}
          </button>
        </ProfileActions>
      </AuthNarrow>
    </AuthPageShell>
  );
}
