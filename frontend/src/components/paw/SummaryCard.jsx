import React, { useEffect, useState } from "react";
import { getQuote } from "@/lib/paw-api";
import { getReferrer } from "@/lib/referral";
import { getPromo, setPromo, clearPromo } from "@/lib/promo";

export default function SummaryCard({ roomId, stayId, tier, catalog }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoVisible, setPromoVisible] = useState(false);
  const [promoError, setPromoError] = useState("");
  const referrer = getReferrer();
  const promo = getPromo();

  useEffect(() => {
    let active = true;
    if (!roomId || !stayId || !tier) {
      setQuote(null);
      return;
    }
    setLoading(true);
    getQuote({ room_id: roomId, stay_id: stayId, tier, referrer_code: referrer, promo_code: promo })
      .then((q) => {
        if (!active) return;
        setQuote(q);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [roomId, stayId, tier, referrer, promo]);

  const applyPromo = () => {
    setPromoError("");
    const code = (promoInput || "").trim().toUpperCase();
    if (!code) return;
    setLoading(true);
    // Probe the server with the code BEFORE persisting to localStorage —
    // that way invalid codes never poison the auto-apply path on next page load.
    getQuote({ room_id: roomId, stay_id: stayId, tier, referrer_code: referrer, promo_code: code })
      .then((q) => {
        if (q.promo_code && q.promo_discount > 0) {
          // Valid — persist + update UI
          setPromo(code);
          setQuote(q);
          setPromoInput("");
          setPromoError("");
        } else {
          // Invalid — show error, do NOT touch localStorage
          setPromoError(`Code "${code}" isn't valid — try a different one.`);
        }
      })
      .catch(() => setPromoError("Couldn't check that code — try again."))
      .finally(() => setLoading(false));
  };

  const removePromo = () => {
    clearPromo();
    setPromoError("");
    setLoading(true);
    getQuote({ room_id: roomId, stay_id: stayId, tier, referrer_code: referrer, promo_code: null })
      .then((q) => setQuote(q))
      .finally(() => setLoading(false));
  };

  const room = catalog?.rooms?.find((r) => r.id === roomId);
  const stay = catalog?.stay_options?.find((s) => s.id === stayId);

  return (
    <aside
      data-testid="sticky-summary-card"
      className="lg:sticky lg:top-24 border p-7"
      style={{ background: "var(--paw-bg-2)", borderColor: "var(--paw-line)" }}
    >
      <div className="overline mb-4" style={{ color: "var(--paw-muted)" }}>
        Your reservation
      </div>

      <div className="space-y-1">
        <div className="font-display text-2xl" style={{ color: "var(--paw-ink)" }}>
          {room?.name || "Select a room"}
        </div>
        <div className="text-sm" style={{ color: "var(--paw-ink-2)" }}>
          {stay?.label || "Select a stay"}
        </div>
      </div>

      <div className="divider my-6" />

      {!quote && (
        <p className="text-sm" style={{ color: "var(--paw-muted)" }}>
          Pick your retreat and stay length to see live pricing.
        </p>
      )}

      {quote && (
        <div className="space-y-3 text-sm">
          <div className="flex items-baseline justify-between">
            <span style={{ color: "var(--paw-ink-2)" }}>Base rate</span>
            <span style={{ color: "var(--paw-muted)", textDecoration: "line-through" }} data-testid="summary-base-strike">
              {fmt(quote.base_rate)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span style={{ color: "var(--paw-clay)" }}>
              {Math.round(quote.discount_percent * 100)}% off ({quote.tier_label})
            </span>
            <span style={{ color: "var(--paw-clay)" }}>−{fmt(quote.discount_amount)}</span>
          </div>
          {quote.referral_discount > 0 && (
            <div className="flex items-baseline justify-between" data-testid="summary-referral">
              <span style={{ color: "var(--paw-forest)" }}>
                🎁 Referral credit applied
              </span>
              <span style={{ color: "var(--paw-forest)" }}>−{fmt(quote.referral_discount)}</span>
            </div>
          )}
          {quote.promo_discount > 0 && (
            <div className="flex items-baseline justify-between" data-testid="summary-promo">
              <span style={{ color: "var(--paw-forest)" }}>
                ✨ Promo {quote.promo_code} applied
              </span>
              <span className="flex items-center gap-2" style={{ color: "var(--paw-forest)" }}>
                −{fmt(quote.promo_discount)}
                <button
                  type="button"
                  onClick={removePromo}
                  data-testid="summary-promo-remove"
                  className="text-xs underline"
                  style={{ color: "var(--paw-muted)" }}
                >
                  remove
                </button>
              </span>
            </div>
          )}
          <div className="divider my-3" />
          <div className="flex items-baseline justify-between">
            <span className="overline" style={{ color: "var(--paw-muted)" }}>
              Total due
            </span>
            <span
              data-testid="summary-total"
              className="font-display text-3xl"
              style={{ color: "var(--paw-forest)" }}
            >
              {fmt(quote.total)}
            </span>
          </div>

          {/* Promo code input — only shown if no promo already applied */}
          {quote.promo_discount === 0 && (
            <div className="pt-2">
              {!promoVisible ? (
                <button
                  type="button"
                  data-testid="summary-promo-toggle"
                  onClick={() => setPromoVisible(true)}
                  className="text-xs underline"
                  style={{ color: "var(--paw-muted)" }}
                >
                  Have a promo code?
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      data-testid="summary-promo-input"
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                      placeholder="PAW25"
                      className="paw-input flex-1 text-xs"
                      style={{ padding: "8px 10px" }}
                      onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                    />
                    <button
                      type="button"
                      data-testid="summary-promo-apply"
                      onClick={applyPromo}
                      className="text-xs px-3 py-2"
                      style={{
                        background: "var(--paw-clay)",
                        color: "var(--paw-bg)",
                        fontWeight: 500,
                      }}
                    >
                      Apply
                    </button>
                  </div>
                  {promoError && (
                    <div className="text-xs" data-testid="summary-promo-error" style={{ color: "var(--paw-clay)" }}>
                      {promoError}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--paw-muted)" }}>
            All taxes &amp; fees included. Free reschedule or refund up to 14 days before stay.
          </p>
        </div>
      )}

      {loading && (
        <div
          className="mt-3 text-xs"
          style={{ color: "var(--paw-muted)" }}
          data-testid="summary-loading"
        >
          Updating…
        </div>
      )}
    </aside>
  );
}

function fmt(n) {
  if (n == null) return "—";
  return `$${Number(n).toFixed(2)}`;
}
