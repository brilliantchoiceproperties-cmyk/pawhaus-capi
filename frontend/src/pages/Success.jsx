import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { getPaymentStatus } from "@/lib/paw-api";
import { useBooking } from "@/context/BookingContext";
import { track } from "@/lib/analytics";

const POLL_INTERVAL = 2500;
const MAX_ATTEMPTS = 8;

export default function Success() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { reset } = useBooking();
  const sessionId = params.get("session_id");
  const [status, setStatus] = useState("checking"); // checking | paid | expired | error
  const [booking, setBooking] = useState(null);
  const [amount, setAmount] = useState(null);
  const attemptsRef = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus("error");
      return;
    }
    let cancelled = false;
    const poll = async () => {
      try {
        const data = await getPaymentStatus(sessionId);
        if (cancelled) return;
        if (data.payment_status === "paid") {
          setStatus("paid");
          setBooking(data.booking);
          setAmount(data.amount);
          track("checkout_paid", {
            amount: data.amount,
            tier: data.booking?.tier,
            room_id: data.booking?.room_id,
            stay_id: data.booking?.stay_id,
            session_id: sessionId,
            booking_id: data.booking?.id,
          });
          // Clear context after success
          reset();
          return;
        }
        if (data.status === "expired") {
          setStatus("expired");
          track("checkout_expired", { session_id: sessionId });
          return;
        }
        attemptsRef.current += 1;
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setStatus("pending");
          return;
        }
        setTimeout(poll, POLL_INTERVAL);
      } catch (e) {
        if (cancelled) return;
        setStatus("error");
      }
    };
    poll();
    return () => {
      cancelled = true;
    };
    // reset is a stable callback from context; intentionally omitted to avoid re-polling on re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div data-testid="success-page" className="mx-auto max-w-[900px] px-6 sm:px-10 py-24 text-center">
      {status === "checking" && (
        <div data-testid="success-checking">
          <p className="overline" style={{ color: "var(--paw-muted)" }}>
            Confirming your reservation…
          </p>
          <h1 className="font-display text-4xl mt-4" style={{ color: "var(--paw-ink)" }}>
            One moment — talking to Stripe.
          </h1>
        </div>
      )}
      {status === "paid" && (
        <div data-testid="success-paid">
          <div className="flex justify-center mb-6">
            <CheckCircle2 size={48} strokeWidth={1.25} style={{ color: "var(--paw-forest)" }} />
          </div>
          <div className="overline" style={{ color: "var(--paw-clay)" }}>
            Reservation confirmed
          </div>
          <h1 className="font-display text-5xl mt-3" style={{ color: "var(--paw-ink)" }}>
            Welcome to the pack.
          </h1>
          <p className="mt-5 text-base max-w-xl mx-auto leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
            {booking?.room_name} • {booking?.stay_label}. We&apos;ll reach out 30 days before
            check-in to confirm your dates, and final preview photos & arrival details
            will be sent before our December 1, 2026 opening.
          </p>
          {amount != null && (
            <p className="mt-5 font-display text-3xl" style={{ color: "var(--paw-forest)" }}>
              ${Number(amount).toFixed(2)} paid
            </p>
          )}

          {booking?.referral_code && (
            <div data-testid="success-referral" className="paw-card p-7 mt-10 mx-auto max-w-xl" style={{ background: "var(--paw-bg-2)", borderColor: "var(--paw-clay)", borderWidth: 1, borderStyle: "solid" }}>
              <div className="overline mb-2" style={{ color: "var(--paw-clay)" }}>
                Refer a friend → both get $50 off
              </div>
              <p className="text-sm leading-relaxed mb-5" style={{ color: "var(--paw-ink-2)" }}>
                Share your link below. When a friend books, they get $50 off — and we&apos;ll email you a $50 voucher for your next stay.
              </p>
              <div className="flex items-center gap-2 mb-3">
                <input
                  data-testid="referral-link-input"
                  readOnly
                  value={`https://staypawhaus.com/?ref=${booking.referral_code}`}
                  className="flex-1 px-3 py-2 text-xs"
                  style={{ background: "var(--paw-bg)", border: "1px solid var(--paw-line)", color: "var(--paw-ink)" }}
                  onFocus={(e) => e.target.select()}
                />
                <button
                  data-testid="referral-copy-button"
                  onClick={() => {
                    const url = `https://staypawhaus.com/?ref=${booking.referral_code}`;
                    if (navigator.clipboard) navigator.clipboard.writeText(url);
                  }}
                  className="paw-btn-secondary text-xs"
                >
                  Copy
                </button>
                <button
                  data-testid="referral-share-button"
                  onClick={() => {
                    const url = `https://staypawhaus.com/?ref=${booking.referral_code}`;
                    const text = `I just booked PawHaus 🐾 — use my link to get $50 off your stay: ${url}`;
                    if (navigator.share) navigator.share({ url, text, title: "PawHaus Resort" });
                    else window.open(`mailto:?subject=${encodeURIComponent("PawHaus — $50 off your stay")}&body=${encodeURIComponent(text)}`);
                  }}
                  className="paw-btn-primary text-xs"
                  style={{ background: "var(--paw-clay)", borderColor: "var(--paw-clay)" }}
                >
                  Share
                </button>
              </div>
              <p className="text-xs" style={{ color: "var(--paw-muted)" }}>
                Your code: <strong style={{ color: "var(--paw-ink)" }}>{booking.referral_code}</strong>
              </p>
            </div>
          )}

          <Link to="/" data-testid="success-home-link" className="paw-btn-primary mt-8 inline-flex">
            Back to landing <ArrowRight size={14} strokeWidth={1.5} />
          </Link>
        </div>
      )}
      {status === "expired" && (
        <div data-testid="success-expired">
          <h1 className="font-display text-4xl" style={{ color: "var(--paw-ink)" }}>
            That session expired.
          </h1>
          <p className="mt-4" style={{ color: "var(--paw-ink-2)" }}>
            No charge was made. You can start a fresh reservation any time.
          </p>
          <button onClick={() => navigate("/")} className="paw-btn-primary mt-7">
            Return home
          </button>
        </div>
      )}
      {status === "pending" && (
        <div data-testid="success-pending">
          <h1 className="font-display text-4xl" style={{ color: "var(--paw-ink)" }}>
            Still processing…
          </h1>
          <p className="mt-4 max-w-xl mx-auto" style={{ color: "var(--paw-ink-2)" }}>
            Your bank is taking a little longer than usual. We&apos;ll email you the moment
            it confirms.
          </p>
        </div>
      )}
      {status === "error" && (
        <div data-testid="success-error">
          <h1 className="font-display text-4xl" style={{ color: "var(--paw-ink)" }}>
            We couldn&apos;t confirm that session.
          </h1>
          <p className="mt-4" style={{ color: "var(--paw-ink-2)" }}>
            If you completed payment, please contact us and we&apos;ll sort it out.
          </p>
          <button onClick={() => navigate("/")} className="paw-btn-primary mt-7">
            Return home
          </button>
        </div>
      )}
    </div>
  );
}
