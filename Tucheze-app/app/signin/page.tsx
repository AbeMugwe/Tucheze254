"use client";

import { useState, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignInForm {
  email: string;
  password: string;
}

interface FormError {
  field: string;
  message: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const FLOATING_EMOJIS: { emoji: string; top: string; left: string; delay: string; size: string }[] = [
  { emoji: "🎲", top: "8%",  left: "5%",  delay: "0s",   size: "2.4rem" },
  { emoji: "🏆", top: "15%", left: "88%", delay: "0.7s", size: "2rem"   },
  { emoji: "🎯", top: "70%", left: "4%",  delay: "1.3s", size: "1.8rem" },
  { emoji: "🃏", top: "78%", left: "89%", delay: "0.4s", size: "2.2rem" },
  { emoji: "🎮", top: "44%", left: "92%", delay: "1s",   size: "1.6rem" },
  { emoji: "⭐", top: "58%", left: "3%",  delay: "1.6s", size: "1.5rem" },
  { emoji: "🎉", top: "28%", left: "7%",  delay: "0.5s", size: "1.9rem" },
  { emoji: "🔥", top: "22%", left: "90%", delay: "1.2s", size: "1.6rem" },
];

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .si-root {
    font-family: 'Nunito', sans-serif;
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1fr;
    color: #1a1a2e;
    overflow: hidden;
  }

  /* ── LEFT PANEL ── */
  .si-left {
    background: #1a1a2e;
    display: flex; flex-direction: column;
    justify-content: space-between;
    padding: 48px;
    position: relative; overflow: hidden;
  }
  .si-left-pattern {
    position: absolute; inset: 0; opacity: 0.04;
    background-image: radial-gradient(circle, white 1.5px, transparent 1.5px);
    background-size: 28px 28px;
    pointer-events: none;
  }
  .si-left-glow {
    position: absolute; width: 400px; height: 400px;
    border-radius: 50%; filter: blur(80px); opacity: 0.15;
    pointer-events: none;
  }

  .si-logo {
    display: flex; align-items: center; gap: 12px;
    position: relative; z-index: 1;
  }
  .si-logo-badge {
    width: 44px; height: 44px; border-radius: 50%;
    background: #FFE135; border: 3px solid #FFE135;
    box-shadow: 4px 4px 0 rgba(255,225,53,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 1.4rem;
  }
  .si-logo-text {
    font-family: 'Fredoka One', cursive; font-size: 1.8rem;
    color: #FF6B6B; text-shadow: 3px 3px 0 rgba(255,107,107,0.25);
  }

  .si-left-content { position: relative; z-index: 1; }
  .si-left-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,225,53,0.12); border: 2px solid rgba(255,225,53,0.4);
    color: #FFE135; border-radius: 50px; padding: 5px 16px;
    font-size: 0.72rem; font-weight: 800; letter-spacing: 1.5px;
    text-transform: uppercase; margin-bottom: 20px;
  }
  .si-left-heading {
    font-family: 'Fredoka One', cursive; font-size: 3.2rem;
    line-height: 1.05; color: white; margin-bottom: 16px;
  }
  .si-left-heading span { color: #FF6B6B; }
  .si-left-sub {
    font-size: 0.95rem; font-weight: 700;
    color: rgba(255,255,255,0.45); line-height: 1.6; max-width: 340px;
  }

  .si-stats {
    display: grid; grid-template-columns: repeat(3, 1fr);
    gap: 12px; position: relative; z-index: 1;
  }
  .si-stat {
    background: rgba(255,255,255,0.06);
    border: 1.5px solid rgba(255,255,255,0.1);
    border-radius: 16px; padding: 16px 14px;
  }
  .si-stat-num {
    font-family: 'Fredoka One', cursive; font-size: 1.6rem;
    color: #FFE135; margin-bottom: 2px;
  }
  .si-stat-label {
    font-size: 0.7rem; font-weight: 800;
    color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.5px;
  }

  /* ── RIGHT PANEL ── */
  .si-right {
    background-color: #FFFDF5;
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    display: flex; align-items: center; justify-content: center;
    padding: 48px 56px;
    position: relative;
  }

  .float-emoji {
    position: absolute; pointer-events: none; user-select: none;
    animation: floatBob 4s ease-in-out infinite; opacity: 0.15;
  }
  @keyframes floatBob {
    0%,100% { transform: translateY(0) rotate(-6deg); }
    50%      { transform: translateY(-14px) rotate(6deg); }
  }

  .si-form-wrap {
    width: 100%; max-width: 400px;
    animation: formPop .4s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes formPop {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .si-form-title {
    font-family: 'Fredoka One', cursive; font-size: 2.2rem;
    margin-bottom: 6px; line-height: 1.1;
  }
  .si-form-title span { color: #FF6B6B; }
  .si-form-sub {
    font-size: 0.85rem; font-weight: 700; opacity: 0.4; margin-bottom: 32px;
  }

  /* fields */
  .si-field { margin-bottom: 18px; }
  .si-label {
    display: block; font-weight: 800; font-size: 0.75rem;
    letter-spacing: 0.5px; margin-bottom: 7px; opacity: 0.6;
  }
  .si-input-wrap { position: relative; }
  .si-input-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 1rem; pointer-events: none;
  }
  .si-input {
    width: 100%; font-family: 'Nunito', sans-serif;
    font-weight: 700; font-size: 0.92rem;
    padding: 13px 14px 13px 42px;
    border: 2.5px solid #e5e5e5; border-radius: 14px;
    background: white; color: #1a1a2e; outline: none;
    transition: border-color .15s, box-shadow .15s;
    box-shadow: 3px 3px 0 transparent;
  }
  .si-input:focus { border-color: #FF6B6B; box-shadow: 3px 3px 0 #FF6B6B; }
  .si-input.error { border-color: #FF6B6B; background: #fff8f8; }
  .si-error-msg {
    font-size: 0.72rem; font-weight: 800; color: #FF6B6B;
    margin-top: 5px; display: flex; align-items: center; gap: 4px;
  }
  .si-pw-toggle {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    font-size: 1rem; opacity: 0.4; transition: opacity .15s; padding: 0;
  }
  .si-pw-toggle:hover { opacity: 0.9; }

  .si-forgot { text-align: right; margin-top: -10px; margin-bottom: 18px; }
  .si-forgot-link {
    font-size: 0.76rem; font-weight: 800; color: #FF6B6B;
    cursor: pointer; opacity: 0.8;
    text-decoration: underline; text-underline-offset: 2px;
  }

  /* auth error banner */
  .si-auth-error {
    background: #fff0f0; border: 2px solid #FF6B6B; border-radius: 12px;
    padding: 10px 14px; margin-bottom: 14px;
    font-size: 0.8rem; font-weight: 700; color: #FF6B6B;
    display: flex; align-items: center; gap: 8px;
  }

  /* submit */
  .si-submit {
    width: 100%; font-family: 'Fredoka One', cursive; font-size: 1.15rem;
    padding: 15px; border: 3px solid #1a1a2e; border-radius: 14px;
    cursor: pointer; background: #FF6B6B; color: white;
    box-shadow: 5px 5px 0 #1a1a2e;
    transition: transform .1s, box-shadow .1s;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    margin-bottom: 20px;
  }
  .si-submit:hover:not(:disabled) { transform: translate(-2px,-2px); box-shadow: 7px 7px 0 #1a1a2e; }
  .si-submit:active:not(:disabled) { transform: translate(1px,1px); box-shadow: 2px 2px 0 #1a1a2e; }
  .si-submit:disabled { opacity: 0.55; cursor: not-allowed; }
  .si-submit.loading { background: #1a1a2e; }

  .spinner {
    width: 18px; height: 18px;
    border: 2.5px solid rgba(255,255,255,0.35);
    border-top-color: white; border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* divider */
  .si-divider {
    display: flex; align-items: center; gap: 12px;
    font-size: 0.75rem; font-weight: 800; opacity: 0.3; margin-bottom: 20px;
  }
  .si-divider::before, .si-divider::after {
    content: ''; flex: 1; height: 2px; background: #1a1a2e; border-radius: 2px;
  }

  /* social */
  .si-social-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 28px; }
  .si-social-btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.85rem;
    padding: 12px; border: 2.5px solid #1a1a2e; border-radius: 12px;
    cursor: pointer; background: white; color: #1a1a2e;
    box-shadow: 3px 3px 0 #1a1a2e;
    transition: transform .1s, box-shadow .1s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .si-social-btn:hover { transform: translate(-1px,-1px); box-shadow: 5px 5px 0 #1a1a2e; }

  /* switch */
  .si-switch {
    text-align: center; font-size: 0.84rem; font-weight: 700;
    padding: 16px 20px; background: rgba(255,107,107,0.06);
    border: 2px solid rgba(255,107,107,0.2); border-radius: 12px;
  }
  .si-switch-link {
    color: #FF6B6B; font-weight: 900; cursor: pointer;
    text-decoration: underline; text-underline-offset: 2px;
  }

  /* success */
  .si-success {
    text-align: center; padding: 40px 0;
    animation: formPop .4s cubic-bezier(.34,1.56,.64,1);
  }
  .si-success-icon { font-size: 4.5rem; margin-bottom: 16px; }
  .si-success-title {
    font-family: 'Fredoka One', cursive; font-size: 2rem;
    color: #4ECDC4; text-shadow: 2px 2px 0 #1a1a2e; margin-bottom: 8px;
  }
  .si-success-sub { font-size: 0.86rem; font-weight: 700; opacity: 0.45; }

  @media (max-width: 768px) {
    .si-root { grid-template-columns: 1fr; }
    .si-left { display: none; }
    .si-right { padding: 40px 28px; }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function validate(form: SignInForm): FormError[] {
  const errors: FormError[] = [];
  if (!form.email.includes("@"))  errors.push({ field: "email",    message: "Enter a valid email address" });
  if (form.password.length < 6)   errors.push({ field: "password", message: "Password must be at least 6 characters" });
  return errors;
}

// ─── Field Component ──────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  icon: string;
  type?: string;
  value: string;
  placeholder?: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  autoComplete?: string;
  children?: React.ReactNode;
}

function Field({ label, icon, type = "text", value, placeholder, onChange, error, autoComplete, children }: FieldProps) {
  return (
    <div className="si-field">
      <label className="si-label">{label}</label>
      <div className="si-input-wrap">
        <span className="si-input-icon">{icon}</span>
        <input
          className={`si-input${error ? " error" : ""}`}
          type={type} value={value} placeholder={placeholder}
          onChange={onChange} autoComplete={autoComplete}
        />
        {children}
      </div>
      {error && <div className="si-error-msg">⚠️ {error}</div>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignIn() {
  const router     = useRouter();
  const { signIn } = useAuthActions();

  // Pick up ?redirect= param so join links work after auth
  const searchParams = typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const redirectTo = searchParams?.get("redirect") ?? "/";

  const [form, setForm]           = useState<SignInForm>({ email: "", password: "" });
  const [errors, setErrors]       = useState<FormError[]>([]);
  const [loading, setLoading]     = useState<boolean>(false);
  const [success, setSuccess]     = useState<boolean>(false);
  const [showPw, setShowPw]       = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const getError = (field: string): string | undefined =>
    errors.find((e) => e.field === field)?.message;

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const errs = validate(form);
    if (errs.length > 0) { setErrors(errs); return; }
    setErrors([]);
    setAuthError(null);
    setLoading(true);

    try {
      await signIn("password", {
        flow:     "signIn",
        email:    form.email,
        password: form.password,
      });
      setLoading(false);
      setSuccess(true);
      // Redirect to original destination (e.g. /join/T254-XXXXX) or home
      await new Promise((r) => setTimeout(r, 1200));
      router.push(redirectTo);
    } catch (err: unknown) {
      setLoading(false);
      const message = err instanceof Error ? err.message : "Something went wrong.";
      if (
        message.toLowerCase().includes("invalid") ||
        message.toLowerCase().includes("password") ||
        message.toLowerCase().includes("not found")
      ) {
        setAuthError("Incorrect email or password. Please try again.");
      } else {
        setAuthError(message);
      }
    }
  };

  return (
    <>
      <style>{FONTS}{css}</style>
      <div className="si-root">

        {/* ── LEFT PANEL ── */}
        <div className="si-left">
          <div className="si-left-pattern" />
          <div className="si-left-glow" style={{ background: "#FF6B6B", top: "-100px", right: "-100px" }} />
          <div className="si-left-glow" style={{ background: "#4ECDC4", bottom: "-100px", left: "-80px" }} />

          <div className="si-logo">
            <div className="si-logo-badge">🎲</div>
            <div className="si-logo-text">Tucheze254</div>
          </div>

          <div className="si-left-content">
            <div className="si-left-tag">🎮 Game Night HQ</div>
            <h2 className="si-left-heading">
              Back in<br />the <span>game.</span>
            </h2>
            <p className="si-left-sub">
              Your crew is waiting. Sign in to see tonight's scores, check the leaderboard, and keep your streak alive.
            </p>
          </div>

          <div className="si-stats">
            {[
              { num: "42",  label: "Sessions" },
              { num: "8",   label: "Players"  },
              { num: "127", label: "Rounds"   },
            ].map((s, i) => (
              <div key={i} className="si-stat">
                <div className="si-stat-num">{s.num}</div>
                <div className="si-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="si-right">
          {FLOATING_EMOJIS.map((fe, i) => (
            <div key={i} className="float-emoji"
              style={{ top: fe.top, left: fe.left, animationDelay: fe.delay, fontSize: fe.size }}>
              {fe.emoji}
            </div>
          ))}

          <div className="si-form-wrap">
            {success ? (
              <div className="si-success">
                <div className="si-success-icon">🎉</div>
                <div className="si-success-title">You're in!</div>
                <div className="si-success-sub">Redirecting you to the game…</div>
                <div style={{ marginTop: 24 }}>
                  <div className="spinner" style={{ margin: "0 auto", borderColor: "rgba(78,205,196,0.3)", borderTopColor: "#4ECDC4" }} />
                </div>
              </div>
            ) : (
              <>
                <div className="si-form-title">Welcome back <span>👋</span></div>
                <div className="si-form-sub">Sign in to your Tucheze254 account</div>

                <form onSubmit={handleSubmit} noValidate>
                  <Field label="EMAIL ADDRESS" icon="📧" type="email"
                    value={form.email} placeholder="you@example.com"
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    error={getError("email")} autoComplete="email" />

                  <Field label="PASSWORD" icon="🔒"
                    type={showPw ? "text" : "password"}
                    value={form.password} placeholder="Your password"
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    error={getError("password")} autoComplete="current-password">
                    <button type="button" className="si-pw-toggle" onClick={() => setShowPw((v) => !v)}>
                      {showPw ? "🙈" : "👁️"}
                    </button>
                  </Field>

                  <div className="si-forgot">
                    <span className="si-forgot-link">Forgot password?</span>
                  </div>

                  {authError && (
                    <div className="si-auth-error">
                      ⚠️ {authError}
                    </div>
                  )}

                  <button type="submit" className={`si-submit${loading ? " loading" : ""}`} disabled={loading}>
                    {loading ? <><div className="spinner" />Signing in…</> : <>🚀 Sign In</>}
                  </button>
                </form>

                <div className="si-divider">or continue with</div>
                <div className="si-social-row">
                  <button className="si-social-btn">🌐 Google</button>
                  <button className="si-social-btn">📱 Phone</button>
                </div>

                <div className="si-switch">
                  New to Tucheze254?{" "}
                  <a href="/signup" className="si-switch-link">Create an account →</a>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </>
  );
}