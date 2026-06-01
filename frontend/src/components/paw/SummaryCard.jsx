import React, { useEffect, useState } from "react";
import { getQuote } from "@/lib/paw-api";

export default function SummaryCard({ roomId, stayId, tier, catalog }) {
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!roomId || !stayId || !tier) {
      setQuote(null);
      return;
    }
    setLoading(true);
    getQuote({ room_id: roomId, stay_id: stayId, tier })
      .then((q) => active && setQuote(q))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [roomId, stayId, tier]);

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
          <Row label="Base rate" value={fmt(quote.base_rate)} />
          <Row
            label={`Discount (${Math.round(quote.discount_percent * 100)}% — ${quote.tier_label})`}
            value={`-${fmt(quote.discount_amount)}`}
            accent
          />
          {quote.hot_tub_premium > 0 && (
            <Row label="Hot tub premium" value={`+${fmt(quote.hot_tub_premium)}`} />
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

function Row({ label, value, accent }) {
  return (
    <div className="flex items-baseline justify-between">
      <span style={{ color: accent ? "var(--paw-clay)" : "var(--paw-ink-2)" }}>{label}</span>
      <span style={{ color: accent ? "var(--paw-clay)" : "var(--paw-ink)" }}>{value}</span>
    </div>
  );
}

function fmt(n) {
  if (n == null) return "—";
  return `$${Number(n).toFixed(2)}`;
}
