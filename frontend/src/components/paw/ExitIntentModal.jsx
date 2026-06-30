import React, { useEffect, useRef, useState } from "react";
import { X, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const STORAGE_KEY = "pawhaus_exit_intent_seen";

/**
 * Exit-intent capture.
 *  - Desktop: triggers when the mouse moves toward the top edge (toward tab close).
 *  - Mobile: triggers when the user has scrolled ≥60% then idled ≥6s.
 *  - Fires once per session (localStorage flag).
 *  - Submits a single email → /api/lead-capture (fires GHL workflow on the backend).
 */
export default function ExitIntentModal() {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const idleTimer = useRef(null);
  const lastScrollAt = useRef(0);
  // Once we've shown the modal once in this tab, never show it again — even if
  // the user dismisses it and re-triggers the mouseout/scroll-idle pattern.
  const hasTriggeredRef = useRef(false);
  const cleanupListenersRef = useRef(null);

  useEffect(() => {
    // Already shown this session? bail out
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") {
        hasTriggeredRef.current = true;
        return;
      }
    } catch (e) {
      // localStorage blocked — still allow once per page load via ref
    }

    const trigger = (source) => {
      if (hasTriggeredRef.current) return; // hard guard against re-triggering
      hasTriggeredRef.current = true;
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch (e) {
        // ignore quota / privacy errors
      }
      track("exit_intent_shown", { source });
      setOpen(true);
      // Remove listeners so they can't fire again this session even after close
      if (cleanupListenersRef.current) cleanupListenersRef.current();
    };

    // Desktop: mouseout toward top of viewport
    const onMouseOut = (e) => {
      if (e.clientY <= 0 && !e.relatedTarget) {
        trigger("desktop_mouseout");
      }
    };

    // Mobile: scroll past 60% then idle 6s
    const onScroll = () => {
      lastScrollAt.current = Date.now();
      const pct = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
      if (pct < 0.6) return;
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        if (Date.now() - lastScrollAt.current >= 5800) {
          trigger("mobile_scroll_idle");
        }
      }, 6000);
    };

    // Time-based: auto-fire 15s after landing (whichever fires first wins)
    const dwellTimer = setTimeout(() => {
      trigger("dwell_15s");
    }, 15000);

    document.addEventListener("mouseout", onMouseOut);
    window.addEventListener("scroll", onScroll, { passive: true });

    cleanupListenersRef.current = () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      clearTimeout(dwellTimer);
    };

    return () => {
      if (cleanupListenersRef.current) cleanupListenersRef.current();
    };
  }, []);

  const close = () => {
    track("exit_intent_dismissed");
    setOpen(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!firstName.trim()) {
      setError("Please enter your first name.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/lead-capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          first_name: firstName.trim(),
          source: "exit_intent",
          page: typeof window !== "undefined" ? window.location.pathname : "",
        }),
      });
      if (!res.ok) {
        throw new Error(`server returned ${res.status}`);
      }
      track("exit_intent_email_captured", { email });
      setSubmitted(true);
    } catch (err) {
      console.error("exit-intent capture failed", err);
      setError("Couldn't save — try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      data-testid="exit-intent-modal"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(28, 36, 30, 0.6)" }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="paw-card relative w-full max-w-md p-7 sm:p-9"
        style={{ background: "var(--paw-bg)" }}
      >
        <button
          data-testid="exit-intent-close"
          onClick={close}
          aria-label="Close"
          className="absolute top-3 right-3 p-2"
          style={{ color: "var(--paw-muted)" }}
        >
          <X size={18} strokeWidth={1.6} />
        </button>

        {!submitted ? (
          <>
            <div className="flex items-center gap-2 mb-3" style={{ color: "var(--paw-clay)" }}>
              <Sparkles size={14} strokeWidth={1.8} />
              <span className="overline">Wait — one more thing</span>
            </div>
            <h3
              className="font-display text-2xl sm:text-3xl leading-tight mb-3"
              style={{ color: "var(--paw-ink)" }}
            >
              $25 off — on top of the 30%.
            </h3>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--paw-ink-2)" }}>
              Drop your name and email and we&apos;ll reveal your one-time $25 off code on the next screen — and email it to you for safekeeping. Good for the next 48 hours only.
            </p>
            <form onSubmit={submit} className="space-y-3">
              <input
                data-testid="exit-intent-first-name"
                type="text"
                autoComplete="given-name"
                autoFocus
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="paw-input w-full"
                disabled={submitting}
              />
              <input
                data-testid="exit-intent-email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="paw-input w-full"
                disabled={submitting}
              />
              {error && (
                <div className="text-xs" style={{ color: "var(--paw-clay)" }}>
                  {error}
                </div>
              )}
              <button
                data-testid="exit-intent-submit"
                type="submit"
                disabled={submitting}
                className="paw-btn-primary w-full"
                style={{ background: "var(--paw-clay)", borderColor: "var(--paw-clay)" }}
              >
                {submitting ? "Sending…" : "Reveal my $25 code"}
              </button>
              <p className="text-xs text-center" style={{ color: "var(--paw-muted)" }}>
                No spam. One code, one email, done.
              </p>
            </form>
          </>
        ) : (
          <div className="text-center py-3" data-testid="exit-intent-success">
            <div
              className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "var(--paw-forest)", color: "var(--paw-bg)" }}
            >
              <Sparkles size={20} strokeWidth={1.6} />
            </div>
            <h3
              className="font-display text-2xl mb-2"
              style={{ color: "var(--paw-ink)" }}
            >
              {firstName ? `You're in, ${firstName}.` : "You're in."}
            </h3>
            <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--paw-ink-2)" }}>
              Here&apos;s your code — copy it now or grab it from the email we just sent you.
            </p>
            <div
              data-testid="exit-intent-code"
              className="mx-auto mb-5 inline-block px-6 py-3 font-display tracking-[0.18em] text-2xl select-all"
              style={{
                background: "var(--paw-bg-2)",
                border: "1.5px dashed var(--paw-forest)",
                color: "var(--paw-ink)",
                letterSpacing: "0.18em",
              }}
            >
              PAW25
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--paw-muted)" }}>
              Stacks with the 30% pre-launch discount. Valid 48 hours. Apply at checkout, or use the link in your email to auto-apply.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
