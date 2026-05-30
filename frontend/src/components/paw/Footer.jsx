import React from "react";

export default function Footer() {
  return (
    <footer
      data-testid="paw-footer"
      className="mt-32 border-t"
      style={{ borderColor: "var(--paw-line)", background: "var(--paw-bg-2)" }}
    >
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-14 grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-5">
          <div
            className="font-display text-3xl tracking-tight"
            style={{ color: "var(--paw-forest)" }}
          >
            “Luxury Has Gone To The Dogs.”
          </div>
          <p className="mt-3 text-sm" style={{ color: "var(--paw-ink-2)" }}>
            — only at PawHaus Resort.
          </p>
        </div>
        <div className="md:col-span-4">
          <div className="overline mb-3" style={{ color: "var(--paw-muted)" }}>
            Where to find us
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
            248 Woodsy Hollow Rd
            <br />
            Goodrich, TX
          </p>
        </div>
        <div className="md:col-span-3">
          <div className="overline mb-3" style={{ color: "var(--paw-muted)" }}>
            Reach us
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
            staypawhaus.com
            <br />
            hello@staypawhaus.com
          </p>
        </div>
      </div>
      <div
        className="border-t py-5 text-center text-xs"
        style={{ borderColor: "var(--paw-line)", color: "var(--paw-muted)" }}
      >
        © 2026 PawHaus Resort • All taxes &amp; fees included • Free reschedule or refund up to 14
        days before stay
      </div>
    </footer>
  );
}
