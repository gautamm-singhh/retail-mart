import {
  FormEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/features/auth/useAuth";
import { getPostLoginRedirect } from "@/features/auth/postLoginRedirect";
import { ApiError } from "@/services/api/client";
import { ROUTES } from "@/constants/routes";
import type { Role } from "@/types";

interface LocationState {
  from?: { pathname: string };
}

type AuthMode = "login" | "signup";
type LoginTab = "otp" | "password";
type OtpStep = "phone" | "code";
type BtnState = "idle" | "loading" | "done";

const HEADLINE_WORDS = ["SHOP", "SMARTER.", "LIVE", "BETTER."];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
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
      /* jsdom safety */
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
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
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

  return <canvas ref={canvasRef} id="customer-net" className="absolute inset-0 opacity-55 pointer-events-none" />;
}

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
        localStorage.setItem("rm-theme", next ? "dark" : "light");
      } catch {
        /* ignore */
      }
    }
  };

  return (
    <button
      type="button"
      id="customer-theme-toggle"
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
   MAIN CUSTOMER AUTHENTICATION PAGE
   ───────────────────────────────────────────────────────────── */

interface CustomerLoginPageProps {
  initialMode?: AuthMode;
}

export default function CustomerLoginPage({ initialMode }: CustomerLoginPageProps) {
  const { isAuthenticated, currentUser, isLoadingUser, login, signup, requestOtp, verifyOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode detection from props, location pathname or query param
  const currentPath = location.pathname;
  const isSignupPath = currentPath === ROUTES.signup || currentPath === "/signup";
  const searchParams = new URLSearchParams(location.search);
  const isSignupQuery = searchParams.get("mode") === "signup";

  const resolvedInitialMode: AuthMode = initialMode || (isSignupPath || isSignupQuery ? "signup" : "login");
  const [mode, setMode] = useState<AuthMode>(resolvedInitialMode);

  // Sync mode when router pathname changes
  useEffect(() => {
    if (isSignupPath) {
      setMode("signup");
    } else if (currentPath === ROUTES.shopLogin || currentPath === ROUTES.root || currentPath === ROUTES.login) {
      if (!isSignupQuery) {
        setMode("login");
      }
    }
  }, [currentPath, isSignupPath, isSignupQuery]);

  // Login form state
  const [loginTab, setLoginTab] = useState<LoginTab>("otp");
  const [otpStep, setOtpStep] = useState<OtpStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [nameForOtp, setNameForOtp] = useState("");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginEmailTouched, setLoginEmailTouched] = useState(false);
  const [loginCapsLock, setLoginCapsLock] = useState(false);

  // Signup form state
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupEmailTouched, setSignupEmailTouched] = useState(false);
  const [signupCapsLock, setSignupCapsLock] = useState(false);

  // Shared UI / submission state
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [btnState, setBtnState] = useState<BtnState>("idle");
  const [cardShake, setCardShake] = useState(false);

  // 3D Tilt & Magnetic Button
  const cardRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [btnPos, setBtnPos] = useState({ x: 0, y: 0 });
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number; size: number }[]>([]);
  const isTouchDevice = useRef(false);

  // Validation helpers
  const isLoginEmailValid = loginEmail.length > 0 && EMAIL_REGEX.test(loginEmail);
  const isLoginEmailInvalid = loginEmailTouched && loginEmail.length > 0 && !isLoginEmailValid;

  const isSignupEmailValid = signupEmail.length > 0 && EMAIL_REGEX.test(signupEmail);
  const isSignupEmailInvalid = signupEmailTouched && signupEmail.length > 0 && !isSignupEmailValid;

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
        isTouchDevice.current = window.matchMedia("(hover: none)").matches;
      }
    } catch {
      /* ignore */
    }

    try {
      const saved = localStorage.getItem("retail_mart_theme") || localStorage.getItem("rm-theme");
      if (saved === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else if (saved === "light") {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      } else if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      }
    } catch {
      /* ignore */
    }
  }, []);

  const triggerShake = () => {
    setCardShake(true);
    setTimeout(() => setCardShake(false), 450);
  };

  // Ambient mouse glow and 3D card tilt
  const handleSideMouseMove = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (isTouchDevice.current) return;
    try {
      if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
    if (isSubmitting || btnState === "done") return;
    try {
      if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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

  // Redirect handling
  function redirectAfterAuth(role: Role) {
    const requestedFrom = (location.state as LocationState | null)?.from?.pathname;
    navigate(getPostLoginRedirect(role, requestedFrom), { replace: true });
  }

  // Already authenticated guard
  if (isAuthenticated) {
    if (isLoadingUser || !currentUser) return null;
    const requestedFrom = (location.state as LocationState | null)?.from?.pathname;
    return <Navigate to={getPostLoginRedirect(currentUser.role, requestedFrom)} replace />;
  }

  // Switch between Login and Signup modes
  const handleSwitchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setBtnState("idle");
    if (newMode === "signup") {
      navigate(ROUTES.signup, { replace: false });
    } else {
      navigate(ROUTES.shopLogin, { replace: false });
    }
  };

  // Submit Handlers
  async function handlePasswordLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginEmailTouched(true);
    if (!loginEmail.trim() || !EMAIL_REGEX.test(loginEmail) || !loginPassword.trim()) {
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    setBtnState("loading");
    setError(null);

    try {
      const user = await login(loginEmail, loginPassword);
      if (!user) {
        setError("Invalid email or password.");
        setBtnState("idle");
        triggerShake();
        return;
      }
      setBtnState("done");
      setTimeout(() => redirectAfterAuth(user.role), 900);
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setBtnState("idle");
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSendOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phone.trim()) {
      triggerShake();
      return;
    }
    setIsSubmitting(true);
    setBtnState("loading");
    setError(null);

    try {
      await requestOtp(phone);
      setBtnState("done");
      setTimeout(() => {
        setOtpStep("code");
        setBtnState("idle");
      }, 700);
    } catch {
      setError("Couldn't send a code to that number. Please try again.");
      setBtnState("idle");
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!code.trim()) {
      triggerShake();
      return;
    }
    setIsSubmitting(true);
    setBtnState("loading");
    setError(null);

    try {
      await verifyOtp(phone, code, nameForOtp || undefined);
      setBtnState("done");
      setTimeout(() => redirectAfterAuth("Customer"), 900);
    } catch {
      setError("That code is invalid or has expired. Please request a new one.");
      setBtnState("idle");
      triggerShake();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupEmailTouched(true);
    if (!signupName.trim() || !signupEmail.trim() || !EMAIL_REGEX.test(signupEmail) || !signupPassword.trim()) {
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    setBtnState("loading");
    setError(null);

    try {
      await signup({
        name: signupName,
        email: signupEmail,
        password: signupPassword,
        phone: signupPhone || undefined,
      });
      setBtnState("done");
      setTimeout(() => {
        const requestedFrom = (location.state as LocationState | null)?.from?.pathname;
        navigate(requestedFrom || ROUTES.shop, { replace: true });
      }, 900);
    } catch (err) {
      setBtnState("idle");
      triggerShake();
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Couldn't reach the server. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative grid min-h-screen w-full select-none overflow-hidden bg-[var(--paper)] text-[var(--ink)] font-sans grid-cols-1 md:grid-cols-[1.1fr_1fr]">

      {/* =========================================================
          LEFT: LIVING BRAND PANEL (CUSTOMER EXPERIENCE)
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

        {/* Top: Retail Mart Customer Branding */}
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
              aria-hidden="true"
            >
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
          </div>
          <div>
            <h1 className="font-fraunces text-lg font-semibold tracking-tight text-white">Retail Mart</h1>
            <div className="text-[10.5px] font-bold tracking-[0.1em] text-[#b9d9c9]">STOREFRONT &amp; SHOPPING</div>
          </div>
        </div>

        {/* Middle: Animated Customer Headline */}
        <div className="relative z-10 my-auto py-8">
          <h2 className="font-fraunces mb-4 max-w-[14ch] text-4xl font-semibold leading-[1.14] tracking-[-0.01em] text-white">
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
            className="max-w-[40ch] text-[14.5px] leading-relaxed text-[#c7e4d5] opacity-0"
            style={{
              animation: "wordIn 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) 0.55s forwards",
            }}
          >
            Discover products, track orders, and enjoy a better way to shop.
          </p>
        </div>

        {/* Bottom: Customer Proof Points / Highlights */}
        <div className="relative z-10 flex flex-wrap gap-8 text-[var(--panel-ink)]">
          <div className="stat opacity-0" style={{ animation: "wordIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.75s forwards" }}>
            <b className="font-fraunces flex items-center text-2xl font-semibold text-white">
              <span className="live-dot" /> 10,000+
            </b>
            <span className="text-[11.5px] text-[#a9cdbb]">Curated Products</span>
          </div>

          <div className="stat opacity-0" style={{ animation: "wordIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.83s forwards" }}>
            <b className="font-fraunces text-2xl font-semibold text-white">Fast &amp; Free</b>
            <span className="text-[11.5px] text-[#a9cdbb]">Delivery Available</span>
          </div>

          <div className="stat opacity-0" style={{ animation: "wordIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) 0.91s forwards" }}>
            <b className="font-fraunces text-2xl font-semibold text-white">4.9 ★</b>
            <span className="text-[11.5px] text-[#a9cdbb]">Customer Rating</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          RIGHT: CUSTOMER AUTHENTICATION AREA
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
          className={`relative z-10 w-full max-w-[420px] rounded-3xl border border-white/60 bg-[var(--card)] p-7 sm:p-8 shadow-xl backdrop-blur-xl dark:border-slate-800/80 dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] transition-[height,transform] duration-300 ${
            cardShake ? "ref-shake" : ""
          }`}
          style={{
            transform: `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transition: "transform 120ms linear",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Top Logo RM */}
          <div className="flex flex-col items-center gap-3 mb-5">
            <div
              id="customer-rm-logo"
              className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--mint)] to-[var(--brand)] font-fraunces text-xl font-bold text-white shadow-lg shadow-emerald-700/20 overflow-hidden animate-logo-float transition-transform duration-300 hover:scale-105"
            >
              RM
              <span
                aria-hidden="true"
                className="absolute top-0 -left-[80%] h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none animate-shine"
              />
            </div>

            {/* Mode Titles */}
            <div className="text-center">
              {mode === "login" ? (
                <>
                  <h1 className="font-fraunces text-[24px] sm:text-[26px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
                    Sign in to Retail Mart
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-[var(--ink-soft)]">
                    Shop the best deals, track your orders, and more.
                  </p>
                </>
              ) : (
                <>
                  <h1 className="font-fraunces text-[24px] sm:text-[26px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
                    Create your account
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-[var(--ink-soft)]">
                    Join Retail Mart to shop, track orders, and manage your account.
                  </p>
                </>
              )}
            </div>
          </div>



          {/* =========================================================
              SIGN IN FORM
              ========================================================= */}
          {mode === "login" && (
            <div key="login-form-container" className="animate-form-in">
              {/* Login Method Sub-Tabs: Mobile OTP vs Email & Password */}
              <div className="mb-4 flex gap-2">
                <button
                  type="button"
                  id="tab-otp"
                  aria-pressed={loginTab === "otp"}
                  onClick={() => {
                    setLoginTab("otp");
                    setError(null);
                    setBtnState("idle");
                    setOtpStep("phone");
                  }}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all duration-200 ${
                    loginTab === "otp"
                      ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                      : "border-[var(--field-line)] bg-[var(--field)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
                  }`}
                >
                  Mobile OTP
                </button>
                <button
                  type="button"
                  id="tab-password"
                  aria-pressed={loginTab === "password"}
                  onClick={() => {
                    setLoginTab("password");
                    setError(null);
                    setBtnState("idle");
                  }}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition-all duration-200 ${
                    loginTab === "password"
                      ? "border-[var(--brand)] bg-[var(--brand)]/10 text-[var(--brand)]"
                      : "border-[var(--field-line)] bg-[var(--field)] text-[var(--ink-soft)] hover:text-[var(--ink)]"
                  }`}
                >
                  Email &amp; Password
                </button>
              </div>

              {/* Mobile OTP Flow */}
              {loginTab === "otp" && (
                <div>
                  {otpStep === "phone" ? (
                    <form onSubmit={handleSendOtp} noValidate>
                      <div className="ref-field has-val">
                        <input
                          id="cl-phone"
                          type="tel"
                          placeholder=" "
                          autoComplete="tel"
                          required
                          value={phone}
                          onChange={(e) => {
                            setPhone(e.target.value);
                            if (error) setError(null);
                          }}
                        />
                        <label htmlFor="cl-phone">Mobile number</label>
                        <span className="ico" aria-hidden="true">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                            <line x1="12" y1="18" x2="12.01" y2="18" />
                          </svg>
                        </span>
                        <span className="under" aria-hidden="true" />
                      </div>

                      {error && (
                        <div
                          role="alert"
                          className="my-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-rose-500">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          <span>{error}</span>
                        </div>
                      )}

                      {/* Send OTP button */}
                      <div
                        className="relative mt-2"
                        onMouseMove={handleBtnMouseMove}
                        onMouseLeave={handleBtnMouseLeave}
                      >
                        <button
                          ref={btnRef}
                          id="cl-send-otp-btn"
                          type="submit"
                          disabled={isSubmitting}
                          onClick={createRipple}
                          data-state={btnState === "done" ? "done" : isSubmitting ? "loading" : undefined}
                          className="ref-btn"
                          style={{
                            transform:
                              isSubmitting || btnState === "done" ? undefined : `translate(${btnPos.x}px, ${btnPos.y}px)`,
                          }}
                        >
                          {ripples.map((r) => (
                            <span
                              key={r.id}
                              className="ref-ripple"
                              style={{ width: r.size, height: r.size, left: r.x, top: r.y }}
                            />
                          ))}
                          <span className="lbl">
                            Send OTP
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                              <path d="M5 12h13m-5-5 5 5-5 5" />
                            </svg>
                          </span>
                          <span className="spin" aria-hidden="true" />
                          <svg className="tick" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m5 12.5 4.5 4.5L19 7.5" />
                          </svg>
                          <span className="prog" aria-hidden="true" />
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyOtp} noValidate>
                      <p className="mb-3 text-xs text-[var(--ink-soft)]">
                        Enter the 6-digit code sent to <strong className="text-[var(--ink)]">{phone}</strong>
                      </p>

                      <div className="ref-field has-val">
                        <input
                          id="cl-otp-code"
                          type="text"
                          placeholder=" "
                          autoComplete="one-time-code"
                          required
                          value={code}
                          onChange={(e) => {
                            setCode(e.target.value);
                            if (error) setError(null);
                          }}
                        />
                        <label htmlFor="cl-otp-code">OTP code</label>
                        <span className="under" aria-hidden="true" />
                      </div>

                      <div className="ref-field has-val">
                        <input
                          id="cl-otp-name"
                          type="text"
                          placeholder=" "
                          value={nameForOtp}
                          onChange={(e) => setNameForOtp(e.target.value)}
                        />
                        <label htmlFor="cl-otp-name">Name (only needed for new accounts)</label>
                        <span className="under" aria-hidden="true" />
                      </div>

                      {error && (
                        <div
                          role="alert"
                          className="my-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-rose-500">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                          </svg>
                          <span>{error}</span>
                        </div>
                      )}

                      <div
                        className="relative mt-2"
                        onMouseMove={handleBtnMouseMove}
                        onMouseLeave={handleBtnMouseLeave}
                      >
                        <button
                          ref={btnRef}
                          id="cl-verify-otp-btn"
                          type="submit"
                          disabled={isSubmitting}
                          onClick={createRipple}
                          data-state={btnState === "done" ? "done" : isSubmitting ? "loading" : undefined}
                          className="ref-btn"
                          style={{
                            transform:
                              isSubmitting || btnState === "done" ? undefined : `translate(${btnPos.x}px, ${btnPos.y}px)`,
                          }}
                        >
                          {ripples.map((r) => (
                            <span
                              key={r.id}
                              className="ref-ripple"
                              style={{ width: r.size, height: r.size, left: r.x, top: r.y }}
                            />
                          ))}
                          <span className="lbl">
                            Verify &amp; Continue
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                              <path d="M5 12h13m-5-5 5 5-5 5" />
                            </svg>
                          </span>
                          <span className="spin" aria-hidden="true" />
                          <svg className="tick" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m5 12.5 4.5 4.5L19 7.5" />
                          </svg>
                          <span className="prog" aria-hidden="true" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setOtpStep("phone");
                          setError(null);
                          setBtnState("idle");
                        }}
                        className="mt-3 block w-full text-center text-xs font-semibold text-[var(--brand)] hover:underline"
                      >
                        Use a different number
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Email & Password Flow */}
              {loginTab === "password" && (
                <form onSubmit={handlePasswordLogin} noValidate>
                  {/* Email Field */}
                  <div>
                    <div
                      className={`ref-field ${loginEmail.length > 0 ? "has-val" : ""} ${
                        isLoginEmailValid ? "valid" : isLoginEmailInvalid ? "invalid" : ""
                      }`}
                    >
                      <input
                        id="cl-email"
                        type="email"
                        placeholder=" "
                        autoComplete="username"
                        required
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (error) setError(null);
                        }}
                        onBlur={() => setLoginEmailTouched(true)}
                        onFocus={() => setLoginEmailTouched(false)}
                      />
                      <label htmlFor="cl-email">Email</label>

                      <span className="ico" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
                          <path d="m3 7 9 6 9-6" />
                        </svg>
                      </span>

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
                      <span className="under" aria-hidden="true" />
                    </div>

                    <div className={`ref-msg ${isLoginEmailInvalid ? "show" : ""}`}>
                      {isLoginEmailInvalid ? "Enter a valid email address." : ""}
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className={`ref-field ${loginPassword.length > 0 ? "has-val" : ""}`}>
                      <input
                        id="cl-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder=" "
                        autoComplete="current-password"
                        required
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        onKeyUp={(e: ReactKeyboardEvent<HTMLInputElement>) => {
                          if (typeof e.getModifierState === "function") {
                            setLoginCapsLock(e.getModifierState("CapsLock"));
                          }
                        }}
                        onBlur={() => setLoginCapsLock(false)}
                      />
                      <label htmlFor="cl-password">Password</label>

                      <button
                        id="peek"
                        type="button"
                        aria-label={showLoginPassword ? "Hide password" : "Show password"}
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="ico"
                        style={{ color: showLoginPassword ? "var(--brand)" : undefined }}
                      >
                        {showLoginPassword ? (
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
                      <span className="under" aria-hidden="true" />
                    </div>

                    <div className={`ref-capslock ${loginCapsLock ? "show" : ""}`}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3 2 12h5v9h10v-9h5z" />
                      </svg>
                      <span>Caps Lock is on</span>
                    </div>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="my-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-rose-500">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Sign In Button */}
                  <div
                    className="relative mt-2"
                    onMouseMove={handleBtnMouseMove}
                    onMouseLeave={handleBtnMouseLeave}
                  >
                    <button
                      ref={btnRef}
                      id="cl-signin-btn"
                      type="submit"
                      disabled={isSubmitting}
                      onClick={createRipple}
                      data-state={btnState === "done" ? "done" : isSubmitting ? "loading" : undefined}
                      className="ref-btn"
                      style={{
                        transform:
                          isSubmitting || btnState === "done" ? undefined : `translate(${btnPos.x}px, ${btnPos.y}px)`,
                      }}
                    >
                      {ripples.map((r) => (
                        <span
                          key={r.id}
                          className="ref-ripple"
                          style={{ width: r.size, height: r.size, left: r.x, top: r.y }}
                        />
                      ))}
                      <span className="lbl">
                        Sign In
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                          <path d="M5 12h13m-5-5 5 5-5 5" />
                        </svg>
                      </span>
                      <span className="spin" aria-hidden="true" />
                      <svg className="tick" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                      <span className="prog" aria-hidden="true" />
                    </button>
                  </div>
                </form>
              )}

              {/* Transition to Signup */}
              <p className="mt-5 text-center text-xs sm:text-sm text-[var(--ink-soft)]">
                New here?{" "}
                <Link
                  to={ROUTES.signup}
                  id="cl-create-account-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSwitchMode("signup");
                  }}
                  className="font-semibold text-[var(--brand)] hover:underline inline-flex items-center gap-1"
                >
                  Create an account
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </p>
            </div>
          )}

          {/* =========================================================
              CREATE ACCOUNT FORM
              ========================================================= */}
          {mode === "signup" && (
            <div key="signup-form-container" className="animate-form-in">
              <form onSubmit={handleSignup} noValidate>
                {/* Full name */}
                <div className="ref-field has-val">
                  <input
                    id="su-name"
                    type="text"
                    placeholder=" "
                    autoComplete="name"
                    required
                    value={signupName}
                    onChange={(e) => {
                      setSignupName(e.target.value);
                      if (error) setError(null);
                    }}
                  />
                  <label htmlFor="su-name">Full name</label>
                  <span className="under" aria-hidden="true" />
                </div>

                {/* Email */}
                <div>
                  <div
                    className={`ref-field ${signupEmail.length > 0 ? "has-val" : ""} ${
                      isSignupEmailValid ? "valid" : isSignupEmailInvalid ? "invalid" : ""
                    }`}
                  >
                    <input
                      id="su-email"
                      type="email"
                      placeholder=" "
                      autoComplete="email"
                      required
                      value={signupEmail}
                      onChange={(e) => {
                        setSignupEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      onBlur={() => setSignupEmailTouched(true)}
                      onFocus={() => setSignupEmailTouched(false)}
                    />
                    <label htmlFor="su-email">Email</label>

                    <span className="ico" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2.5" y="4.5" width="19" height="15" rx="3" />
                        <path d="m3 7 9 6 9-6" />
                      </svg>
                    </span>

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
                    <span className="under" aria-hidden="true" />
                  </div>

                  <div className={`ref-msg ${isSignupEmailInvalid ? "show" : ""}`}>
                    {isSignupEmailInvalid ? "Enter a valid email address." : ""}
                  </div>
                </div>

                {/* Mobile number (optional) */}
                <div className="ref-field has-val">
                  <input
                    id="su-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    autoComplete="tel"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                  />
                  <label htmlFor="su-phone">Mobile number (optional)</label>
                  <span className="under" aria-hidden="true" />
                </div>

                {/* Password */}
                <div>
                  <div className={`ref-field ${signupPassword.length > 0 ? "has-val" : ""}`}>
                    <input
                      id="su-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      autoComplete="new-password"
                      required
                      value={signupPassword}
                      onChange={(e) => {
                        setSignupPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      onKeyUp={(e: ReactKeyboardEvent<HTMLInputElement>) => {
                        if (typeof e.getModifierState === "function") {
                          setSignupCapsLock(e.getModifierState("CapsLock"));
                        }
                      }}
                      onBlur={() => setSignupCapsLock(false)}
                    />
                    <label htmlFor="su-password">Password</label>

                    <button
                      id="su-peek"
                      type="button"
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="ico"
                      style={{ color: showSignupPassword ? "var(--brand)" : undefined }}
                    >
                      {showSignupPassword ? (
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
                    <span className="under" aria-hidden="true" />
                  </div>

                  <div className={`ref-capslock ${signupCapsLock ? "show" : ""}`}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3 2 12h5v9h10v-9h5z" />
                    </svg>
                    <span>Caps Lock is on</span>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="my-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 shrink-0 text-rose-500">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Create Account Button */}
                <div
                  className="relative mt-2"
                  onMouseMove={handleBtnMouseMove}
                  onMouseLeave={handleBtnMouseLeave}
                >
                  <button
                    ref={btnRef}
                    id="su-submit-btn"
                    type="submit"
                    disabled={isSubmitting}
                    onClick={createRipple}
                    data-state={btnState === "done" ? "done" : isSubmitting ? "loading" : undefined}
                    className="ref-btn"
                    style={{
                      transform:
                        isSubmitting || btnState === "done" ? undefined : `translate(${btnPos.x}px, ${btnPos.y}px)`,
                    }}
                  >
                    {ripples.map((r) => (
                      <span
                        key={r.id}
                        className="ref-ripple"
                        style={{ width: r.size, height: r.size, left: r.x, top: r.y }}
                      />
                    ))}
                    <span className="lbl">
                      Create Account
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M5 12h13m-5-5 5 5-5 5" />
                      </svg>
                    </span>
                    <span className="spin" aria-hidden="true" />
                    <svg className="tick" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                    <span className="prog" aria-hidden="true" />
                  </button>
                </div>
              </form>

              {/* Transition to Sign In */}
              <p className="mt-5 text-center text-xs sm:text-sm text-[var(--ink-soft)]">
                Already have an account?{" "}
                <Link
                  to={ROUTES.shopLogin}
                  id="su-signin-link"
                  onClick={(e) => {
                    e.preventDefault();
                    handleSwitchMode("login");
                  }}
                  className="font-semibold text-[var(--brand)] hover:underline inline-flex items-center gap-1"
                >
                  Sign in
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </p>
            </div>
          )}

          {/* Trust Indicators Footer */}
          <div className="rise-in d7 mt-6 flex items-center justify-center gap-4 text-[11px] text-[var(--ink-soft)] border-t border-[var(--field-line)] pt-4">
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <rect x="4" y="10" width="16" height="10" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              Encrypted
            </span>
            <span>&middot;</span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="m5 12.5 4.5 4.5L19 7.5" />
              </svg>
              SOC 2
            </span>
            <span>&middot;</span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
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
