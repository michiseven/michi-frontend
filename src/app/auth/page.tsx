"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { loginUser, registerUser } from "@/lib/api";
import { isAuthenticated, setAuthSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

export default function AuthPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/");
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        const res = await loginUser({ email, password });
        setAuthSession(res);
        router.push("/");
      } else {
        if (!displayName.trim()) {
          setError(t.authDisplayName + " is required");
          setLoading(false);
          return;
        }
        if (password.length < 8) {
          setError(t.authPasswordHint);
          setLoading(false);
          return;
        }
        const res = await registerUser({
          email,
          password,
          displayName: displayName.trim(),
          locale: lang,
        });
        setAuthSession(res);
        router.push("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-shell" id="main-content">
      <div className="page-narrow auth-page-container">
        <div className="auth-card">
          <div className="page-heading" style={{ marginBottom: 24, textAlign: "center" }}>
            <h1>{mode === "login" ? t.authLogin : t.authRegister}</h1>
            <p className="lede">
              {mode === "login"
                ? "Michiアカウントにログインして旅程を保存・管理します。"
                : "Michiに登録して、お気に入りの旅程やメモを保存しましょう。"}
            </p>
          </div>

          <div className="auth-tab-switch" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`auth-tab-btn ${mode === "login" ? "active" : ""}`}
              onClick={() => {
                setMode("login");
                setError(null);
              }}
            >
              {t.authLogin}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              className={`auth-tab-btn ${mode === "register" ? "active" : ""}`}
              onClick={() => {
                setMode("register");
                setError(null);
              }}
            >
              {t.authRegister}
            </button>
          </div>

          {error && (
            <div className="status-banner error" role="alert" style={{ marginBottom: 16 }}>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {mode === "register" && (
              <div className="field">
                <label htmlFor="auth-displayName">{t.authDisplayName}</label>
                <input
                  id="auth-displayName"
                  className="input"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="例: たなか"
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="field">
              <label htmlFor="auth-email">{t.authEmail}</label>
              <input
                id="auth-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@michi.travel"
                required
                disabled={loading}
              />
            </div>

            <div className="field">
              <label htmlFor="auth-password">{t.authPassword}</label>
              <input
                id="auth-password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? t.authPasswordHint : "••••••••"}
                required
                disabled={loading}
              />
              {mode === "register" && (
                <p className="hint">{t.authPasswordHint}</p>
              )}
            </div>

            <button
              type="submit"
              className="button button-primary"
              style={{ width: "100%", marginTop: 16 }}
              disabled={loading || !email || !password}
            >
              {loading ? (
                <span className="spinner" aria-hidden="true" />
              ) : mode === "login" ? (
                t.authLogin
              ) : (
                t.authRegister
              )}
            </button>
          </form>

          <div className="auth-modal-footer">
            {mode === "login" ? (
              <p>
                {t.authRegisterPrompt}{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                >
                  {t.authRegister}
                </button>
              </p>
            ) : (
              <p>
                {t.authLoginPrompt}{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                >
                  {t.authLogin}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
