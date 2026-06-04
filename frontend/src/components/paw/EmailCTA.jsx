import React from "react";
import { Mail } from "lucide-react";

/**
 * Reusable "Got questions? Email us" CTA.
 * Two variants:
 *   - variant="hero"   → big, full-section feature block (use on landing)
 *   - variant="inline" → smaller banner with the same email (use inside the booking flow)
 */
export default function EmailCTA({ variant = "hero" }) {
  if (variant === "inline") {
    return (
      <a
        href="mailto:bark@staypawhaus.com?subject=PawHaus%20question"
        data-testid="email-cta-inline"
        className="flex items-center gap-3 px-5 py-3 text-xs sm:text-sm border w-full sm:w-fit"
        style={{
          background: "var(--paw-bg-2)",
          borderColor: "var(--paw-line)",
          color: "var(--paw-ink-2)",
          letterSpacing: "0.04em",
        }}
      >
        <Mail size={14} strokeWidth={1.5} style={{ color: "var(--paw-forest)" }} />
        Questions? Email{" "}
        <span style={{ color: "var(--paw-forest)", fontWeight: 500 }}>bark@staypawhaus.com</span>
      </a>
    );
  }

  return (
    <section
      className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32"
      data-testid="email-cta-hero"
    >
      <div
        className="relative overflow-hidden border"
        style={{ background: "var(--paw-bg-2)", borderColor: "var(--paw-line)" }}
      >
        <div className="px-8 sm:px-14 py-16 sm:py-20 max-w-3xl">
          <div className="overline mb-4" style={{ color: "var(--paw-clay)" }}>
            <Mail size={12} strokeWidth={1.8} className="inline -mt-0.5 mr-2" />
            Any questions?
          </div>
          <h3
            className="font-display text-4xl sm:text-5xl leading-tight"
            style={{ color: "var(--paw-ink)" }}
          >
            We answer every email — usually within a few hours.
          </h3>
          <p className="mt-5 text-base max-w-xl leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
            Got a dog with quirks? A group date in mind? A question about a code? Drop us a line — a real human (and at least one dog) will get back to you.
          </p>
          <a
            data-testid="email-cta-link"
            href="mailto:bark@staypawhaus.com?subject=PawHaus%20question"
            className="paw-btn-primary mt-9 inline-flex"
          >
            <Mail size={14} strokeWidth={1.5} />
            bark@staypawhaus.com
          </a>
        </div>
      </div>
    </section>
  );
}
