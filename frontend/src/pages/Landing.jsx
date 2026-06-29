import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, MapPin, Coffee, Flame, Trees, Wifi, ShoppingBag, Bath, ChefHat, PawPrint, Sparkles, Sunrise, ShieldCheck, Syringe, Moon, DollarSign, Users, AlertCircle } from "lucide-react";
import { track } from "@/lib/analytics";
import EmailCTA from "@/components/paw/EmailCTA";
import FaqSection from "@/components/paw/FaqSection";
import FounderSection from "@/components/paw/FounderSection";
import DogDifferenceSection from "@/components/paw/DogDifferenceSection";
import MobileStickyBar from "@/components/paw/MobileStickyBar";
import ExitIntentModal from "@/components/paw/ExitIntentModal";

// PawHaus brand assets — served as optimised webp from /public/brand/
const HERO_IMG = "/brand/hero.webp";
const BEDROOM = "/brand/bedroom.webp";
const MIRROR_CABIN = "/brand/mirror.webp";
const BANDANA_DOG = "/brand/bandana_dog.webp";
const YOGA = "/brand/yoga.webp";
const DJI_AERIAL = "/brand/dji698.webp";
const DJI_AERIAL2 = "/brand/dji688.webp";
const HOT_TUB = "/brand/dsc.webp";
const CAMERON_RANCH = "/brand/cameron-ranch.webp";

export default function Landing() {
  const navigate = useNavigate();

  const handlePublic = () => {
    track("public_cta_clicked", { tier: "PUBLIC", discount_percent: 0.25 });
    navigate("/booking");
  };

  return (
    <div data-testid="landing-page" className="w-full">
      {/* TOP BANNER */}
      <div
        data-testid="prelaunch-banner"
        className="w-full text-center py-2.5 text-xs"
        style={{ background: "var(--paw-forest)", color: "var(--paw-bg)", letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500 }}
      >
        <Sparkles size={11} strokeWidth={1.8} className="inline -mt-0.5 mr-2" />
        Pre-Launch Pricing — 30% off every booking, no code needed
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
                  Pre-Launch • Goodrich, TX
                </span>
              </div>
              <h1 className="font-display text-white text-5xl sm:text-7xl leading-[1.02] tracking-tight" style={{ fontWeight: 400 }}>
                Reserve your first stay
                <br />
                at <em className="not-italic" style={{ color: "#E8D9C8" }}>PawHaus Resort.</em>
              </h1>
              <p className="mt-7 text-lg max-w-xl leading-relaxed" style={{ color: "rgba(250,249,246,0.92)" }}>
                Twelve glass-and-pine cabins. A private yard at every door. The USA&apos;s first dog-first luxury nature hotel — opening January 1, 2027.
              </p>
            </div>
          </div>
        </div>

        {/* PUBLIC OFFER — single, centered */}
        <div className="mx-auto max-w-[1400px] px-6 sm:px-10 -mt-24 relative z-10">
          <div className="max-w-3xl mx-auto">
            <div
              data-testid="public-card"
              className="paw-card p-10 fade-in stagger-2"
              style={{ background: "var(--paw-bg)" }}
            >
              <div className="overline mb-3" style={{ color: "var(--paw-clay)" }}>
                Public Pre-Launch • No Code Needed
              </div>
              <h2 className="font-display text-4xl sm:text-5xl leading-tight" style={{ color: "var(--paw-ink)" }}>
                <em className="not-italic" style={{ color: "var(--paw-clay)" }}>30% off</em> every booking.
              </h2>
              <p className="text-base leading-relaxed mt-5 mb-8" style={{ color: "var(--paw-ink-2)" }}>
                Open to everyone for pre-launch. 30% off any cabin, any night — no code, no waitlist, no membership. Just pick your dates. After we open January 1, 2027, rates return to standard.
              </p>

              <button
                data-testid="public-continue-button"
                onClick={handlePublic}
                className="paw-btn-primary w-full sm:w-auto"
                style={{ background: "var(--paw-clay)", borderColor: "var(--paw-clay)" }}
              >
                Reserve with 30% off
                <ArrowRight size={14} strokeWidth={1.5} className="inline ml-2 -mt-0.5" />
              </button>

              <div className="divider my-8" style={{ background: "var(--paw-line)" }} />
              <ul className="space-y-2.5">
                {[
                  "30% off every booking — no code, no email signup",
                  "Welcome bandana + free spa treatment for every dog (nail trim or blueberry facial)",
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
            Phase 1 • only 12 cabins • Once a date is taken, it&apos;s gone.
          </p>
        </div>
      </section>

      {/* PROPERTY STATEMENT — bandana dog */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32 grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-7">
          <div className="overline mb-5" style={{ color: "var(--paw-clay)" }}>
            The USA&apos;s first &amp; only
          </div>
          <h2 className="font-display text-4xl sm:text-5xl leading-[1.05]" style={{ color: "var(--paw-ink)" }}>
            A dog-first luxury nature hotel — glass cabins in the pines.
          </h2>
          <p className="mt-7 text-lg leading-relaxed max-w-xl" style={{ color: "var(--paw-ink-2)" }}>
            Located in Goodrich, TX. A private fenced yard at every door. A dog concierge on staff. Food trucks under the trees, free Pup Cups at the camp store, and a dog park that&apos;s just yours and the pack&apos;s. Bring your humans, bring your dogs — leave the rest behind.
          </p>
          <div className="mt-8 grid grid-cols-3 gap-6 max-w-xl">
            {[
              ["12", "Glass cabins"],
              ["30%", "Pre-launch off"],
              ["Dec '26", "Doors open"],
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

      {/* CAMERON RANCH CREDIBILITY */}      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-6 order-2 md:order-1">
            <div
              className="border-l-2 pl-8 sm:pl-10"
              style={{ borderColor: "var(--paw-clay)" }}
            >
              <div className="overline mb-3" style={{ color: "var(--paw-clay)" }}>
                Built by the team behind
              </div>
              <h3 className="font-display text-3xl sm:text-4xl leading-tight" style={{ color: "var(--paw-ink)" }}>
                Cameron Ranch Glamping.
              </h3>
              <p className="mt-4 text-base leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
                We founded Cameron Ranch Glamping — one of the most viral and highly acclaimed glamping properties in the USA. PawHaus Resort is the next chapter, built for the one guest the original couldn&apos;t fully serve: your dog.
              </p>
            </div>
          </div>
          <div className="md:col-span-6 order-1 md:order-2">
            <img
              src={CAMERON_RANCH}
              alt="Cameron Ranch Glamping — mirror cabin in the trees"
              className="w-full h-[480px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* FOUNDER — face + story */}
      <FounderSection />

      {/* DOG DIFFERENCE — what we do differently for dogs */}
      <DogDifferenceSection />

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
                "King or queen bed on a memory-foam mattress",
                "Rainfall shower in a private bathroom",
                "Small kitchenette + charcoal grill at every unit",
                "Private wood fire pit at every cabin + wood-fire hot tub (Monolith only)",
                "WiFi included",
                "2–3 dog beds, food & water bowls, towel station",
              ].map((label) => (
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
            ["Dog concierge on site daily", "forest"],
            ["Camp store: firewood, snacks, breakfast", "clay"],
            ["Free Pup Cups always in the camp store", "forest"],
            ["Food trucks Wed–Sun", "clay"],
            ["Dog groomer Wed–Sun", "forest"],
            ["Massage therapist by appointment", "clay"],
            ["Therapist (for you & your dog) by appointment", "forest"],
            ["Sunrise Pack Yoga — Saturday mornings", "clay"],
            ["Dog park, pickleball court & pine-trails", "forest"],
          ].map(([t, tone]) => (
            <div key={t} className="flex items-start gap-3 text-sm pb-4 border-b" style={{ color: "var(--paw-ink-2)", borderColor: "var(--paw-line)" }}>
              <PawPrint size={14} strokeWidth={1.5} style={{ color: tone === "clay" ? "var(--paw-clay)" : "var(--paw-forest)", marginTop: 3 }} />
              <span>{t}</span>
            </div>
          ))}
        </div>
      </section>

      {/* SUNRISE PACK YOGA */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32">
        <div className="relative overflow-hidden max-w-3xl mx-auto">
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
      </section>

      {/* HOUSE RULES */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32" data-testid="house-rules-section">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <div className="overline mb-4" style={{ color: "var(--paw-clay)" }}>
              The fine print, in plain English
            </div>
            <h3 className="font-display text-4xl sm:text-5xl leading-[1.05]" style={{ color: "var(--paw-ink)" }}>
              House rules.
            </h3>
            <p className="mt-6 text-base leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
              We keep PawHaus calm, clean, and safe for every dog on property. Six simple rules — read them before you book.
            </p>
          </div>
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                icon: <ShieldCheck size={18} strokeWidth={1.5} />,
                title: "Temperament tested",
                body: "Every dog is briefly screened on arrival. Aggressive or reactive dogs cannot stay — for the safety of the pack.",
              },
              {
                icon: <Syringe size={18} strokeWidth={1.5} />,
                title: "Vaccines verified",
                body: "Rabies & DHPP required. Bordetella required if using grooming or the public dog park. Bring records to check-in.",
              },
              {
                icon: <Moon size={18} strokeWidth={1.5} />,
                title: "Quiet hours 10 PM – 8 AM",
                body: "Outdoor music off, voices low. Excessive barking after hours may result in being asked to leave.",
              },
              {
                icon: <Users size={18} strokeWidth={1.5} />,
                title: "Stay within cabin pet limits",
                body: "Petite: up to 2 pets • Standard & Monolith: up to 3 pets. No exceptions — for everyone's comfort.",
              },
              {
                icon: <DollarSign size={18} strokeWidth={1.5} />,
                title: "$250 refundable damage deposit",
                body: "Pre-authorised at check-in. Released within 24 hours of check-out if no damage occurs.",
              },
              {
                icon: <AlertCircle size={18} strokeWidth={1.5} />,
                title: "Never leave dogs unattended",
                body: "Dogs may not be left alone in cabins. Use the dog park, on-site daycare or our concierge if you need a break.",
              },
            ].map((r) => (
              <div key={r.title} className="paw-card p-6" style={{ background: "var(--paw-bg)" }}>
                <div className="flex items-center gap-3 mb-3" style={{ color: "var(--paw-forest)" }}>
                  {r.icon}
                  <span className="overline">{r.title}</span>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
                  {r.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection />


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
            ["Final reveal & first stays", "January 1, 2027"],
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
          Once the final reveal is set up ahead of our January 1, 2027 opening, if for any reason you&apos;re not happy with the result — you get a full refund. No questions asked.
        </p>
      </section>

      {/* CLOSING CTA */}
      <EmailCTA variant="hero" />

      <section className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32">
        <div className="relative overflow-hidden" style={{ background: "var(--paw-forest)" }}>
          <img src={DJI_AERIAL2} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
          <div className="relative px-8 sm:px-14 py-20 sm:py-24 max-w-3xl">
            <div className="overline mb-4" style={{ color: "rgba(232,217,200,0.9)" }}>
              Reserve a slot
            </div>
            <h3 className="font-display text-4xl sm:text-5xl text-white leading-tight">
              12 cabins. Limited weekends. Dates won&apos;t last.
            </h3>
            <p className="mt-5 text-base max-w-xl" style={{ color: "rgba(250,249,246,0.85)" }}>
              Once a weekend is claimed, it&apos;s claimed. Lock in 30% off pre-launch pricing today.
            </p>
            <div className="mt-9">
              <button
                data-testid="footer-cta-public"
                onClick={handlePublic}
                className="paw-btn-primary"
                style={{ background: "var(--paw-clay)", borderColor: "var(--paw-clay)" }}
              >
                Reserve with 30% off
                <ArrowRight size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile sticky CTA bar + Exit-intent modal — visible only on landing */}
      <MobileStickyBar />
      <ExitIntentModal />
    </div>
  );
}
