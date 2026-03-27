"use client";

import Link from "next/link";
import { useState, useEffect, useRef, FormEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "@/convex/_generated/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignUpForm {
  nickname: string;
  email: string;
  password: string;
  confirmPassword: string;
  avatar: string;
  playStyle: string[];
}

interface FormError {
  field: string;
  message: string;
}

type StrengthLevel = 0 | 1 | 2 | 3;

interface PasswordStrength {
  level: StrengthLevel;
  label: string;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');`;

const AVATAR_OPTIONS: string[] = [
  "😎","🤠","🦁","🐉","🌟","🦊","🐬","🦅","🐼","🦋","🐸","🦄",
  "🧠","👻","🤖","🦸","🐯","🐺","🦝","🎭","🧙","⚡",
];

const PLAY_STYLES: { label: string; emoji: string }[] = [
  { label: "Strategist",  emoji: "♟️" },
  { label: "Party Animal",emoji: "🎉" },
  { label: "Speedrunner", emoji: "⚡" },
  { label: "Wildcard",    emoji: "🎲" },
  { label: "Trash Talker",emoji: "🗣️" },
  { label: "Silent Pro",  emoji: "🤫" },
];

const FLOATING_EMOJIS: { emoji: string; top: string; left: string; delay: string; size: string }[] = [
  { emoji: "🎲", top: "6%",  left: "4%",  delay: "0s",   size: "2.2rem" },
  { emoji: "🏆", top: "12%", left: "87%", delay: "0.7s", size: "1.9rem" },
  { emoji: "🎯", top: "68%", left: "3%",  delay: "1.3s", size: "1.7rem" },
  { emoji: "🃏", top: "80%", left: "90%", delay: "0.4s", size: "2rem"   },
  { emoji: "🎮", top: "42%", left: "93%", delay: "1s",   size: "1.5rem" },
  { emoji: "⭐", top: "55%", left: "2%",  delay: "1.6s", size: "1.4rem" },
];

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .su-root {
    font-family: 'Nunito', sans-serif;
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1fr 1.3fr;
    color: #1a1a2e;
    overflow: hidden;
  }

  /* ── LEFT PANEL ── */
  .su-left {
    background: #1a1a2e;
    display: flex; flex-direction: column; justify-content: space-between;
    padding: 48px; position: relative; overflow: hidden;
  }
  .su-left-pattern {
    position: absolute; inset: 0; opacity: 0.04;
    background-image: radial-gradient(circle, white 1.5px, transparent 1.5px);
    background-size: 28px 28px; pointer-events: none;
  }
  .su-left-glow {
    position: absolute; width: 380px; height: 380px;
    border-radius: 50%; filter: blur(80px); opacity: 0.14;
    pointer-events: none;
  }
  .su-logo {
    display: flex; align-items: center; gap: 12px; position: relative; z-index: 1;
  }
  .su-logo-badge {
    width: 44px; height: 44px; border-radius: 50%;
    background: #FFE135; border: 3px solid #FFE135;
    box-shadow: 4px 4px 0 rgba(255,225,53,0.3);
    display: flex; align-items: center; justify-content: center; font-size: 1.4rem;
  }
  .su-logo-text {
    font-family: 'Fredoka One', cursive; font-size: 1.8rem;
    color: #FF6B6B; text-shadow: 3px 3px 0 rgba(255,107,107,0.25);
  }
  .su-left-content { position: relative; z-index: 1; }
  .su-left-tag {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(78,205,196,0.12); border: 2px solid rgba(78,205,196,0.4);
    color: #4ECDC4; border-radius: 50px; padding: 5px 16px;
    font-size: 0.72rem; font-weight: 800; letter-spacing: 1.5px;
    text-transform: uppercase; margin-bottom: 20px;
  }
  .su-left-heading {
    font-family: 'Fredoka One', cursive; font-size: 3rem;
    line-height: 1.05; color: white; margin-bottom: 16px;
  }
  .su-left-heading span { color: #4ECDC4; }
  .su-left-sub {
    font-size: 0.92rem; font-weight: 700;
    color: rgba(255,255,255,0.4); line-height: 1.7; max-width: 320px;
    margin-bottom: 32px;
  }

  /* perks list */
  .su-perks { display: flex; flex-direction: column; gap: 14px; position: relative; z-index: 1; }
  .su-perk {
    display: flex; align-items: flex-start; gap: 14px;
    padding: 14px 16px;
    background: rgba(255,255,255,0.05);
    border: 1.5px solid rgba(255,255,255,0.08);
    border-radius: 14px;
  }
  .su-perk-icon {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 1.2rem;
  }
  .su-perk-title { font-weight: 800; font-size: 0.88rem; color: white; margin-bottom: 2px; }
  .su-perk-sub   { font-size: 0.75rem; font-weight: 700; color: rgba(255,255,255,0.35); }

  /* ── RIGHT PANEL ── */
  .su-right {
    background-color: #FFFDF5;
    background-image: radial-gradient(circle, #ddd 1px, transparent 1px);
    background-size: 28px 28px;
    display: flex; align-items: flex-start; justify-content: center;
    padding: 48px 56px;
    position: relative; overflow-y: auto;
  }
  .float-emoji {
    position: fixed; pointer-events: none; user-select: none;
    animation: floatBob 4s ease-in-out infinite; opacity: 0.12;
    z-index: 0;
  }
  @keyframes floatBob {
    0%,100% { transform: translateY(0) rotate(-6deg); }
    50%      { transform: translateY(-14px) rotate(6deg); }
  }

  .su-form-wrap {
    width: 100%; max-width: 440px; position: relative; z-index: 1;
    padding: 8px 0 48px;
    animation: formPop .4s cubic-bezier(.34,1.56,.64,1);
  }
  @keyframes formPop {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* progress bar */
  .su-progress { margin-bottom: 28px; }
  .su-progress-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
  }
  .su-progress-label { font-size: 0.75rem; font-weight: 800; opacity: 0.4; }
  .su-progress-pct   { font-size: 0.75rem; font-weight: 900; color: #4ECDC4; }
  .su-progress-track {
    height: 8px; background: #eee; border: 2px solid #1a1a2e; border-radius: 50px; overflow: hidden;
  }
  .su-progress-fill {
    height: 100%; background: #4ECDC4; border-radius: 50px;
    transition: width .5s cubic-bezier(.34,1.56,.64,1);
  }

  .su-form-title {
    font-family: 'Fredoka One', cursive; font-size: 2rem; margin-bottom: 4px;
  }
  .su-form-title span { color: #4ECDC4; }
  .su-form-sub { font-size: 0.83rem; font-weight: 700; opacity: 0.4; margin-bottom: 26px; }

  /* avatar picker */
  .su-section-label {
    font-weight: 800; font-size: 0.75rem; letter-spacing: 0.5px;
    opacity: 0.55; margin-bottom: 10px; display: block;
  }
  .su-avatar-grid {
    display: grid; grid-template-columns: repeat(8, 1fr); gap: 7px; margin-bottom: 22px;
  }
  .su-avatar-opt {
    aspect-ratio: 1; border-radius: 10px; border: 2.5px solid #e5e5e5;
    display: flex; align-items: center; justify-content: center;
    font-size: 1.2rem; cursor: pointer;
    transition: border-color .15s, box-shadow .15s, transform .1s;
    background: white;
  }
  .su-avatar-opt:hover  { transform: scale(1.1); border-color: #4ECDC4; }
  .su-avatar-opt.selected {
    border-color: #4ECDC4; background: rgba(78,205,196,0.1);
    box-shadow: 3px 3px 0 #1a1a2e; transform: scale(1.08);
  }
  .su-avatar-error { font-size: 0.72rem; font-weight: 800; color: #FF6B6B; margin-top: -14px; margin-bottom: 14px; }

  /* play style */
  .su-style-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 22px;
  }
  .su-style-opt {
    border: 2.5px solid #e5e5e5; border-radius: 12px; padding: 10px 8px;
    text-align: center; cursor: pointer; background: white;
    transition: border-color .15s, transform .1s, box-shadow .15s;
  }
  .su-style-opt:hover { transform: translateY(-1px); border-color: #4ECDC4; }
  .su-style-opt.selected {
    border-color: #4ECDC4; background: rgba(78,205,196,0.08);
    box-shadow: 3px 3px 0 #1a1a2e;
  }
  .su-style-emoji { font-size: 1.3rem; margin-bottom: 4px; }
  .su-style-label { font-size: 0.68rem; font-weight: 800; opacity: 0.65; }

  /* form fields */
  .su-field { margin-bottom: 16px; }
  .su-label {
    display: block; font-weight: 800; font-size: 0.75rem;
    letter-spacing: 0.5px; margin-bottom: 7px; opacity: 0.6;
  }
  .su-input-wrap { position: relative; }
  .su-input-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    font-size: 1rem; pointer-events: none;
  }
  .su-input {
    width: 100%; font-family: 'Nunito', sans-serif;
    font-weight: 700; font-size: 0.92rem;
    padding: 13px 14px 13px 42px;
    border: 2.5px solid #e5e5e5; border-radius: 14px;
    background: white; color: #1a1a2e; outline: none;
    transition: border-color .15s, box-shadow .15s;
    box-shadow: 3px 3px 0 transparent;
  }
  .su-input:focus { border-color: #4ECDC4; box-shadow: 3px 3px 0 #4ECDC4; }
  .su-input.error   { border-color: #FF6B6B; background: #fff8f8; }
  .su-input.success { border-color: #4ECDC4; }
  .su-error-msg {
    font-size: 0.72rem; font-weight: 800; color: #FF6B6B;
    margin-top: 5px; display: flex; align-items: center; gap: 4px;
  }
  .su-pw-toggle {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer;
    font-size: 1rem; opacity: 0.4; transition: opacity .15s; padding: 0;
  }
  .su-pw-toggle:hover { opacity: 0.9; }

  /* password strength */
  .su-pw-strength { margin-top: 8px; margin-bottom: 4px; }
  .su-pw-bars { display: flex; gap: 5px; margin-bottom: 4px; }
  .su-pw-bar {
    flex: 1; height: 5px; border-radius: 50px;
    border: 1.5px solid #1a1a2e; background: #eee; transition: background .3s;
  }
  .su-pw-bar.weak   { background: #FF6B6B; }
  .su-pw-bar.medium { background: #FFE135; }
  .su-pw-bar.strong { background: #4ECDC4; }
  .su-pw-label { font-size: 0.7rem; font-weight: 800; opacity: 0.5; }

  /* submit */
  .su-submit {
    width: 100%; margin-top: 22px; margin-bottom: 18px;
    font-family: 'Fredoka One', cursive; font-size: 1.15rem;
    padding: 15px; border: 3px solid #1a1a2e; border-radius: 14px;
    cursor: pointer; background: #4ECDC4; color: #1a1a2e;
    box-shadow: 5px 5px 0 #1a1a2e;
    transition: transform .1s, box-shadow .1s;
    display: flex; align-items: center; justify-content: center; gap: 10px;
  }
  .su-submit:hover:not(:disabled) { transform: translate(-2px,-2px); box-shadow: 7px 7px 0 #1a1a2e; }
  .su-submit:active:not(:disabled) { transform: translate(1px,1px); box-shadow: 2px 2px 0 #1a1a2e; }
  .su-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  .su-submit.loading { background: #1a1a2e; color: white; }

  .spinner {
    width: 18px; height: 18px;
    border: 2.5px solid rgba(255,255,255,0.35);
    border-top-color: white; border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* divider + social */
  .su-divider {
    display: flex; align-items: center; gap: 12px;
    font-size: 0.75rem; font-weight: 800; opacity: 0.3; margin-bottom: 16px;
  }
  .su-divider::before, .su-divider::after {
    content: ''; flex: 1; height: 2px; background: #1a1a2e; border-radius: 2px;
  }
  .su-social-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 22px; }
  .su-social-btn {
    font-family: 'Nunito', sans-serif; font-weight: 800; font-size: 0.85rem;
    padding: 12px; border: 2.5px solid #1a1a2e; border-radius: 12px;
    cursor: pointer; background: white; color: #1a1a2e;
    box-shadow: 3px 3px 0 #1a1a2e; transition: transform .1s, box-shadow .1s;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .su-social-btn:hover { transform: translate(-1px,-1px); box-shadow: 5px 5px 0 #1a1a2e; }

  /* switch */
  .su-switch {
    text-align: center; font-size: 0.84rem; font-weight: 700;
    padding: 16px 20px; background: rgba(78,205,196,0.06);
    border: 2px solid rgba(78,205,196,0.25); border-radius: 12px;
  }
  .su-switch-link {
    color: #4ECDC4; font-weight: 900; cursor: pointer;
    text-decoration: underline; text-underline-offset: 2px;
  }

  /* terms */
  .su-terms {
    font-size: 0.7rem; font-weight: 700; opacity: 0.35;
    text-align: center; margin-top: 14px; line-height: 1.5;
  }
  .su-terms a { color: #4ECDC4; opacity: 1; text-decoration: none; }

  /* success screen */
  .su-success {
    text-align: center; padding: 60px 0;
    animation: formPop .4s cubic-bezier(.34,1.56,.64,1);
  }
  .su-success-avatar { font-size: 5rem; margin-bottom: 12px; }
  .su-success-title {
    font-family: 'Fredoka One', cursive; font-size: 2.2rem;
    color: #4ECDC4; text-shadow: 2px 2px 0 #1a1a2e; margin-bottom: 8px;
  }
  .su-success-name { font-size: 1rem; font-weight: 800; opacity: 0.5; margin-bottom: 24px; }
  .su-success-redirect {
    font-size: 0.78rem; font-weight: 700; opacity: 0.35; margin-top: 16px;
  }

  @media (max-width: 900px) {
    .su-root { grid-template-columns: 1fr; }
    .su-left { display: none; }
    .su-right { padding: 32px 24px; }
    .su-avatar-grid { grid-template-columns: repeat(6, 1fr); }
  }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPasswordStrength(pw: string): PasswordStrength {
  if (pw.length === 0) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8)            score++;
  if (/[A-Z]/.test(pw))          score++;
  if (/[0-9!@#$%^&*]/.test(pw)) score++;
  if (score === 1) return { level: 1, label: "Weak — try harder 😅",  color: "#FF6B6B" };
  if (score === 2) return { level: 2, label: "Getting there 👍",       color: "#FFE135" };
  return              { level: 3, label: "Strong password! 💪",        color: "#4ECDC4" };
}

function validate(form: SignUpForm): FormError[] {
  const errors: FormError[] = [];
  if (!form.avatar)                           errors.push({ field: "avatar",          message: "Pick an avatar" });
  if (form.nickname.trim().length < 2)        errors.push({ field: "nickname",        message: "At least 2 characters" });
  if (!form.email.includes("@"))              errors.push({ field: "email",           message: "Enter a valid email" });
  if (form.password.length < 8)              errors.push({ field: "password",        message: "Must be at least 8 characters" });
  if (form.password !== form.confirmPassword) errors.push({ field: "confirmPassword", message: "Passwords don't match" });
  return errors;
}

function calcProgress(form: SignUpForm): number {
  let filled = 0;
  if (form.avatar)                            filled++;
  if (form.nickname.trim().length >= 2)       filled++;
  if (form.email.includes("@"))               filled++;
  if (form.password.length >= 8)              filled++;
  if (form.confirmPassword === form.password && form.confirmPassword.length > 0) filled++;
  return Math.round((filled / 5) * 100);
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
  success?: boolean;
  autoComplete?: string;
  children?: React.ReactNode;
}

function Field({ label, icon, type = "text", value, placeholder, onChange, error, success, autoComplete, children }: FieldProps) {
  return (
    <div className="su-field">
      <label className="su-label">{label}</label>
      <div className="su-input-wrap">
        <span className="su-input-icon">{icon}</span>
        <input
          className={`su-input${error ? " error" : ""}${success ? " success" : ""}`}
          type={type} value={value} placeholder={placeholder}
          onChange={onChange} autoComplete={autoComplete}
        />
        {children}
      </div>
      {error && <div className="su-error-msg">⚠️ {error}</div>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignUp() {
  const router        = useRouter();
  const { signIn }    = useAuthActions();
  const createProfile = useMutation(api.users.createProfile);
  const currentUser   = useQuery(api.users.currentUser);

  // Pick up ?redirect= param so join links work after signup
  const redirectTo = typeof window !== "undefined"
    ? (new URLSearchParams(window.location.search).get("redirect") ?? "/")
    : "/";

  const [form, setForm] = useState<SignUpForm>({
    nickname: "", email: "", password: "", confirmPassword: "", avatar: "", playStyle: [],
  });
  const [errors, setErrors]         = useState<FormError[]>([]);
  const [loading, setLoading]       = useState<boolean>(false);
  const [success, setSuccess]       = useState<boolean>(false);
  const [showPw, setShowPw]         = useState<boolean>(false);
  const [authError, setAuthError]   = useState<string | null>(null);

  // Pending profile is set after signIn succeeds — useEffect watches currentUser
  // and fires createProfile once the auth session is confirmed server-side
  const pendingProfile = useRef<{ nickname: string; avatar: string; playStyle: string[] } | null>(null);

  // Check if the typed email is already registered (runs live as the user types)
  const emailTaken = useQuery(
    api.users.checkEmailExists,
    form.email.includes("@") ? { email: form.email } : "skip"
  );

  // ── Reactive profile creation ──────────────────────────────────────────────
  // Fires once currentUser transitions from undefined/null → a real user object
  // At that point the auth row definitely exists and ctx.db.get() will succeed
  useEffect(() => {
    if (!currentUser || !pendingProfile.current) return;
    const profile = pendingProfile.current;
    pendingProfile.current = null; // consume it — don't run twice

    createProfile({
      nickname:  profile.nickname,
      avatar:    profile.avatar,
      color:     "#4ECDC4",
      playStyle: profile.playStyle,
    })
      .then(() => {
        setLoading(false);
        setSuccess(true);
        setTimeout(() => router.push(redirectTo), 1800);
      })
      .catch((err: unknown) => {
        setLoading(false);
        setAuthError(err instanceof Error ? err.message : "Failed to save profile. Please try again.");
      });
  }, [currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const strength = getPasswordStrength(form.password);
  const progress = calcProgress(form);
  const getError = (field: string): string | undefined => errors.find((e) => e.field === field)?.message;

  const toggleStyle = (label: string): void => {
    setForm((f) => ({
      ...f,
      playStyle: f.playStyle.includes(label)
        ? f.playStyle.filter((s) => s !== label)
        : [...f.playStyle, label],
    }));
  };

  const strengthBarClass = (idx: number): string => {
    if (strength.level === 0) return "";
    if (strength.level === 1 && idx === 0) return "weak";
    if (strength.level === 2 && idx <= 1)  return "medium";
    if (strength.level === 3)              return "strong";
    return "";
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const errs = validate(form);
    if (errs.length > 0) { setErrors(errs); return; }

    if (emailTaken) {
      setAuthError("An account with this email already exists. Please sign in instead.");
      return;
    }

    setErrors([]);
    setAuthError(null);
    setLoading(true);

    try {
      // Store the profile data — useEffect will call createProfile once
      // currentUser becomes non-null (i.e. auth row is ready on the server)
      pendingProfile.current = {
        nickname:  form.nickname,
        avatar:    form.avatar,
        playStyle: form.playStyle,
      };

      await signIn("password", {
        flow:     "signUp",
        email:    form.email,
        password: form.password,
      });

      // signIn resolves — currentUser will update reactively, triggering the useEffect
      // loading stays true until the effect completes

    } catch (err: unknown) {
      pendingProfile.current = null; // clear pending if signIn itself failed
      setLoading(false);
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      if (message.toLowerCase().includes("already exists") || message.toLowerCase().includes("duplicate")) {
        setAuthError("An account with this email already exists. Try signing in instead.");
      } else {
        setAuthError(message);
      }
    }
  };

  return (
    <>
      <style>{FONTS}{css}</style>
      <div className="su-root">

        {/* ── LEFT PANEL ── */}
        <div className="su-left">
          <div className="su-left-pattern" />
          <div className="su-left-glow" style={{ background: "#4ECDC4", top: "-100px", left: "-80px" }} />
          <div className="su-left-glow" style={{ background: "#FF6B6B", bottom: "-80px", right: "-60px" }} />

          <div className="su-logo">
            <div className="su-logo-badge">🎲</div>
            <div className="su-logo-text">PlotnPlay</div>
          </div>

          <div className="su-left-content">
            <div className="su-left-tag">🚀 Join the Crew</div>
            <h2 className="su-left-heading">
              Your game night<br /><span>starts here.</span>
            </h2>
            <p className="su-left-sub">
              Create your free account and start tracking wins, building rivalries, and making memories with your crew.
            </p>
          </div>

          <div className="su-perks">
            {[
              { icon: "🏆", bg: "#FFE135", title: "ELO Leaderboards",      sub: "Track your ranking across every game"       },
              { icon: "🎖️", bg: "#FF9ECD", title: "Badges & Achievements", sub: "Earn titles like 'Comeback King' and more"   },
              { icon: "📊", bg: "#4ECDC4", title: "Full Stats History",    sub: "Win rates, streaks, head-to-head records"    },
              { icon: "🎲", bg: "#C8F135", title: "Game Night Sessions",   sub: "Organise, score and replay every game night" },
            ].map((p, i) => (
              <div key={i} className="su-perk">
                <div className="su-perk-icon" style={{ background: p.bg }}>{p.icon}</div>
                <div>
                  <div className="su-perk-title">{p.title}</div>
                  <div className="su-perk-sub">{p.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="su-right">
          {FLOATING_EMOJIS.map((fe, i) => (
            <div key={i} className="float-emoji"
              style={{ top: fe.top, left: fe.left, animationDelay: fe.delay, fontSize: fe.size }}>
              {fe.emoji}
            </div>
          ))}

          <div className="su-form-wrap">

            {/* ── SUCCESS SCREEN ── */}
            {success ? (
              <div className="su-success">
                {/* Show the avatar the user actually picked */}
                <div className="su-success-avatar">{form.avatar || "🎉"}</div>
                <div className="su-success-title">Welcome aboard!</div>
                <div className="su-success-name">
                  Hey {form.nickname || "Player"}, you're all set 🙌
                </div>
                {form.playStyle.length > 0 && (
                  <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
                    {form.playStyle.map((s) => (
                      <span key={s} style={{ background: "#C8F135", border: "2px solid #1a1a2e", borderRadius: 50, padding: "4px 14px", fontSize: "0.78rem", fontWeight: 800, boxShadow: "2px 2px 0 #1a1a2e" }}>
                        {PLAY_STYLES.find((p) => p.label === s)?.emoji} {s}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ marginTop: 16 }}>
                  <div className="spinner" style={{ margin: "0 auto", borderColor: "rgba(78,205,196,0.3)", borderTopColor: "#4ECDC4" }} />
                </div>
                <div className="su-success-redirect">
                  {redirectTo.startsWith("/join/") ? "Taking you back to the session…" : "Taking you to the home page…"}
                </div>
              </div>

            ) : (
              <>
                {/* ── PROGRESS BAR ── */}
                <div className="su-progress">
                  <div className="su-progress-header">
                    <span className="su-progress-label">PROFILE COMPLETION</span>
                    <span className="su-progress-pct">{progress}%</span>
                  </div>
                  <div className="su-progress-track">
                    <div className="su-progress-fill" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="su-form-title">Join the crew <span>🎉</span></div>
                <div className="su-form-sub">It's free. Takes 30 seconds.</div>

                {/* ── AVATAR PICKER ── */}
                <span className="su-section-label">PICK YOUR AVATAR</span>
                <div className="su-avatar-grid">
                  {AVATAR_OPTIONS.map((av) => (
                    <div key={av}
                      className={`su-avatar-opt${form.avatar === av ? " selected" : ""}`}
                      onClick={() => setForm((f) => ({ ...f, avatar: av }))}>
                      {av}
                    </div>
                  ))}
                </div>
                {getError("avatar") && <div className="su-avatar-error">⚠️ {getError("avatar")}</div>}

                {/* ── PLAY STYLE ── */}
                <span className="su-section-label">
                  PLAY STYLE <span style={{ opacity: 0.4, fontWeight: 600 }}>(optional, pick any)</span>
                </span>
                <div className="su-style-grid">
                  {PLAY_STYLES.map((ps) => (
                    <div key={ps.label}
                      className={`su-style-opt${form.playStyle.includes(ps.label) ? " selected" : ""}`}
                      onClick={() => toggleStyle(ps.label)}>
                      <div className="su-style-emoji">{ps.emoji}</div>
                      <div className="su-style-label">{ps.label}</div>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSubmit} noValidate>
                  <Field label="NICKNAME" icon="🎮"
                    value={form.nickname} placeholder="e.g. WanjikuWins"
                    onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                    error={getError("nickname")} autoComplete="username" />

                  <Field label="EMAIL ADDRESS" icon="📧" type="email"
                    value={form.email} placeholder="you@example.com"
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    error={emailTaken ? "An account with this email already exists — sign in instead." : getError("email")}
                    autoComplete="email" />

                  <Field label="PASSWORD" icon="🔒"
                    type={showPw ? "text" : "password"}
                    value={form.password} placeholder="At least 8 characters"
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    error={getError("password")} autoComplete="new-password">
                    <button type="button" className="su-pw-toggle" onClick={() => setShowPw((v) => !v)}>
                      {showPw ? "🙈" : "👁️"}
                    </button>
                  </Field>

                  {form.password.length > 0 && (
                    <div className="su-pw-strength">
                      <div className="su-pw-bars">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className={`su-pw-bar ${strengthBarClass(i)}`} />
                        ))}
                      </div>
                      <div className="su-pw-label" style={{ color: strength.color }}>{strength.label}</div>
                    </div>
                  )}

                  <Field label="CONFIRM PASSWORD" icon="✅"
                    type={showPw ? "text" : "password"}
                    value={form.confirmPassword} placeholder="Repeat your password"
                    onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    error={getError("confirmPassword")} autoComplete="new-password"
                    success={form.confirmPassword.length > 0 && form.confirmPassword === form.password} />

                  {authError && (
                    <div style={{ background: "#fff0f0", border: "2px solid #FF6B6B", borderRadius: 12, padding: "10px 14px", marginBottom: 8, fontSize: "0.8rem", fontWeight: 700, color: "#FF6B6B", display: "flex", alignItems: "center", gap: 8 }}>
                      ⚠️ {authError}
                    </div>
                  )}

                  <button type="submit" className={`su-submit${loading ? " loading" : ""}`} disabled={loading}>
                    {loading
                      ? <><div className="spinner" />Creating your account…</>
                      : <>🎲 Let's Play!</>}
                  </button>
                </form>

                <div className="su-divider">or sign up with</div>
                <div className="su-social-row">
                  <button className="su-social-btn">🌐 Google</button>
                  <button className="su-social-btn">📱 Phone</button>
                </div>

                <div className="su-switch">
                  Already have an account?{" "}
                  <a href="/signin" className="su-switch-link">Sign in →</a>
                </div>

                <div className="su-terms">
                  By signing up you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </>
  );
}