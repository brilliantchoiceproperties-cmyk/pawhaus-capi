import React from "react";
import { Lock, RefreshCw, PawPrint, ShieldCheck, Star } from "lucide-react";

const ITEMS = [
  {
    icon: <Lock size={16} strokeWidth={1.6} />,
    title: "Secured by Stripe",
    body: "Bank-grade encryption. Apple Pay, Google Pay & Link supported.",
  },
  {
    icon: <RefreshCw size={16} strokeWidth={1.6} />,
    title: "14-day full refund",
    body: "Free reschedule or refund any time up to 14 days before check-in.",
  },
  {
    icon: <PawPrint size={16} strokeWidth={1.6} />,
    title: "No pet fees, ever",
    body: "Up to your cabin's limit. The rate is the rate.",
  },
  {
    icon: <ShieldCheck size={16} strokeWidth={1.6} />,
    title: "$250 refundable deposit",
    body: "Pre-authorised on your card. Released within 24 hrs of check-out if no damage.",
  },
  {
    icon: <Star size={16} strokeWidth={1.6} />,
    title: "4.9★ sister property",
    body: "Same team behind Cameron Ranch Glamping — one of the most viral retreats in TX.",
  },
];

export default function TrustStrip() {
  return (
    <div data-testid="trust-strip" className="mt-10">
      <div className="overline mb-4" style={{ color: "var(--paw-muted)" }}>
        Why booking here is safe
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {ITEMS.map((item) => (
          <div
            key={item.title}
            className="paw-card p-4"
            style={{ background: "var(--paw-bg)" }}
          >
            <div className="flex items-center gap-2 mb-2" style={{ color: "var(--paw-forest)" }}>
              {item.icon}
              <span className="overline" style={{ color: "var(--paw-ink)" }}>
                {item.title}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
              {item.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
