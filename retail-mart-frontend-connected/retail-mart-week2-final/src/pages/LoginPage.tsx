import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { getPostLoginRedirect } from "@/features/auth/postLoginRedirect";

interface LocationState {
  from?: { pathname: string };
}

/** Seeded by seed.py - see backend README for the full list. */
export const DEMO_CREDENTIALS = { email: "sorav@retailmart.dev", password: "password123" } as const;

const HEADLINE_WORDS = ["Run", "the", "whole", "store", "from", "one", "place."];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─────────────────────────────────────────────────────────────
   THEME TOGGLE BUTTON
   ───────────────────────────────────────────────────────────── */

function ThemeToggleButton() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next);
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      try {
        localStorage.setItem("retail_mart_theme", next ? "dark" : "light");
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <button
      type="button"
      id="themeBtn"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="absolute top-6 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--field-line)] bg-[var(--field)] text-[var(--ink-soft)] backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-[var(--brand)] hover:text-[var(--brand)] active:scale-95"
    >
      {isDark ? (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4.5 w-4.5 text-amber-400 transition-transform duration-300"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4.5 w-4.5 transition-transform duration-300"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────
   PARTICLE NETWORK CANVAS (LEFT PANEL)
   ───────────────────────────────────────────────────────────── */

function ParticleNetwork() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    let reduce = false;
    try {
      if (typeof window.matchMedia === "function") {
        reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      }
    } catch {
      /* jsdom safety */
    }
    if (reduce) return;

    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      /* jsdom does not support canvas getContext without node-canvas */
    }
    if (!ctx) return;

    let animationFrameId: number;
    let w = 0;
    let h = 0;
    const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);
    let pts: { x: number; y: number; vx: number; vy: number }[] = [];
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      if (!canvas || !parent) return;
      const r = parent.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.max(16, Math.min(50, Math.round((w * h) / 16000)));
      pts = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
      }));
    }

    const handleMouseMove = (e: globalThis.MouseEvent) => {
      const r = parent.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };

    const handleMouseLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    parent.addEventListener("mousemove", handleMouseMove);
    parent.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", resize);
    resize();

    function tick() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      for (const p of pts) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dmx = p.x - mouse.x;
        const dmy = p.y - mouse.y;
        const dm = Math.hypot(dmx, dmy);
        if (dm < 120 && dm > 0) {
          p.x += (dmx / dm) * 0.4;
          p.y += (dmy / dm) * 0.4;
        }
      }

      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 110) {
            ctx.strokeStyle = `rgba(180, 230, 205, ${(1 - d / 110) * 0.35})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
        ctx.fillStyle = "rgba(210, 245, 225, 0.65)";
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(tick);
    }

    tick();

    return () => {
      cancelAnimationFrame(animationFrameId);
      parent.removeEventListener("mousemove", handleMouseMove);
      parent.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} id="net" className="absolute inset-0 opacity-55 pointer-events-none" />;
}

/* ─────────────────────────────────────────────────────────────
   MAIN LOGIN PAGE
   ───────────────────────────────────────────────────────────── */

export default function LoginPage() {
  const { isAuthenticated, currentUser, isLoadingUser, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [cardShake, setCardShake] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);

  // 3D Tilt & Magnetic Button
  const cardRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const isTouchDevice = useRef(false);

  const isEmailValid = email.length > 0 && EMAIL_REGEX.test(email);
  const isEmailInvalid = emailTouched && email.length > 0 && !isEmailValid;

  useEffect(() => {
    try {
      if (typeof window.matchMedia === "function") {
        isTouchDevice.current = window.matchMedia("(hover: none)").matches;
      }
    } catch {
      /* jsdom safety */
    }

    try {
      const saved = localStorage.getItem("retail_mart_theme");
      if (saved === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else if (saved === "light") {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      } else if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Ambient mouse glow and 3D card tilt
  const handleSideMouseMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (isTouchDevice.current) return;
    try {
      if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }
    } catch {
      /* ignore */
    }

    const card = cardRef.current;
    if (!card) return;

    card.style.setProperty("--mx", `${e.clientX}px`);
    card.style.setProperty("--my", `${e.clientY}px`);

    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: dy * -3, y: dx * 3 });
  }, []);

  const handleSideMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 });
  }, []);

  // Magnetic button hover
  const handleBtnMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (isSubmitting || loginSuccess) return;
    try {
      if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        return;
      }
    } catch {
      /* ignore */
    }
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    setBtnPos({ x: x * 0.12, y: y * 0.28 });
  };

  const handleBtnMouseLeave = () => {
    setBtnPos({ x: 0, y: 0 });
  };

  // Button click ripple
  const createRipple = (e: ReactMouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget.getBoundingClientRect();
    const cx = e.clientX ? e.clientX - btn.left : btn.width / 2;
    const cy = e.clientY ? e.clientY - btn.top : btn.height / 2;
    const id = Date.now();
    const size = btn.width / 3;
    setRipples((prev) => [...prev, { id, x: cx - size / 2, y: cy - size / 2, size }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
  };

  // Keyboard CapsLock detection
  const handlePasswordKeyUp = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") {
      setCapsLockOn(e.getModifierState("CapsLock"));
    }
  };

  // Already signed in
  if (isAuthenticated) {
    if (isLoadingUser || !currentUser) return null;
    const requestedFrom = (location.state as LocationState | null)?.from?.pathname;
    return <Navigate to={getPostLoginRedirect(currentUser.role, requestedFrom)} replace />;
  }

  // Handle Form Submit
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailTouched(true);

    if (!email.trim() || !EMAIL_REGEX.test(email) || !password.trim()) {
      setCardShake(true);
      setTimeout(() => setCardShake(false), 450);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    setCardShake(false);

    try {
      const user = await login(email, password);
      if (!user) {
        setError("Invalid email or password.");
        setCardShake(true);
        setTimeout(() => setCardShake(false), 450);
        return;
      }
      setLoginSuccess(true);
      await new Promise((res) => setTimeout(res, 850));
      const requestedFrom = (location.state as LocationState | null)?.from?.pathname;
      navigate(getPostLoginRedirect(user.role, requestedFrom), { replace: true });
    } catch {
      setError("Couldn't reach the server. Is the backend running?");
      setCardShake(true);
      setTimeout(() => setCardShake(false), 450);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFillDemo() {
    setEmail(DEMO_CREDENTIALS.email);
    setPassword(DEMO_CREDENTIALS.password);
    setEmailTouched(true);
    setError(null);
    setNotice(null);
  }

  function handleForgotPassword() {
    setNotice("For security, please contact your system administrator at admin@retailmart.dev to reset credentials.");
  }

  return (
    <div className="relative grid min-h-screen w-full select-none overflow-hidden bg-[var(--paper)] text-[var(--ink)] font-sans grid-cols-1 md:grid-cols-[1.1fr_1fr]">

      {/* =========================================================
          LEFT: LIVING BRAND PANEL (DESKTOP)
          ========================================================= */}
      <div className="relative hidden md:flex flex-col justify-between overflow-hidden bg-[#08281c] p-11 text-[var(--panel-ink)] select-none">
        {/* Canvas Particle Network */}
        <ParticleNetwork />

        {/* Animated Gradient Mesh Blobs */}
        <div aria-hidden="true" className="pointer-events-none absolute -inset-[25%] opacity-85 filter blur-[70px] saturate-[1.3]">
          <span className="mesh-m1 absolute top-[-16%] left-[-12%] h-[52vmax] w-[52vmax] rounded-full bg-[radial-gradient(circle,#1fae7a,transparent_65%)] mix-blend-screen" />
          <span className="mesh-m2 absolute top-[8%] right-[-16%] h-[46vmax] w-[46vmax] rounded-full bg-[radial-gradient(circle,#3fd6c0,transparent_65%)] mix-blend-screen" />
          <span className="mesh-m3 absolute bottom-[-24%] left-[14%] h-[42vmax] w-[42vmax] rounded-full bg-[radial-gradient(circle,#0a6b4a,transparent_66%)] mix-blend-screen" />
        </div>

        {/* SVG Noise Grain Overlay */}
        <div aria-hidden="true" className="panel-grain" />

        {/* Top: Logo & Branding */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-white/20 bg-white/15 shadow-sm backdrop-blur-md transition-transform duration-300 hover:scale-105">
            <svg
              width="20"
              height="20"
              viewBox="0 0 32 32"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              <path d="M3 4.5h3.1a1.6 1.6 0 0 1 1.57 1.29L8.2 8.5" />
              <path d="M8.2 8.5h20l-2.4 9.9a2.2 2.2 0 0 1-2.14 1.68H11.6a2.2 2.2 0 0 1-2.16-1.79L7.1 6.8" />
              <circle cx="12.6" cy="26" r="2" />
              <circle cx="23.4" cy="26" r="2" />
            </svg>
          </div>
          <div>
            <h1 className="font-fraunces text-lg font-semibold tracking-tight text-white">Retail Mart</h1>
            <div className="text-[10.5px] font-bold tracking-[0.1em] text-[#b9d9c9]">ADMIN CONSOLE</div>
          </div>
        </div>

        {/* Middle: Animated Headline & Subtitle */}
        <div className="relative z-10 my-auto py-8">
          <h2 className="font-fraunces mb-4 max-w-[12ch] text-4xl font-semibold leading-[1.14] tracking-[-0.01em] text-white">
            {HEADLINE_WORDS.map((word, i) => (
              <span
                key={word + i}
                className="inline-block opacity-0"
                style={{
                  animation: `wordIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) ${0.15 + i * 0.07}s forwards`,
                }}
              >
                {word}&nbsp;
              </span>
            ))}
          </h2>
          <p
            className="max-w-[38ch] text-[14.5px] leading-relaxed text-[#c7e4d5] opacity-0"
            style={{
              animation: "wordIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) 0.6s forwards",
            }}
          >
            Inventory, orders, catalog and fulfillment — live, in one operations console built for speed.
          </p>
        </div>

        {/* Bottom: Operational Badges */}
        <div className="relative z-10 flex flex-wrap gap-8 text-[var(--panel-ink)]">
          <div className="stat opacity-0" style={{ animation: "wordIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.75s forwards" }}>
            <b className="font-fraunces flex items-center text-2xl font-semibold text-white">
              <span className="live-dot" /> Live
            </b>
            <span className="text-[11.5px] text-[#a9cdbb]">Operations Engine</span>
          </div>

          <div className="stat opacity-0" style={{ animation: "wordIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.83s forwards" }}>
            <b className="font-fraunces text-2xl font-semibold text-white">Real-time</b>
            <span className="text-[11.5px] text-[#a9cdbb]">Sync & Fulfillment</span>
          </div>

          <div className="stat opacity-0" style={{ animation: "wordIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.91s forwards" }}>
            <b className="font-fraunces text-2xl font-semibold text-white">99.98%</b>
            <span className="text-[11.5px] text-[#a9cdbb]">Console Uptime</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          RIGHT: FORM AREA
          ========================================================= */}
      <div
        className="relative flex min-h-screen items-center justify-center overflow-hidden p-6 sm:p-8"
        onMouseMove={handleSideMouseMove}
        onMouseLeave={handleSideMouseLeave}
      >
        {/* Ambient background glows */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <span className="side-sg1 absolute top-[-10%] right-[-10%] h-[34vw] w-[34vw] rounded-full bg-[radial-gradient(circle,var(--mint),transparent_65%)] filter blur-[70px] opacity-35 dark:opacity-20" />
          <span className="side-sg2 absolute bottom-[-10%] left-[-8%] h-[28vw] w-[28vw] rounded-full bg-[radial-gradient(circle,var(--brand),transparent_65%)] filter blur-[70px] opacity-35 dark:opacity-20" />
        </div>

        {/* SVG Noise Grain Overlay */}
        <div aria-hidden="true" className="side-grain" />

        {/* Theme Toggle Button */}
        <ThemeToggleButton />

        {/* Form Wrap / Card */}
        <div
          ref={cardRef}
          className={`relative z-10 w-full max-w-[390px] rounded-3xl border border-white/60 bg-[var(--card)] p-7 sm:p-8 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] ${
            cardShake ? "ref-shake" : ""
          }`}
          style={{
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: "transform 120ms linear",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Mobile Brand Header (shown on small screens) */}
          <div className="mb-6 block text-center md:hidden">
            <div className="mx-auto mb-3 flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--mint)] to-[var(--brand)] text-white shadow-lg shadow-emerald-700/20">
              <svg
                width="24"
                height="24"
                viewBox="0 0 32 32"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 4.5h3.1a1.6 1.6 0 0 1 1.57 1.29L8.2 8.5" />
                <path d="M8.2 8.5h20l-2.4 9.9a2.2 2.2 0 0 1-2.14 1.68H11.6a2.2 2.2 0 0 1-2.16-1.79L7.1 6.8" />
                <circle cx="12.6" cy="26" r="2" />
                <circle cx="23.4" cy="26" r="2" />
              </svg>
            </div>
            <h1 className="font-fraunces text-2xl font-bold tracking-tight text-[var(--ink)]">Retail Mart Admin</h1>
          </div>

          {/* Header */}
          <div className="rise-in d1 mb-6">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-bold tracking-wider text-[var(--brand)]">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                className="animate-wave"
              >
                <path d="M8 13c1 1.5 2.5 2 4 2s3-.5 4-2M9 9h.01M15 9h.01" />
                <circle cx="12" cy="12" r="9" />
              </svg>
              <span>Welcome back</span>
            </div>
            <h2 className="font-fraunces text-[26px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
              Sign in to continue
            </h2>
            <p className="mt-1 text-sm text-[var(--ink-soft)]">Sign in to the operations console.</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <div className="rise-in d2">
              <div
                className={`ref-field ${email.length > 0 ? "has-val" : ""} ${
                  isEmailValid ? "valid" : isEmailInvalid ? "invalid" : ""
                }`}
              >
                <input
                  id="email"
                  type="email"
                  placeholder=" "
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  onBlur={() => setEmailTouched(true)}
                  onFocus={() => setEmailTouched(false)}
                />
                <label htmlFor="email">Email</label>

                {/* Mail icon */}
                <span className="ico" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
                    <path d="m3 7 9 6 9-6" />
                  </svg>
                </span>

                {/* Check icon on valid */}
                <svg
                  className="ref-check-ico"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>

                {/* Focus underline */}
                <span className="under" aria-hidden="true" />
              </div>

              {/* Email validation message */}
              <div className={`ref-msg ${isEmailInvalid ? "show" : ""}`}>
                {isEmailInvalid ? "Enter a valid email address" : ""}
              </div>
            </div>

            {/* Password Field */}
            <div className="rise-in d3">
              <div className={`ref-field ${password.length > 0 ? "has-val" : ""}`}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyUp={handlePasswordKeyUp}
                  onBlur={() => setCapsLockOn(false)}
                />
                <label htmlFor="password">Password</label>

                {/* Toggle password visibility */}
                <button
                  id="peek"
                  type="button"
                  aria-label={showPassword ? "Hide secret" : "Reveal secret"}
                  onClick={() => setShowPassword(!showPassword)}
                  className="ico"
                  style={{ color: showPassword ? "var(--brand)" : undefined }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                      <line x1="3" y1="3" x2="21" y2="21" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" />
                      <circle cx="12" cy="12" r="2.6" />
                    </svg>
                  )}
                </button>

                {/* Focus underline */}
                <span className="under" aria-hidden="true" />
              </div>

              {/* CapsLock warning */}
              <div className={`ref-capslock ${capsLockOn ? "show" : ""}`}>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3 2 12h5v9h10v-9h5z" />
                </svg>
                <span>Caps Lock is on</span>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="rise-in d4 flex items-center justify-between my-3 text-[13.5px]">
              <label className="flex cursor-pointer items-center gap-2 text-[var(--ink-soft)] select-none">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded accent-[var(--brand)] cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="font-semibold text-[var(--brand)] transition-opacity hover:opacity-80 hover:underline"
              >
                Forgot password?
              </button>
            </div>

            {/* Notice Message */}
            {notice && (
              <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 p-3 text-xs font-medium text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-300">
                {notice}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                role="alert"
                className="mb-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-4 w-4 shrink-0 text-rose-500"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Sign In Button */}
            <div
              className="rise-in d5 relative"
              onMouseMove={handleBtnMouseMove}
              onMouseLeave={handleBtnMouseLeave}
            >
              <button
                ref={btnRef}
                id="signin"
                type="submit"
                disabled={isSubmitting}
                onClick={createRipple}
                data-state={loginSuccess ? "done" : isSubmitting ? "loading" : undefined}
                className="ref-btn"
                style={{
                  transform:
                    isSubmitting || loginSuccess ? undefined : `translate(${btnPos.x}px, ${btnPos.y}px)`,
                }}
              >
                {/* Dynamic ripple spans */}
                {ripples.map((r) => (
                  <span
                    key={r.id}
                    className="ref-ripple"
                    style={{
                      width: r.size,
                      height: r.size,
                      left: r.x,
                      top: r.y,
                    }}
                  />
                ))}

                {/* Normal label */}
                <span className="lbl">
                  Sign in
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    className="transition-transform duration-200"
                  >
                    <path d="M5 12h13m-5-5 5 5-5 5" />
                  </svg>
                </span>

                {/* Spinner */}
                <span className="spin" aria-hidden="true" />

                {/* Checkmark tick */}
                <svg
                  className="tick"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12.5 4.5 4.5L19 7.5" />
                </svg>

                {/* Success bottom progress bar */}
                <span className="prog" aria-hidden="true" />
              </button>
            </div>

            {/* Demo autofill */}
            <div className="mt-3.5 text-center">
              <button
                type="button"
                onClick={handleFillDemo}
                className="text-[11.5px] font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--brand)] hover:underline"
              >
                Auto-fill demo credentials ({DEMO_CREDENTIALS.email})
              </button>
            </div>
          </form>

          {/* Trust Indicators Footer */}
          <div className="rise-in d7 mt-6 flex items-center justify-center gap-4 text-[11px] text-[var(--ink-soft)] border-t border-[var(--field-line)] pt-4">
            <span className="flex items-center gap-1.5">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <rect x="4" y="10" width="16" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Encrypted
            </span>
            <span>&middot;</span>
            <span className="flex items-center gap-1.5">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              SOC 2
            </span>
            <span>&middot;</span>
            <span className="flex items-center gap-1.5">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 3" />
              </svg>
              99.98% uptime
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
