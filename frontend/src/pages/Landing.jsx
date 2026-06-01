import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Check, MapPin, BedDouble, Coffee, Flame, Trees, Wifi, ShoppingBag, Bath, ChefHat, PawPrint, Dumbbell, Sparkles, KeyRound, Sunrise } from "lucide-react";
import { validateCode } from "@/lib/paw-api";
import { useBooking } from "@/context/BookingContext";
import { track } from "@/lib/analytics";

// PawHaus brand assets — served as optimised webp from /public/brand/
const HERO_IMG = "/brand/hero.webp";
const BEDROOM = "/brand/bedroom.webp";
const MIRROR_CABIN = "/brand/mirror.webp";
const BANDANA_DOG = "/brand/bandana_dog.webp";
const YOGA = "/brand/yoga.webp";
const COFFEE = "/brand/coffee.webp";
const RENDER3 = "/brand/render3.webp";
const DJI_AERIAL = "/brand/dji698.webp";
const DJI_AERIAL2 = "/brand/dji688.webp";
const HOT_TUB = "/brand/dsc.webp";

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
      track("vip_code_submitted", { result: "empty" });
      return;
    }
    setCodeLoading(true);
    track("vip_code_submitted", { code_entered: code.trim().toUpperCase() });
    try {
      const info = await validateCode(code);
      setTierFromValidation(info);
      track("vip_code_validated", { tier: info.tier, discount_percent: info.discount_percent });
      navigate("/booking");
    } catch (e) {
      const detail = e?.response?.data?.detail || "That code doesn't match any Founders Pass.";
      setCodeError(detail);
      track("vip_code_invalid", { detail });
    } finally {
      setCodeLoading(false);
    }
  };

  const handlePublic = () => {
    enterPublic();
    track("public_cta_clicked", { tier: "PUBLIC", discount_percent: 0.2 });
    navigate("/booking");
  };

  return (
    <div data-testid="landing-page" className="w-full">
      {/* TOP BANNER — Pre-sale closed */}
      <div
        data-testid="presale-banner"
        className="w-full text-center py-2.5 text-xs"
        style={{ background: "var(--paw-forest)", color: "var(--paw-bg)", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500 }}
      >
        <Lock size={11} strokeWidth={1.8} className="inline -mt-0.5 mr-2" />
        Founders Pre-Sale Closed — 100/100 Passes Sold • Code-Holders Only
      </div>

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
                <span className="overline" style={{ color: "rgba(250,249,246,0.85)" }}>
                  <MapPin className="inline -mt-1 mr-2" size={14} strokeWidth={1.5} />
                  Founders Portal • Goodrich, TX
                </span>
              </div>
              <h1 className="font-display text-white text-5xl sm:text-7xl leading-[1.02] tracking-tight" style={{ fontWeight: 400 }}>
                Reserve your first stay
                <br />
                at <em className="not-italic" style={{ color: "#E8D9C8" }}>PawHaus Resort.</em>
              </h1>
              <p className="mt-7 text-lg max-w-xl leading-relaxed" style={{ color: "rgba(250,249,246,0.92)" }}>
                Twelve glass-and-pine cabins. A private yard at every door. The USA's first dog-first luxury nature hotel — opening December 1, 2027.
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
              className="paw-card p-9 fade-in stagger-2 relative overflow-hidden"
              style={{ background: "var(--paw-bg)" }}
            >
              <div
                className="absolute top-5 right-5 overline px-3 py-1.5 border"
                data-testid="vip-soldout-badge"
                style={{ borderColor: "var(--paw-clay)", color: "var(--paw-clay)", background: "rgba(168,90,67,0.06)" }}
              >
                <Lock size={10} strokeWidth={2} className="inline -mt-0.5 mr-1.5" />
                Pre-Sale Closed
              </div>

              <div className="mb-6 mt-1">
                <div className="overline" style={{ color: "var(--paw-clay)" }}>
                  Founders Pass Holder
                </div>
                <h2 className="font-display text-3xl sm:text-4xl mt-2 leading-tight" style={{ color: "var(--paw-ink)" }}>
                  Unlock your <em className="not-italic" style={{ color: "var(--paw-forest)" }}>50%</em> Founder stay.
                </h2>
                <p className="text-sm leading-relaxed mt-3" style={{ color: "var(--paw-ink-2)" }}>
                  All 100 Founders Passes sold in 2026 — new passes are no longer available. Enter your code below to unlock first-stay pricing and pick your dates.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  data-testid="vip-code-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ENTER YOUR FOUNDERS CODE"
                  className="paw-input tracking-widest"
                  onKeyDown={(e) => e.key === "Enter" && handleUnlockVip()}
                />
                <button
                  data-testid="vip-unlock-button"
                  onClick={handleUnlockVip}
                  disabled={codeLoading}
                  className="paw-btn-primary whitespace-nowrap"
                >
                  <KeyRound size={14} strokeWidth={1.5} />
                  {codeLoading ? "Unlocking…" : "Unlock"}
                </button>
              </div>
              {codeError && (
                <p data-testid="vip-code-error" className="mt-3 text-xs" style={{ color: "var(--paw-clay)" }}>
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

              <div className="divider my-7" />

              <ul className="space-y-2.5">
                {[
                  "50% off your first stay (applied at checkout)",
                  "First choice of dates — Founders pick first",
                  "Early check-in & VIP welcome bag",
                  "10% off everything, for life",
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
                    Public Pre-Launch • No Code Needed
                  </div>
                  <h2 className="font-display text-3xl sm:text-4xl mt-2 leading-tight" style={{ color: "var(--paw-ink)" }}>
                    <em className="not-italic" style={{ color: "var(--paw-clay)" }}>20% off</em> every booking.
                  </h2>
                </div>
              </div>
              <p className="text-sm leading-relaxed mb-6" style={{ color: "var(--paw-ink-2)" }}>
                Open to everyone for pre-launch. 20% off any cabin, any night — no code, no waitlist, no membership. Just pick your dates. After we open December 1, 2027, rates return to standard.
              </p>

              <button
                data-testid="public-continue-button"
                onClick={handlePublic}
                className="paw-btn-secondary w-full sm:w-auto"
              >
                Reserve with 20% off — no code
                <ArrowRight size={14} strokeWidth={1.5} className="inline ml-2 -mt-0.5" />
              </button>

              <div className="divider my-7" style={{ background: "var(--paw-line)" }} />
              <ul className="space-y-2.5">
                {[
                  "20% off every booking — no code, no email signup",
                  "All taxes & fees included",
                  "Free reschedule or refund up to 14 days before stay",
                  "Final preview photos & arrival details sent before launch",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-sm" style={{ color: "var(--paw-ink-2)" }}>
                    <Check size={15} strokeWidth={1.5} style={{ color: "var(--paw-clay)", marginTop: 3 }} />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-6 text-xs text-center" style={{ color: "var(--paw-muted)" }}>
            Phase 1 • only 12 cabins • Founders pick dates first, then everyone else. Once a date is taken, it's gone.
          </p>
        </div>
      </section>

      {/* PROPERTY STATEMENT — bandana dog */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-7">
          <div className="overline mb-5" style={{ color: "var(--paw-clay)" }}>
            The USA's first &amp; only
          </div>
          <h2 className="font-display text-4xl sm:text-5xl leading-[1.05]" style={{ color: "var(--paw-ink)" }}>
            A dog-first luxury nature hotel — glass cabins in the pines.
          </h2>
          <p className="mt-7 text-lg leading-relaxed max-w-xl" style={{ color: "var(--paw-ink-2)" }}>
            Located in Goodrich, TX. A private fenced yard at every door. A dog concierge on staff. Food trucks under the trees, a coffee window with free Pup Cups, and a dog park that's just yours and the pack's. Bring your humans, bring your dogs — leave the rest behind.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-6 max-w-xl">
            {[
              ["12", "Glass cabins"],
              ["100", "Founders, period"],
              ["Dec '27", "Doors open"],
            ].map(([n, l]) => (
              <div key={l}>
                <div className="font-display text-4xl" style={{ color: "var(--paw-forest)" }}>
                  {n}
                </div>
                <div className="overline mt-1" style={{ color: "var(--paw-muted)" }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="md:col-span-5 relative">
          <img src={BANDANA_DOG} alt="A PawHaus pup wandering the pines at sunset" className="w-full h-[560px] object-cover" />
        </div>
      </section>

      {/* INSIDE THE CABIN — bedroom shot */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-7 order-2 md:order-1 relative">
            <img src={BEDROOM} alt="Inside a PawHaus cabin: king bed, lake at sunrise" className="w-full h-[560px] object-cover" />
          </div>
          <div className="md:col-span-5 order-1 md:order-2">
            <div className="overline mb-5" style={{ color: "var(--paw-muted)" }}>
              Inside the haus
            </div>
            <h2 className="font-display text-4xl sm:text-5xl leading-[1.05]" style={{ color: "var(--paw-ink)" }}>
              Wake up to the lake. With your dog at the foot of the bed.
            </h2>
            <p className="mt-7 text-base leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
              Floor-to-ceiling glass. Memory-foam mattress dressed in linen. Two robes by the door. Two mugs already steaming on the nightstand. Your dog asleep in a sunbeam.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                ["BedDouble", "King or queen bed on a memory-foam mattress"],
                ["Bath", "Rainfall shower in a private bathroom"],
                ["ChefHat", "Small kitchenette + charcoal grill at every unit"],
                ["Flame", "Private wood fire pit + wood-fire hot tub (Standard & Monolith)"],
                ["Wifi", "WiFi & Netflix included"],
                ["PawPrint", "2–3 dog beds, food & water bowls, towel station"],
              ].map(([_, label]) => (
                <li key={label} className="flex items-start gap-3 text-sm" style={{ color: "var(--paw-ink-2)" }}>
                  <Check size={15} strokeWidth={1.5} style={{ color: "var(--paw-forest)", marginTop: 3 }} />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ON-SITE AMENITIES */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32">
        <div className="overline mb-4" style={{ color: "var(--paw-muted)" }}>
          On site
        </div>
        <h3 className="font-display text-4xl sm:text-5xl mb-12 max-w-2xl leading-tight" style={{ color: "var(--paw-ink)" }}>
          Everything you need is already here.
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-5">
          {[
            ["Dog concierge on site daily", "PawPrint", "forest"],
            ["Camp store: firewood, snacks, breakfast", "ShoppingBag", "clay"],
            ["PawHaus Coffee Co. window — Free Pup Cups always", "Coffee", "forest"],
            ["Food trucks every lunch &amp; dinner", "ChefHat", "clay"],
            ["Dog groomer Wed–Sun", "Sparkles", "forest"],
            ["Massage therapist by appointment", "Sparkles", "clay"],
            ["Therapist (for you &amp; your dog) by appointment", "PawPrint", "forest"],
            ["Sunrise Pack Yoga — Saturday mornings", "Sunrise", "clay"],
            ["Dog park, pickleball court &amp; pine-trails", "Trees", "forest"],
          ].map(([t, _icon, tone]) => (
            <div key={t} className="flex items-start gap-3 text-sm pb-4 border-b" style={{ color: "var(--paw-ink-2)", borderColor: "var(--paw-line)" }}>
              <PawPrint size={14} strokeWidth={1.5} style={{ color: tone === "clay" ? "var(--paw-clay)" : "var(--paw-forest)", marginTop: 3 }} />
              <span dangerouslySetInnerHTML={{ __html: t }} />
            </div>
          ))}
        </div>
      </section>

      {/* COFFEE + YOGA DUO */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="relative overflow-hidden">
            <img src={COFFEE} alt="PawHaus Coffee Co. — Free Pup Cups" className="w-full h-[520px] object-cover" />
            <div
              className="absolute bottom-0 left-0 right-0 p-7"
              style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(26,35,28,0.85) 100%)" }}
            >
              <div className="overline mb-2" style={{ color: "rgba(232,217,200,0.95)" }}>
                <Coffee size={12} strokeWidth={1.8} className="inline -mt-0.5 mr-2" />
                PawHaus Coffee Co.
              </div>
              <h3 className="font-display text-3xl text-white">Free Pup Cups. Always.</h3>
              <p className="mt-2 text-sm" style={{ color: "rgba(250,249,246,0.88)" }}>
                Pour-over for you. Whipped cream &amp; a biscuit for them. Window's open all day.
              </p>
            </div>
          </div>
          <div className="relative overflow-hidden">
            <img src={YOGA} alt="Sunrise Pack Yoga on the lake deck" className="w-full h-[520px] object-cover" />
            <div
              className="absolute bottom-0 left-0 right-0 p-7"
              style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(26,35,28,0.85) 100%)" }}
            >
              <div className="overline mb-2" style={{ color: "rgba(232,217,200,0.95)" }}>
                <Sunrise size={12} strokeWidth={1.8} className="inline -mt-0.5 mr-2" />
                Sunrise Pack Yoga
              </div>
              <h3 className="font-display text-3xl text-white">Saturdays on the lake deck.</h3>
              <p className="mt-2 text-sm" style={{ color: "rgba(250,249,246,0.88)" }}>
                Bring your mat. Bring your dog. The mist on the water does the rest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MIRROR CABIN + GALLERY */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32 grid grid-cols-1 md:grid-cols-12 gap-5">
        <img src={MIRROR_CABIN} alt="A mirrored cabin disappears into the pines" className="md:col-span-7 w-full h-[560px] object-cover" />
        <div className="md:col-span-5 flex flex-col gap-5">
          <img src={HOT_TUB} alt="Private wood-fire hot tub at sunset" className="w-full h-[270px] object-cover" />
          <img src={DJI_AERIAL} alt="The lake from above" className="w-full h-[270px] object-cover" />
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
            ["Final reveal & first stays", "December 1, 2027"],
          ].map(([title, status]) => (
            <div key={title} className="paw-card p-6" style={{ background: "var(--paw-bg)" }}>
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
          Once the final reveal is set up ahead of our December 1, 2027 opening, if for any reason you're not happy with the result — you get a full refund. No questions asked.
        </p>
      </section>

      {/* CLOSING CTA */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32">
        <div className="relative overflow-hidden" style={{ background: "var(--paw-forest)" }}>
          <img src={DJI_AERIAL2} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="relative px-8 sm:px-14 py-20 sm:py-24 max-w-3xl">
            <div className="overline mb-4" style={{ color: "rgba(232,217,200,0.9)" }}>
              Reserve a slot
            </div>
            <h3 className="font-display text-4xl sm:text-5xl text-white leading-tight">
              Founders pick first. Dates won't last.
            </h3>
            <p className="mt-5 text-base max-w-xl" style={{ color: "rgba(250,249,246,0.85)" }}>
              100 Founders. 12 cabins. Once a weekend is claimed, it's claimed.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3">
              <button
                data-testid="footer-cta-vip"
                onClick={() => document.querySelector('[data-testid="vip-code-input"]')?.scrollIntoView({ behavior: "smooth", block: "center" })}
                className="paw-btn-secondary"
                style={{ borderColor: "rgba(250,249,246,0.9)", color: "rgba(250,249,246,0.95)", background: "transparent" }}
              >
                I have a Founders code
              </button>
              <button
                data-testid="footer-cta-public"
                onClick={handlePublic}
                className="paw-btn-primary"
                style={{ background: "var(--paw-clay)", borderColor: "var(--paw-clay)" }}
              >
                Continue with 20% off — no code
                <ArrowRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
