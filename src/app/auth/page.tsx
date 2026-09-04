"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, type FormEvent } from "react";
import { loginUser, registerUser } from "@/lib/api";
import { isAuthenticated, setAuthSession } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

const subscribeToHydration = () => () => {};

export default function AuthPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [view, setView] = useState<"start" | "login" | "register">("start");
  const hasHydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const authenticated = hasHydrated && isAuthenticated();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authenticated) {
      router.replace("/");
    }
  }, [authenticated, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (view === "login") {
        const res = await loginUser({ email, password });
        setAuthSession(res);
        router.replace("/");
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
        router.replace("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  function openForm(nextView: "login" | "register") {
    setView(nextView);
    setError(null);
  }

  // Do not expose the guest start surface until local auth state is known.
  // This also keeps authenticated visitors from briefly seeing /auth content.
  if (!hasHydrated || authenticated) {
    return (
      <main className="page-shell auth-redirect-loading" id="main-content" role="status" aria-live="polite">
        <div className="page-narrow">
          <div className="auth-redirect-loading-card">
            <span className="spinner" aria-hidden="true" />
            <p>{t.authRedirectLoading}</p>
          </div>
        </div>
      </main>
    );
  }

  if (view === "start") {
    const examples = [
      [t.authStartExampleOneTitle, t.authStartExampleOneDesc],
      [t.authStartExampleTwoTitle, t.authStartExampleTwoDesc],
      [t.authStartExampleThreeTitle, t.authStartExampleThreeDesc],
    ];
    const steps = [
      [t.authStartStepOneTitle, t.authStartStepOneDesc],
      [t.authStartStepTwoTitle, t.authStartStepTwoDesc],
      [t.authStartStepThreeTitle, t.authStartStepThreeDesc],
    ];

    return (
      <main className="page-shell" id="main-content">
        <div className="auth-start-page">
          <section className="auth-start-intro" aria-labelledby="auth-start-title">
            <header className="auth-start-hero">
              <p className="eyebrow">{t.authStartEyebrow}</p>
              <h1 id="auth-start-title">{t.authStartTitle}</h1>
              <p className="lede">{t.authStartLede}</p>
              <ul className="auth-start-badges" aria-label={t.authStartTitle}>
                <li>{t.authStartBadgeFree}</li>
                <li>{t.authStartBadgeMinute}</li>
                <li>{t.authStartBadgeSaveEdit}</li>
              </ul>
              <div className="auth-start-actions">
                <button type="button" className="button button-primary" onClick={() => openForm("register")}>
                  {t.authStartRegisterCta}
                </button>
                <p>
                  {t.authStartLoginPrompt}{" "}
                  <button type="button" className="link-button auth-start-login-link" onClick={() => openForm("login")}>
                    {t.authStartLoginCta}
                  </button>
                </p>
              </div>
            </header>

            <div className="auth-product-preview" aria-label={t.authStartPreviewLabel}>
              <figure className="auth-preview-card auth-preview-planner">
                <figcaption>{t.authStartChatCaptureLabel}</figcaption>
                <Image
                  src="/product-preview/chat-planner.png"
                  alt={t.authStartChatCaptureAlt}
                  width={1280}
                  height={800}
                  priority
                  sizes="(max-width: 700px) 92vw, (max-width: 1000px) 70vw, 520px"
                />
              </figure>
              <figure className="auth-preview-card auth-preview-result">
                <figcaption>{t.authStartResultCaptureLabel}</figcaption>
                <Image
                  src="/product-preview/trip-result.png"
                  alt={t.authStartResultCaptureAlt}
                  width={1280}
                  height={800}
                  priority
                  sizes="(max-width: 700px) 92vw, (max-width: 1000px) 70vw, 500px"
                />
              </figure>
            </div>
          </section>

          <section className="auth-start-section" aria-labelledby="auth-examples-title">
            <h2 id="auth-examples-title">{t.authStartExamplesTitle}</h2>
            <div className="auth-start-example-grid">
              {examples.map(([title, description]) => (
                <article className="auth-start-example" key={title}>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="auth-start-section" aria-labelledby="auth-steps-title">
            <h2 id="auth-steps-title">{t.authStartStepsTitle}</h2>
            <ol className="auth-start-steps">
              {steps.map(([title, description], index) => (
                <li key={title}>
                  <span aria-hidden="true">{index + 1}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell" id="main-content">
      <div className="page-narrow auth-page-container">
        <div className="auth-card">
          <div className="page-heading" style={{ marginBottom: 24, textAlign: "center" }}>
            <button type="button" className="link-button auth-back-button" onClick={() => setView("start")}>
              {t.authBackToStart}
            </button>
            <h1>{view === "login" ? t.authLoginTitle : t.authRegisterTitle}</h1>
            <p className="lede">{view === "login" ? t.authLoginLede : t.authRegisterLede}</p>
          </div>

          <div className="auth-tab-switch" role="tablist">
            <button
              type="button"
              role="tab"
              id="auth-login-tab"
              aria-selected={view === "login"}
              aria-controls="auth-form-panel"
              className={`auth-tab-btn ${view === "login" ? "active" : ""}`}
              onClick={() => openForm("login")}
            >
              {t.authLogin}
            </button>
            <button
              type="button"
              role="tab"
              id="auth-register-tab"
              aria-selected={view === "register"}
              aria-controls="auth-form-panel"
              className={`auth-tab-btn ${view === "register" ? "active" : ""}`}
              onClick={() => openForm("register")}
            >
              {t.authRegister}
            </button>
          </div>

          {error && (
            <div className="status-banner error" role="alert" style={{ marginBottom: 16 }}>
              <span>{error}</span>
            </div>
          )}

          <div id="auth-form-panel" role="tabpanel" aria-labelledby={view === "login" ? "auth-login-tab" : "auth-register-tab"}>
          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            {view === "register" && (
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
              {view === "register" && <p className="auth-email-reason">{t.authEmailReason}</p>}
            </div>

            <div className="field">
              <label htmlFor="auth-password">{t.authPassword}</label>
              <input
                id="auth-password"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={view === "register" ? t.authPasswordHint : "••••••••"}
                required
                disabled={loading}
              />
              {view === "register" && (
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
              ) : view === "login" ? (
                t.authLoginSubmit
              ) : (
                t.authRegisterSubmit
              )}
            </button>
          </form>
          </div>

          <div className="auth-modal-footer">
            {view === "login" ? (
              <p>
                {t.authRegisterPrompt}{" "}
                <button
                  type="button"
                  className="link-button"
                  onClick={() => openForm("register")}
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
                  onClick={() => openForm("login")}
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
