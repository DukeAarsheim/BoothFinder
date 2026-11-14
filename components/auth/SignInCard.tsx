"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Info, LoaderCircle } from "lucide-react";
import { SIGN_IN_ROLES, type SignInRole } from "@/lib/auth/roles";

type Method = "google" | "password";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700";

const providerButton = `flex h-12 w-full items-center justify-center gap-3 rounded-xl text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${focusRing}`;

const input = `h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-[15px] text-neutral-950 placeholder:text-neutral-400 transition-[border-color,box-shadow] hover:border-neutral-400 focus:border-emerald-700 focus:ring-3 focus:ring-emerald-700/15 focus:outline-none`;

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.46a5.52 5.52 0 0 1-2.4 3.62v3.01h3.88c2.27-2.09 3.58-5.17 3.58-8.82z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.28a7.21 7.21 0 0 1 0-4.56V6.61H1.27a12 12 0 0 0 0 10.78l4.01-3.11z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  );
}

/**
 * Sign-in step shown after the visitor picks a side on /start.
 *
 * DEMO ONLY: accounts are out of scope this weekend (MASTER.md §2), so no
 * option authenticates anyone and nothing typed here is sent or stored. Every
 * option simply continues to the chosen side of the app.
 */
export default function SignInCard({ role }: { role: SignInRole }) {
  const router = useRouter();
  const { label, heading, blurb, destination } = SIGN_IN_ROLES[role];
  const [pending, setPending] = useState<Method | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  function continueWith(method: Method) {
    setPending(method);
    router.push(destination);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    continueWith("password");
  }

  const busy = pending !== null;

  return (
    <div className="w-full max-w-[420px]">
      <Link
        href="/start"
        className={`inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-950 ${focusRing}`}
      >
        <ArrowLeft className="size-4" aria-hidden />
        Change role
      </Link>

      <section
        aria-labelledby="signin-heading"
        className="mt-4 rounded-3xl border border-neutral-200 bg-white p-7 shadow-[0_8px_30px_rgb(0_0_0/0.06)] sm:p-9"
      >
        <p className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-800 uppercase">
          {label}
        </p>
        <h1
          id="signin-heading"
          className="mt-4 text-[26px] leading-tight font-semibold tracking-tight text-neutral-950"
        >
          {heading}
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-600">{blurb}</p>

        <div className="mt-7 space-y-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => continueWith("google")}
            className={`${providerButton} border border-neutral-300 bg-white text-neutral-950 hover:border-neutral-400 hover:bg-neutral-50`}
          >
            {pending === "google" ? <Spinner /> : <GoogleLogo />}
            Continue with Google
          </button>
        </div>

        <div className="my-6 flex items-center gap-4" role="separator">
          <span className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs font-medium tracking-wide text-neutral-400 uppercase">or</span>
          <span className="h-px flex-1 bg-neutral-200" />
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="signin-username" className="text-sm font-medium text-neutral-800">
              Username
            </label>
            <input
              id="signin-username"
              name="username"
              type="text"
              required
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="yourbrand"
              className={`mt-1.5 ${input}`}
            />
          </div>
          <div>
            <label htmlFor="signin-password" className="text-sm font-medium text-neutral-800">
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                id="signin-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                className={`${input} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className={`absolute inset-y-0 right-1 my-1 flex w-10 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:text-neutral-950 ${focusRing}`}
              >
                {showPassword ? (
                  <EyeOff className="size-[18px]" aria-hidden />
                ) : (
                  <Eye className="size-[18px]" aria-hidden />
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className={`${providerButton} bg-emerald-700 text-white hover:bg-emerald-800`}
          >
            {pending === "password" && <Spinner />}
            Sign in
          </button>
        </form>
      </section>

      <p className="mt-5 flex items-start gap-2 px-1 text-[13px] leading-relaxed text-neutral-500">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          Demo sign-in: BoothFinder doesn&apos;t have accounts yet. Any option continues, and
          nothing you type here is sent or saved.
        </span>
      </p>
    </div>
  );
}

function Spinner() {
  return <LoaderCircle className="size-5 animate-spin" aria-hidden />;
}
