"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { changePassword, getProfile, logoutUser, updateProfile } from "@/lib/api";
import { getCurrentUser, isAuthenticated, subscribeAuth, updateCurrentUser } from "@/lib/auth";
import { useI18n, type Language } from "@/lib/i18n";
import type { User } from "@/lib/types";
import { LogoutIcon } from "@/components/icons";

export default function ProfilePage() {
  const { t, setLang } = useI18n();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [locale, setLocale] = useState<Language>("ja");
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/auth");
      return;
    }
    getProfile()
      .then((p) => {
        setUser(p);
        setDisplayName(p.displayName);
        setLocale(p.locale);
        updateCurrentUser(p);
      })
      .catch(() => {
        const current = getCurrentUser();
        if (current) {
          setUser(current);
          setDisplayName(current.displayName);
          setLocale(current.locale);
        }
      });

    const unsubscribe = subscribeAuth((updated) => {
      if (!updated) {
        router.replace("/auth");
      } else {
        setUser(updated);
        setDisplayName(updated.displayName);
        setLocale(updated.locale);
      }
    });
    return unsubscribe;
  }, [router]);

  async function handleUpdateProfile(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    setUpdatingProfile(true);

    try {
      const updated = await updateProfile({
        displayName: displayName.trim(),
        locale,
      });
      setUser(updated);
      updateCurrentUser(updated);
      setLang(locale);
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Profile update failed");
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    setChangingPassword(true);

    if (newPassword.length < 8) {
      setPasswordError(t.authPasswordHint);
      setChangingPassword(false);
      return;
    }

    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleLogout() {
    await logoutUser();
    router.replace("/");
  }

  if (!user) {
    return (
      <main className="page-shell" id="main-content">
        <div className="page-narrow">
          <div className="loading-state">
            <div className="skeleton skeleton-title" />
            <div className="skeleton skeleton-card" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell" id="main-content">
      <div className="page-narrow">
        <div className="page-heading">
          <p className="eyebrow">{t.brandTitle}</p>
          <h1>{t.authProfile}</h1>
          <p className="lede">
            アカウント情報と基本設定を管理します。
          </p>
        </div>

        {/* Profile Card */}
        <section className="profile-section-card">
          <h2>基本情報</h2>

          {profileSuccess && (
            <div className="status-banner success" role="status" style={{ marginBottom: 16 }}>
              <span>✓ {t.authProfileUpdated}</span>
            </div>
          )}

          {profileError && (
            <div className="status-banner error" role="alert" style={{ marginBottom: 16 }}>
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="auth-form" noValidate>
            <div className="field">
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
            </div>

            <div className="field">
              <label htmlFor="profile-name">{t.authDisplayName}</label>
              <input
                id="profile-name"
                className="input"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={updatingProfile}
              />
            </div>

            <div className="field">
              <label htmlFor="profile-locale">優先言語 / Preferred Language</label>
              <select
                id="profile-locale"
                className="input"
                value={locale}
                onChange={(e) => setLocale(e.target.value as Language)}
                disabled={updatingProfile}
              >
                <option value="ja">日本語 (Japanese)</option>
                <option value="ko">한국어 (Korean)</option>
              </select>
            </div>

            <button
              type="submit"
              className="button button-primary"
              disabled={updatingProfile || !displayName.trim()}
            >
              {updatingProfile ? "保存中…" : "プロフィールを保存"}
            </button>
          </form>
        </section>

        {/* Change Password Card */}
        <section className="profile-section-card" style={{ marginTop: 24 }}>
          <h2>{t.authChangePassword}</h2>

          {passwordSuccess && (
            <div className="status-banner success" role="status" style={{ marginBottom: 16 }}>
              <span>✓ {t.authPasswordChanged}</span>
            </div>
          )}

          {passwordError && (
            <div className="status-banner error" role="alert" style={{ marginBottom: 16 }}>
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="auth-form" noValidate>
            <div className="field">
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
            </div>

            <div className="field">
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
            </div>

            <button
              type="submit"
              className="button button-secondary"
              disabled={changingPassword || !currentPassword || !newPassword}
            >
              {changingPassword ? "変更中…" : t.authChangePassword}
            </button>
          </form>
        </section>

        {/* Logout button */}
        <div style={{ marginTop: 32, textAlign: "center" }}>
          <button
            type="button"
            className="button button-ghost logout-full-btn"
            onClick={handleLogout}
          >
            <LogoutIcon />
            {t.authLogout}
          </button>
        </div>
      </div>
    </main>
  );
}
