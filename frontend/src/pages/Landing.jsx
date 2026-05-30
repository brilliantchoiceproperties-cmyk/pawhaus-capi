import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Check, MapPin, BedDouble, Bath, PawPrint, Coffee, Flame, Trees, Wifi, ShoppingBag, Truck } from "lucide-react";
import { validateCode } from "@/lib/paw-api";
import { useBooking } from "@/context/BookingContext";

// PawHaus brand assets
const HERO_IMG =
  "https://customer-assets.emergentagent.com/job_experiment-forge/artifacts/nwi7onph_PawHaus%20Render%20.png";
const ROOM_INTERIOR =
  "https://customer-assets.emergentagent.com/job_experiment-forge/artifacts/z8k48nx5_PawHaus%20Render%203.png";
const LIFESTYLE_DOG =
  "https://customer-assets.emergentagent.com/job_experiment-forge/artifacts/mtnfbkq0_DSC01494.jpg";
const AFRAME =
  "https://customer-assets.emergentagent.com/job_experiment-forge/artifacts/6s3pcvw6_DJI_0698.jpg";
const DOG_MOSS =
  "https://customer-assets.emergentagent.com/job_experiment-forge/artifacts/nxgc0s05_DJI_0688.jpg";

export default function Landing() {
  const navigate = useNavigate();
  const { setTierFromValidation, enterPublic } = useBooking();

  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [codeLoading, setCodeLoading] = useState(false);

  const handleUnlockVip = async () => {
    setCodeError("");
    if (!code.trim()) {
      setCodeError("Please enter your Founders code.");
      return;
    }
    setCodeLoading(true);
    try {
      const info = await validateCode(code);
      setTierFromValidation(info);
      navigate("/booking");
    } catch (e) {
      const detail = e?.response?.data?.detail || "That code doesn't match any Founders Pass.";
      setCodeError(detail);
    } finally {
      setCodeLoading(false);
    }
  };

  const handlePublic = () => {
    enterPublic();
    navigate("/booking");
  };

  return (
    <div data-testid="landing-page" className="w-full">
      {/* HERO */}
      <section className="relative w-full">
        <div className="relative h-[78vh] min-h-[620px] w-full overflow-hidden">
          <img
            src={HERO_IMG}
            alt="Glass cabin in the pines"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 hero-overlay" />
          <div className="relative h-full mx-auto max-w-[1400px] px-6 sm:px-10 flex flex-col justify-end pb-28">
            <div className="fade-in stagger-1 max-w-3xl">
              <div className="flex items-center gap-3 mb-6">
                <span
                  className="overline"
                  style={{ color: "rgba(250,249,246,0.85)" }}
                >
                  <MapPin className="inline -mt-1 mr-2" size={14} strokeWidth={1.5} />
                  Pre-Booking • Goodrich, TX
                </span>
              </div>
              <h1
                className="font-display text-white text-5xl sm:text-7xl leading-[1.02] tracking-tight"
                style={{ fontWeight: 400 }}
              >
                Reserve your first stay
                <br />
                at <em className="not-italic" style={{ color: "#E8D9C8" }}>PawHaus Resort.</em>
              </h1>
              <p
                className="mt-7 text-lg max-w-xl leading-relaxed"
                style={{ color: "rgba(250,249,246,0.92)" }}
              >
                Twelve glass-and-pine cabins. A private yard at every door. The USA's
                first dog-first luxury nature hotel.
              </p>
            </div>
          </div>
        </div>

        {/* TWO-LANE OFFER */}
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 -mt-24 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* VIP CARD */}
            <div
              data-testid="vip-card"
              className="paw-card p-9 fade-in stagger-2"
              style={{ background: "var(--paw-bg)" }}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="overline" style={{ color: "var(--paw-clay)" }}>
                    Founders Pass Holder
                  </div>
                  <h2
                    className="font-display text-3xl sm:text-4xl mt-2"
                    style={{ color: "var(--paw-ink)" }}
                  >
                    Unlock your <em className="not-italic" style={{ color: "var(--paw-forest)" }}>50%</em> VIP stay.
                  </h2>
                </div>
                <span
                  data-testid="vip-soldout-badge"
                  className="overline border px-3 py-1.5"
                  style={{ borderColor: "var(--paw-ink)", color: "var(--paw-ink)" }}
                >
                  Sold Out
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--paw-ink-2)" }}>
                Founders picked first. 50% off first stay, early check-in, the welcome
                bag, and 10% off everything — for life.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  data-testid="vip-code-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ENTER YOUR CODE"
                  className="paw-input tracking-widest"
                  onKeyDown={(e) => e.key === "Enter" && handleUnlockVip()}
                />
                <button
                  data-testid="vip-unlock-button"
                  onClick={handleUnlockVip}
                  disabled={codeLoading}
                  className="paw-btn-primary whitespace-nowrap"
                >
                  <Lock size={14} strokeWidth={1.5} />
                  {codeLoading ? "Unlocking…" : "Unlock"}
                </button>
              </div>
              {codeError && (
                <p
                  data-testid="vip-code-error"
                  className="mt-3 text-xs"
                  style={{ color: "var(--paw-clay)" }}
                >
                  {codeError}{" "}
                  <button
                    data-testid="vip-error-fallback-public"
                    onClick={handlePublic}
                    className="underline ml-1"
                    style={{ color: "var(--paw-forest)" }}
                  >
                    Continue with 20% off →
                  </button>
                </p>
              )}
              <div
                className="divider my-7"
                style={{ background: "var(--paw-line)" }}
              />
              <ul className="space-y-2.5">
                {[
                  "50% off first stay (applied at checkout)",
                  "First choice of dates — Founders pick first",
                  "Early check-in & VIP welcome bag",
                  "10% off everything, forever",
                  "Name etched on the Honorary Founders Wall",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm" style={{ color: "var(--paw-ink-2)" }}>
                    <Check size={15} strokeWidth={1.5} style={{ color: "var(--paw-forest)", marginTop: 3 }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* PUBLIC CARD */}
            <div
              data-testid="public-card"
              className="paw-card p-9 fade-in stagger-3"
              style={{ background: "var(--paw-bg-2)" }}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="overline" style={{ color: "var(--paw-forest)" }}>
                    Pre-Launch • Open to All
                  </div>
                  <h2
                    className="font-display text-3xl sm:text-4xl mt-2"
                    style={{ color: "var(--paw-ink)" }}
                  >
                    <em className="not-italic" style={{ color: "var(--paw-clay)" }}>20% off</em> every booking.
                  </h2>
                </div>
                <span className="overline" style={{ color: "var(--paw-muted)" }}>
                  No code needed
                </span>
              </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--paw-ink-2)" }}>
                Pre-launch pricing for the public. Pick your retreat, bring the pack,
                and lock in our soft-launch rate before the doors fully open in October.
              </p>

              <button
                data-testid="public-continue-button"
                onClick={handlePublic}
                className="paw-btn-secondary w-full sm:w-auto"
              >
                Reserve with 20% off
                <ArrowRight size={14} strokeWidth={1.5} className="inline ml-2 -mt-0.5" />
              </button>

              <div className="divider my-7" style={{ background: "var(--paw-line)" }} />
              <ul className="space-y-2.5">
                {[
                  "20% off every booking during pre-launch",
                  "All taxes & fees included",
                  "Free reschedule or refund up to 14 days before stay",
                  "First reveal photos & dates emailed to you in October",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm" style={{ color: "var(--paw-ink-2)" }}>
                    <Check size={15} strokeWidth={1.5} style={{ color: "var(--paw-clay)", marginTop: 3 }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p
            className="mt-6 text-xs text-center"
            style={{ color: "var(--paw-muted)" }}
          >
            Phase 1 • only 12 units • 100 Founders Pass holders pick first, then 50,000+
            on the waitlist. Dates are going fast.
          </p>
        </div>
      </section>

      {/* PROPERTY STATEMENT */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-7">
          <div className="overline mb-5" style={{ color: "var(--paw-clay)" }}>
            The USA's first &amp; only
          </div>
          <h2 className="font-display text-4xl sm:text-5xl leading-[1.05]" style={{ color: "var(--paw-ink)" }}>
            A dog-first luxury nature hotel — glass cabins in the pines.
          </h2>
          <p className="mt-7 text-lg leading-relaxed max-w-xl" style={{ color: "var(--paw-ink-2)" }}>
            Located in Goodrich, TX. A private fenced yard at every door, on-site
            groomer, food trucks under the trees, and a dog park that's just yours and
            the pack's. Bring your humans, bring your dogs — leave the rest behind.
          </p>
        </div>
        <div className="md:col-span-5 relative">
          <img
            src={LIFESTYLE_DOG}
            alt="A Golden Retriever in nature"
            className="w-full h-[480px] object-cover"
          />
        </div>
      </section>

      {/* AMENITIES */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="overline mb-4" style={{ color: "var(--paw-muted)" }}>
              Included in every unit
            </div>
            <h3 className="font-display text-3xl mb-6" style={{ color: "var(--paw-ink)" }}>
              A home for the pack.
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm" style={{ color: "var(--paw-ink-2)" }}>
              {[
                ["Trees", "Private fenced yard"],
                ["Flame", "Private wood fire pit"],
                ["Bath", "Wood-fire hot tub (Standard & Monolith)"],
                ["BedDouble", "King or queen bed + 2 dog beds"],
                ["Coffee", "Free in-room coffee"],
                ["Wifi", "WiFi + TV w/ streaming logins"],
              ].map(([_, label]) => (
                <li key={label} className="flex items-center gap-2.5">
                  <PawPrint size={14} strokeWidth={1.5} style={{ color: "var(--paw-forest)" }} />
                  {label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="overline mb-4" style={{ color: "var(--paw-muted)" }}>
              On site
            </div>
            <h3 className="font-display text-3xl mb-6" style={{ color: "var(--paw-ink)" }}>
              Without ever leaving the property.
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm" style={{ color: "var(--paw-ink-2)" }}>
              {[
                "Camp store: firewood, snacks, breakfast",
                "Food trucks every lunch & dinner",
                "Dog groomer Wed–Sun",
                "Massage therapist by appointment",
                "Therapist (for you & your dog) by appointment",
                "Dog park, pickleball court & trails",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2.5">
                  <ShoppingBag size={14} strokeWidth={1.5} style={{ color: "var(--paw-clay)" }} />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* INTERIOR + AFRAME */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32 grid grid-cols-1 md:grid-cols-12 gap-5">
        <img src={ROOM_INTERIOR} alt="Interior" className="md:col-span-7 w-full h-[520px] object-cover" />
        <div className="md:col-span-5 flex flex-col justify-between">
          <img src={AFRAME} alt="A-frame cabin" className="w-full h-[360px] object-cover" />
          <p className="text-xs leading-relaxed mt-4" style={{ color: "var(--paw-muted)" }}>
            Reference photos from our sister property at Cameron Ranch Glamping.
            Floor plans, layouts and finishes at PawHaus Resort will be very similar.
          </p>
        </div>
      </section>

      {/* CONSTRUCTION TRANSPARENCY */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32">
        <div className="overline mb-4" style={{ color: "var(--paw-muted)" }}>
          Where we are right now
        </div>
        <h3 className="font-display text-4xl mb-10" style={{ color: "var(--paw-ink)" }}>
          Built in the open. No surprises.
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            ["Pool", "Construction complete"],
            ["Pickleball court", "Complete"],
            ["12 modular units", "Built in Houston, drop on site September"],
            ["Common areas", "Built — full photos coming soon"],
            ["Dog park, salon, massage home", "Active renovation"],
            ["Final reveal & first stays", "October"],
          ].map(([title, status]) => (
            <div
              key={title}
              className="paw-card p-6"
              style={{ background: "var(--paw-bg)" }}
            >
              <div className="overline mb-2" style={{ color: "var(--paw-clay)" }}>
                {title}
              </div>
              <p className="text-base" style={{ color: "var(--paw-ink)" }}>
                {status}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-sm leading-relaxed max-w-2xl" style={{ color: "var(--paw-ink-2)" }}>
          Once the final reveal is set up in October, if for any reason you're not happy
          with the result — you get a full refund. No questions asked.
        </p>
      </section>

      {/* CLOSING CTA */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32">
        <div
          className="relative overflow-hidden"
          style={{ background: "var(--paw-forest)" }}
        >
          <img
            src={DOG_MOSS}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="relative px-8 sm:px-14 py-20 sm:py-24 max-w-3xl">
            <div className="overline mb-4" style={{ color: "rgba(232,217,200,0.9)" }}>
              Reserve a slot
            </div>
            <h3 className="font-display text-4xl sm:text-5xl text-white leading-tight">
              Pick a path. Pick a retreat. Bring the pack.
            </h3>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <button
                data-testid="footer-cta-vip"
                onClick={() => document.querySelector('[data-testid="vip-code-input"]')?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="paw-btn-secondary"
                style={{
                  borderColor: "rgba(250,249,246,0.9)",
                  color: "rgba(250,249,246,0.95)",
                  background: "transparent",
                }}
              >
                I have a Founders code
              </button>
              <button
                data-testid="footer-cta-public"
                onClick={handlePublic}
                className="paw-btn-primary"
                style={{ background: "var(--paw-clay)", borderColor: "var(--paw-clay)" }}
              >
                Continue with 20% off
                <ArrowRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
