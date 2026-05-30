import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useBooking } from "@/context/BookingContext";

export default function Header() {
  const { tier, tierLabel, discountPercent } = useBooking();
  const loc = useLocation();
  const onBooking = loc.pathname.startsWith("/booking");
  return (
    <header
      data-testid="paw-header"
      className="sticky top-0 z-40 w-full border-b backdrop-blur-xl"
      style={{ background: "rgba(250,249,246,0.82)", borderColor: "var(--paw-line)" }}
    >
      <div className="mx-auto max-w-[1400px] flex items-center justify-between px-6 sm:px-10 py-5">
        <Link to="/" data-testid="logo-link" className="flex items-center gap-3">
          <div
            className="font-display text-2xl tracking-tight"
            style={{ color: "var(--paw-forest)" }}
          >
            PawHaus<span style={{ color: "var(--paw-clay)" }}>.</span>
          </div>
          <div className="overline" style={{ color: "var(--paw-muted)" }}>
            Resort
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <span className="overline" style={{ color: "var(--paw-muted)" }}>
            By Invitation • Founders Pre-Booking
          </span>
          {onBooking && tier && (
            <span
              data-testid="active-discount-badge"
              className={`discount-badge ${tier === "VIP" ? "vip" : ""}`}
            >
              <span>{tierLabel}</span>
              <span style={{ opacity: 0.7 }}>•</span>
              <span>{Math.round(discountPercent * 100)}% off</span>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
