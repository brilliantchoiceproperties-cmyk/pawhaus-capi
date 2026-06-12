import React, { useEffect, useState, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Trash2, Plus, ShieldCheck, CalendarDays, PawPrint, ChevronDown, ChevronLeft, ChevronRight, Bath, ChefHat, Waves, TreePine, Coffee, Wifi, AlertCircle, Scissors, Sparkles, Gift } from "lucide-react";
import { useBooking } from "@/context/BookingContext";
import { createCheckoutSession } from "@/lib/paw-api";
import { getReferrer } from "@/lib/referral";
import { track, identify } from "@/lib/analytics";
import SummaryCard from "@/components/paw/SummaryCard";
import EmailCTA from "@/components/paw/EmailCTA";
import ScarcityTicker from "@/components/paw/ScarcityTicker";
import TrustStrip from "@/components/paw/TrustStrip";

// Date constraints
const MIN_CHECKIN = "2026-12-01"; // doors open Dec 1, 2026
const BLACKOUT_MONTH_DAYS = ["12-24", "12-25", "12-31"]; // Christmas Eve, Christmas, NYE — annual

// PawHaus brand assets — multi-image galleries per room (served from /public/brand/)
const ROOM_GALLERIES = {
  petite: [
    "/brand/petite-0.webp",
    "/brand/petite-1.webp",
    "/brand/petite-2.webp",
    "/brand/petite-3.webp",
  ],
  standard: [
    "/brand/standard-0.webp",
    "/brand/standard-1.webp",
    "/brand/standard-2.webp",
    "/brand/standard-3.webp",
  ],
  monolith: [
    "/brand/monolith-0.webp",
    "/brand/bedroom.webp",
    "/brand/monolith-2.webp",
    "/brand/monolith-3.webp",
  ],
};

const ROOM_DETAILS = [
  { label: "In-cabin shower & private bathroom", icon: Bath },
  { label: "Small kitchenette", icon: ChefHat },
  { label: "Lake access", icon: Waves },
  { label: "Pool, dog park & pine trails", icon: TreePine },
  { label: "Lobby, camp store & food trucks", icon: Coffee },
  { label: "WiFi included", icon: Wifi },
];

export default function Booking() {
  const navigate = useNavigate();
  const { catalog, tier, tierLabel, discountPercent, roomId, setRoomId, stayId, setStayId, guests, setGuests } = useBooking();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [rulesAccepted, setRulesAccepted] = useState(false);

  // Guard: must have a tier to be here
  if (!tier) {
    return <Navigate to="/" replace />;
  }

  if (!catalog) {
    return (
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 py-32 text-center" data-testid="booking-loading">
        <p className="overline" style={{ color: "var(--paw-muted)" }}>
          Loading your reservation…
        </p>
      </div>
    );
  }

  const canContinueFromStep1 = !!roomId && !!stayId;
  const canContinueFromStep2 =
    guests.full_name.trim() && guests.email.trim() && guests.phone.trim() && guests.check_in && !guests.date_error;

  const handlePay = async () => {
    setSubmitError("");
    setSubmitting(true);
    identify(guests.email, { full_name: guests.full_name, tier });
    track("checkout_initiated", {
      tier,
      room_id: roomId,
      stay_id: stayId,
      pets_count: guests.pets.filter((p) => p.name.trim()).length,
    });
    try {
      const payload = {
        room_id: roomId,
        stay_id: stayId,
        tier,
        origin_url: window.location.origin,
        referrer_code: getReferrer(),
        booking: {
          ...guests,
          pets: guests.pets.filter((p) => p.name.trim()),
        },
      };
      const { url, session_id } = await createCheckoutSession(payload);
      track("checkout_redirect", { session_id, tier });
      window.location.href = url;
    } catch (e) {
      const detail = e?.response?.data?.detail || "Something went wrong. Please try again.";
      setSubmitError(detail);
      track("checkout_failed", { detail, tier });
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="booking-page" className="mx-auto max-w-[1400px] px-6 sm:px-10 py-12">
      {/* SCARCITY BANNER */}
      <div
        className="mb-6 border px-5 py-3 text-xs leading-relaxed"
        style={{ borderColor: "var(--paw-line)", color: "var(--paw-ink-2)", background: "var(--paw-bg-2)" }}
      >
        <span className="overline mr-2" style={{ color: "var(--paw-clay)" }}>
          Phase 1
        </span>
        Only 12 cabins. Pre-launch pricing — 30% off every booking. Once a date is taken, it&apos;s gone.
      </div>

      <div className="mb-10">
        <EmailCTA variant="inline" />
      </div>

      {/* STEP TRACKER */}
      <div className="flex flex-wrap items-center gap-7 mb-12" data-testid="step-tracker">
        {[
          [1, "Stay"],
          [2, "Guests & Pets"],
          [3, "Review"],
        ].map(([n, label]) => (
          <div key={n} className={`step-dot ${step === n ? "active" : ""}`}>
            <span className="num">{String(n).padStart(2, "0")}</span>
            <span>•</span>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <main className="lg:col-span-8">
          {step === 1 && (
            <>
              <div className="mb-6">
                <ScarcityTicker />
              </div>
              <StepStay
                catalog={catalog}
                roomId={roomId}
                setRoomId={setRoomId}
                stayId={stayId}
                setStayId={setStayId}
                discountPercent={discountPercent}
                tier={tier}
              />
            </>
          )}
          {step === 2 && (
            <StepGuests guests={guests} setGuests={setGuests} stayId={stayId} catalog={catalog} roomId={roomId} />
          )}
          {step === 3 && (
            <StepReview
              catalog={catalog}
              roomId={roomId}
              stayId={stayId}
              tierLabel={tierLabel}
              discountPercent={discountPercent}
              guests={guests}
              rulesAccepted={rulesAccepted}
              setRulesAccepted={setRulesAccepted}
            />
          )}

          {/* TRUST STRIP — shown on Step 3 just before the Pay button */}
          {step === 3 && <TrustStrip />}

          {/* NAV */}
          <div className="mt-12 flex items-center justify-between">
            <button
              data-testid="booking-back-button"
              onClick={() => (step === 1 ? navigate("/") : setStep((s) => s - 1))}
              className="paw-btn-secondary"
            >
              <ArrowLeft size={14} strokeWidth={1.5} className="inline mr-2 -mt-0.5" />
              {step === 1 ? "Back to landing" : "Back"}
            </button>

            {step < 3 ? (
              <button
                data-testid="booking-next-button"
                onClick={() => setStep((s) => s + 1)}
                disabled={(step === 1 && !canContinueFromStep1) || (step === 2 && !canContinueFromStep2)}
                className="paw-btn-primary"
              >
                {step === 1 ? "Add Guest Details" : "Review Reservation"}
                <ArrowRight size={14} strokeWidth={1.5} />
              </button>
            ) : (
              <button
                data-testid="booking-pay-button"
                onClick={handlePay}
                disabled={submitting || !rulesAccepted}
                className="paw-btn-primary"
                style={{ background: "var(--paw-clay)", borderColor: "var(--paw-clay)" }}
              >
                <ShieldCheck size={14} strokeWidth={1.5} />
                {submitting ? "Redirecting to Stripe…" : "Pay Securely"}
              </button>
            )}
          </div>
          {submitError && (
            <p data-testid="booking-pay-error" className="mt-4 text-sm" style={{ color: "var(--paw-clay)" }}>
              {submitError}
            </p>
          )}
        </main>

        <div className="lg:col-span-4">
          <SummaryCard roomId={roomId} stayId={stayId} tier={tier} catalog={catalog} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STEP 1
// ---------------------------------------------------------------------------

function StepStay({ catalog, roomId, setRoomId, stayId, setStayId, discountPercent, tier }) {
  const handleRoomSelect = (id) => {
    setRoomId(id);
    track("room_selected", { room_id: id });
  };
  const handleStaySelect = (id) => {
    setStayId(id);
    track("stay_option_selected", { stay_id: id });
  };
  return (
    <section data-testid="step-stay">
      <div className="overline mb-3" style={{ color: "var(--paw-muted)" }}>
        Step One
      </div>
      <h2 className="font-display text-4xl sm:text-5xl mb-3" style={{ color: "var(--paw-ink)" }}>
        Choose your retreat.
      </h2>
      <p className="text-base leading-relaxed mb-10 max-w-xl" style={{ color: "var(--paw-ink-2)" }}>
        Three architectural homes, all glass and pine. Pick what suits you and the pack.
      </p>

      <div className="space-y-5">
        {catalog.rooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            selected={roomId === room.id}
            onSelect={() => handleRoomSelect(room.id)}
            discountPercent={discountPercent}
            stayId={stayId}
            catalog={catalog}
            tier={tier}
          />
        ))}
      </div>

      <h3 className="font-display text-2xl mt-12 mb-5" style={{ color: "var(--paw-ink)" }}>
        Pick your stay.
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {catalog.stay_options.map((s) => {
          const selected = stayId === s.id;
          return (
            <button
              key={s.id}
              data-testid={`stay-option-${s.id}`}
              onClick={() => handleStaySelect(s.id)}
              className="paw-card p-4 text-left"
              style={{
                background: selected ? "var(--paw-forest)" : "var(--paw-bg)",
                color: selected ? "var(--paw-bg)" : "var(--paw-ink)",
                borderColor: selected ? "var(--paw-forest)" : "var(--paw-line)",
              }}
            >
              <div
                className="overline mb-2"
                style={{ color: selected ? "rgba(250,249,246,0.7)" : "var(--paw-muted)" }}
              >
                {s.type === "MIXED" ? "Long Weekend" : s.type}
              </div>
              <div className="font-display text-xl">{s.nights} {s.nights === 1 ? "Night" : "Nights"}</div>
            </button>
          );
        })}
      </div>
      {stayId === "WEEKEND_2N" && (
        <p className="mt-3 text-xs" style={{ color: "var(--paw-muted)" }}>
          Weekend 2 Nights • Arrive Thu, Fri, or Sat. Blackout: Christmas, NYE, July 4th (±2 days).
        </p>
      )}
      {stayId === "LONG_3N" && (
        <p className="mt-3 text-xs" style={{ color: "var(--paw-clay)" }}>
          Long Weekend • Best per-night value. Any 3 consecutive nights. Blackout: Christmas, NYE, July 4th (±2 days).
        </p>
      )}
    </section>
  );
}

// Room card with image carousel + slashed pricing + "more details" dropdown
function RoomCard({ room, selected, onSelect, discountPercent, stayId, catalog, tier }) {
  const gallery = ROOM_GALLERIES[room.id] || ["/brand/hero.webp"];
  const [imgIdx, setImgIdx] = useState(0);
  const [expanded, setExpanded] = useState(false);

  // Use the total that matches the currently selected stay
  const stay = catalog?.stay_options?.find((s) => s.id === stayId);
  const stayType = stay?.type || "WEEKDAY";
  const nights = stay?.nights || 1;
  const basePrice = room.stay_totals?.[stayId] ?? 0;
  const discounted = Math.round(basePrice * (1 - (discountPercent || 0)));
  const stayLabel =
    stayType === "MIXED"
      ? `long weekend • ${nights}n`
      : `${stayType === "WEEKEND" ? "weekend" : "weekday"} • ${nights}n`;

  const nextImg = (e) => {
    e.stopPropagation();
    setImgIdx((i) => (i + 1) % gallery.length);
  };
  const prevImg = (e) => {
    e.stopPropagation();
    setImgIdx((i) => (i - 1 + gallery.length) % gallery.length);
  };

  return (
    <div
      data-testid={`room-card-${room.id}`}
      onClick={onSelect}
      className="paw-card w-full text-left grid grid-cols-1 md:grid-cols-12 overflow-hidden cursor-pointer"
      style={{
        background: selected ? "var(--paw-bg-2)" : "var(--paw-bg)",
        borderColor: selected ? "var(--paw-forest)" : "var(--paw-line)",
      }}
    >
      <div className="md:col-span-5 relative">
        <img
          src={gallery[imgIdx]}
          alt={`${room.name} ${imgIdx + 1}`}
          className="w-full h-64 md:h-full object-cover"
        />
        {gallery.length > 1 && (
          <>
            <button
              data-testid={`room-${room.id}-prev`}
              onClick={prevImg}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
              style={{ background: "rgba(250,249,246,0.92)", borderRadius: "50%" }}
            >
              <ChevronLeft size={18} strokeWidth={1.5} style={{ color: "var(--paw-ink)" }} />
            </button>
            <button
              data-testid={`room-${room.id}-next`}
              onClick={nextImg}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
              style={{ background: "rgba(250,249,246,0.92)", borderRadius: "50%" }}
            >
              <ChevronRight size={18} strokeWidth={1.5} style={{ color: "var(--paw-ink)" }} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {gallery.map((src, i) => (
                <span
                  key={src}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: i === imgIdx ? "var(--paw-bg)" : "rgba(250,249,246,0.5)" }}
                />
              ))}
            </div>
          </>
        )}
      </div>
      <div className="md:col-span-7 p-7">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="overline" style={{ color: "var(--paw-forest)" }}>
            {room.bed}
          </span>
          {room.has_hot_tub && (
            <span className="overline" style={{ color: "var(--paw-clay)" }}>
              Hot Tub Included
            </span>
          )}
          <span className="overline" style={{ color: "var(--paw-muted)" }}>
            {room.capacity}
          </span>
        </div>
        <h3 className="font-display text-3xl mb-3" style={{ color: "var(--paw-ink)" }}>
          {room.name}
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
          {room.description}
        </p>

        {/* Slashed pricing — anchored & punchy */}
        <div className="mt-5">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <span className="text-sm" style={{ color: "var(--paw-muted)" }}>
              From
            </span>
            {discountPercent > 0 && (
              <span
                data-testid={`room-${room.id}-strike-price`}
                className="text-base line-through"
                style={{ color: "var(--paw-muted)" }}
              >
                ${basePrice.toFixed(0)}
              </span>
            )}
            <span
              data-testid={`room-${room.id}-discount-price`}
              className="font-display text-3xl"
              style={{ color: "var(--paw-clay)" }}
            >
              ${discounted}
            </span>
            <span className="text-sm" style={{ color: "var(--paw-muted)" }}>
              /{stayLabel}
            </span>
            {discountPercent > 0 && (
              <span
                data-testid={`room-${room.id}-savings-badge`}
                className="overline ml-1 px-2 py-1"
                style={{
                  background: "var(--paw-forest)",
                  color: "var(--paw-bg)",
                  borderRadius: 2,
                  fontSize: "10px",
                }}
              >
                Save ${(basePrice - discounted).toFixed(0)}
              </span>
            )}
          </div>
          <div
            className="mt-1.5 text-xs"
            style={{ color: "var(--paw-forest)" }}
          >
            + free welcome bandana &amp; spa treatment per dog (worth $40)
          </div>
        </div>

        {/* More details dropdown */}
        <button
          type="button"
          data-testid={`room-${room.id}-details-toggle`}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          className="mt-5 inline-flex items-center gap-1.5 text-xs"
          style={{
            color: "var(--paw-forest)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          {expanded ? "Hide details" : "More details"}
          <ChevronDown
            size={14}
            strokeWidth={1.8}
            style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
          />
        </button>
        {expanded && (
          <div
            data-testid={`room-${room.id}-details-panel`}
            className="mt-4 pt-4 border-t"
            style={{ borderColor: "var(--paw-line)" }}
          >
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <li
                className="flex items-start gap-2.5 text-sm"
                style={{ color: "var(--paw-ink-2)" }}
              >
                <CalendarDays size={14} strokeWidth={1.5} style={{ color: "var(--paw-forest)", marginTop: 3 }} />
                Check-in 4:00 PM • Check-out 11:00 AM
              </li>
              {ROOM_DETAILS.map(({ label, icon: Icon }) => (
                <li
                  key={label}
                  className="flex items-start gap-2.5 text-sm"
                  style={{ color: "var(--paw-ink-2)" }}
                >
                  <Icon size={14} strokeWidth={1.5} style={{ color: "var(--paw-forest)", marginTop: 3 }} />
                  {label}
                </li>
              ))}
              {room.has_hot_tub && (
                <li className="flex items-start gap-2.5 text-sm" style={{ color: "var(--paw-ink-2)" }}>
                  <PawPrint size={14} strokeWidth={1.5} style={{ color: "var(--paw-clay)", marginTop: 3 }} />
                  Private wood-fire hot tub (included)
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// STEP 2
// ---------------------------------------------------------------------------

function StepGuests({ guests, setGuests, stayId, catalog, roomId }) {
  const update = (k, v) => setGuests({ ...guests, [k]: v });
  const stay = catalog?.stay_options?.find((s) => s.id === stayId);
  const nights = stay?.nights || 1;
  const room = catalog?.rooms?.find((r) => r.id === roomId);
  const maxPets = room?.max_pets || 2;
  const atMaxPets = guests.pets.length >= maxPets;

  // Auto-derive check_out from check_in + nights
  useEffect(() => {
    if (!guests.check_in) return;
    const d = new Date(guests.check_in + "T00:00:00");
    if (isNaN(d.getTime())) return;
    d.setDate(d.getDate() + nights);
    const iso = d.toISOString().slice(0, 10);
    if (iso !== guests.check_out) {
      setGuests({ ...guests, check_out: iso });
    }
    // eslint-disable-next-line
  }, [guests.check_in, nights]);

  // Date validation: must be ≥ launch date AND no night during stay falls on a blackout
  const dateError = useMemo(() => {
    if (!guests.check_in) return "";
    if (guests.check_in < MIN_CHECKIN) {
      return "We open December 1, 2026. Please pick a check-in date on or after Dec 1, 2026.";
    }
    const d = new Date(guests.check_in + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    for (let i = 0; i < nights; i++) {
      const md = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (BLACKOUT_MONTH_DAYS.includes(md)) {
        const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `${label} is a holiday blackout date (Christmas Eve, Christmas Day, or NYE). Please pick different dates.`;
      }
      d.setDate(d.getDate() + 1);
    }
    return "";
  }, [guests.check_in, nights]);

  // Expose to parent so the Next button can be disabled
  useEffect(() => {
    if (guests.date_error !== dateError) {
      setGuests({ ...guests, date_error: dateError });
    }
    // eslint-disable-next-line
  }, [dateError]);

  const updatePet = (i, k, v) => {
    const pets = [...guests.pets];
    pets[i] = { ...pets[i], [k]: v };
    setGuests({ ...guests, pets });
  };
  const addPet = () =>
    setGuests({
      ...guests,
      pets: [
        ...guests.pets,
        {
          id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `pet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          name: "",
          breed: "",
          size: "Medium (25-60 lb)",
          special_needs: "",
          spa_perk: "nail_trim",
        },
      ],
    });
  const removePet = (i) => setGuests({ ...guests, pets: guests.pets.filter((_, idx) => idx !== i) });

  return (
    <section data-testid="step-guests">
      <div className="overline mb-3" style={{ color: "var(--paw-muted)" }}>
        Step Two
      </div>
      <h2 className="font-display text-4xl sm:text-5xl mb-3" style={{ color: "var(--paw-ink)" }}>
        Who is joining us?
      </h2>
      <p className="text-base leading-relaxed mb-10 max-w-xl" style={{ color: "var(--paw-ink-2)" }}>
        We&apos;ll need a few details to prepare your suite and welcome your pack.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Full Name" testid="guest-name-input" value={guests.full_name} onChange={(v) => update("full_name", v)} />
        <Field label="Email" type="email" testid="guest-email-input" value={guests.email} onChange={(v) => update("email", v)} />
        <Field label="Phone" testid="guest-phone-input" value={guests.phone} onChange={(v) => update("phone", v)} />
        <Field label="Guests" type="number" testid="guest-count-input" value={guests.guests} onChange={(v) => update("guests", parseInt(v) || 1)} />
        <div>
          <Field label="Check-In" type="date" testid="guest-checkin-input" value={guests.check_in} onChange={(v) => update("check_in", v)} min={MIN_CHECKIN} />
          <p className="mt-2 text-xs" style={{ color: "var(--paw-muted)" }}>
            Earliest check-in: Dec 1, 2026 • Blackout dates: Dec 24, 25 & 31
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--paw-muted)" }}>
            Check-in 4:00 PM • Check-out 11:00 AM
          </p>
          {dateError && (
            <p
              data-testid="guest-checkin-error"
              className="mt-2 text-xs flex items-start gap-1.5"
              style={{ color: "var(--paw-clay)" }}
            >
              <AlertCircle size={13} strokeWidth={1.8} style={{ marginTop: 1 }} />
              {dateError}
            </p>
          )}
        </div>
        <label className="block">
          <span className="overline block mb-2" style={{ color: "var(--paw-muted)" }}>
            Check-Out (auto • {nights} {nights === 1 ? "night" : "nights"})
          </span>
          <div
            data-testid="guest-checkout-display"
            className="paw-input"
            style={{ background: "var(--paw-bg-2)", color: guests.check_out ? "var(--paw-ink)" : "var(--paw-muted)", cursor: "not-allowed" }}
          >
            {guests.check_out || "Pick a check-in date"}
          </div>
        </label>
      </div>

      <div className="mt-10">
        <h3 className="font-display text-2xl mb-2" style={{ color: "var(--paw-ink)" }}>
          Backup dates (optional)
        </h3>
        <p className="text-sm mb-4 max-w-xl leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
          Your booking isn&apos;t final yet — pick up to two backup arrival dates and we&apos;ll
          do our best to honor your first pick.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Backup #1" type="date" testid="guest-backup1-input" value={guests.backup_date_1} onChange={(v) => update("backup_date_1", v)} />
          <Field label="Backup #2" type="date" testid="guest-backup2-input" value={guests.backup_date_2} onChange={(v) => update("backup_date_2", v)} />
        </div>
      </div>

      <div className="mt-12">
        <div className="flex items-end justify-between mb-5">
          <div>
            <div className="overline mb-1" style={{ color: "var(--paw-clay)" }}>
              The Pack
            </div>
            <h3 className="font-display text-2xl" style={{ color: "var(--paw-ink)" }}>
              Tell us about the dogs.
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--paw-muted)" }}>
              {guests.no_pets
                ? "Coming without a dog — that's totally fine 🐾"
                : `${room?.name || "This room"} allows up to ${maxPets} pets (${guests.pets.length}/${maxPets} added)`}
            </p>
          </div>
          {!guests.no_pets && (
            <button
              data-testid="add-pet-button"
              onClick={addPet}
              disabled={atMaxPets}
              className="paw-btn-secondary text-xs"
              style={atMaxPets ? { opacity: 0.4, cursor: "not-allowed" } : {}}
            >
              <Plus size={14} strokeWidth={1.5} className="inline mr-2 -mt-0.5" />
              {atMaxPets ? "Max reached" : "Add a pet"}
            </button>
          )}
        </div>

        {/* "Coming without a dog" toggle */}
        <label
          data-testid="no-pets-toggle-label"
          className="flex items-start gap-3 cursor-pointer select-none mb-5 paw-card p-4"
          style={{ background: "var(--paw-bg-2)" }}
        >
          <input
            type="checkbox"
            data-testid="no-pets-toggle"
            checked={!!guests.no_pets}
            onChange={(e) => {
              const checked = e.target.checked;
              setGuests({
                ...guests,
                no_pets: checked,
                pets: checked ? [] : (guests.pets.length === 0 ? [{ id: `pet-${Date.now()}`, name: "", breed: "", size: "Medium (25-60 lb)", special_needs: "", spa_perk: "nail_trim" }] : guests.pets),
              });
            }}
            className="mt-1"
            style={{ accentColor: "var(--paw-clay)" }}
          />
          <span className="text-sm leading-relaxed" style={{ color: "var(--paw-ink)" }}>
            <strong>I&apos;m coming without a dog.</strong>{" "}
            <span style={{ color: "var(--paw-ink-2)" }}>
              You&apos;re still welcome — we partner with local shelters so you can spend the day with a dog who needs one, or just enjoy the property dog-free.
            </span>
          </span>
        </label>

        {!guests.no_pets && (
        <div
          data-testid="welcome-perks-banner"
          className="paw-card p-5 mb-5"
          style={{ background: "var(--paw-bg-2)", borderColor: "var(--paw-clay)", borderWidth: 1, borderStyle: "solid" }}
        >
          <div className="flex items-center gap-2 mb-2" style={{ color: "var(--paw-clay)" }}>
            <Gift size={15} strokeWidth={1.8} />
            <span className="overline">Welcome perks — free with every stay</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
            Every dog gets a <strong style={{ color: "var(--paw-ink)" }}>PawHaus welcome bandana</strong> on arrival,
            plus your choice of a complimentary <strong style={{ color: "var(--paw-ink)" }}>spa treatment</strong> below — nail trim or our signature blueberry facial. Pick one per dog.
          </p>
        </div>
        )}

        {!guests.no_pets && (
        <div className="space-y-5">
          {guests.pets.map((p, i) => (
            <div key={p.id || `pet-${i}`} className="paw-card p-5" data-testid={`pet-card-${i}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PawPrint size={14} strokeWidth={1.5} style={{ color: "var(--paw-forest)" }} />
                  <span className="overline" style={{ color: "var(--paw-muted)" }}>
                    Pet #{i + 1}
                  </span>
                </div>
                {guests.pets.length > 1 && (
                  <button
                    data-testid={`remove-pet-${i}`}
                    onClick={() => removePet(i)}
                    className="text-xs"
                    style={{ color: "var(--paw-clay)" }}
                  >
                    <Trash2 size={14} strokeWidth={1.5} className="inline mr-1 -mt-0.5" /> Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Field label="Name" testid={`pet-name-${i}`} value={p.name} onChange={(v) => updatePet(i, "name", v)} />
                <Field label="Breed" testid={`pet-breed-${i}`} value={p.breed} onChange={(v) => updatePet(i, "breed", v)} />
                <SelectField
                  label="Size"
                  testid={`pet-size-${i}`}
                  value={p.size}
                  onChange={(v) => updatePet(i, "size", v)}
                  options={["Small (<25 lb)", "Medium (25-60 lb)", "Large (60-100 lb)", "Giant (100+ lb)"]}
                />
                <Field
                  label="Special needs (optional)"
                  testid={`pet-needs-${i}`}
                  value={p.special_needs}
                  onChange={(v) => updatePet(i, "special_needs", v)}
                />
              </div>

              {/* Spa perk picker — one free treatment per dog */}
              <div className="mt-5 pt-5 border-t" style={{ borderColor: "var(--paw-line)" }}>
                <div className="flex items-center gap-2 mb-3" style={{ color: "var(--paw-clay)" }}>
                  <Gift size={13} strokeWidth={1.8} />
                  <span className="overline">
                    {p.name ? `${p.name}'s` : "Pet's"} complimentary spa pick
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: "nail_trim", label: "Nail Trim", icon: Scissors, desc: "Quick, calm clip during the stay" },
                    { id: "blueberry_facial", label: "Blueberry Facial", icon: Sparkles, desc: "Our signature blueberry exfoliating treat" },
                  ].map(({ id, label, icon: Icon, desc }) => {
                    const selected = (p.spa_perk || "nail_trim") === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        data-testid={`pet-${i}-perk-${id}`}
                        onClick={() => updatePet(i, "spa_perk", id)}
                        className="paw-card p-3 text-left"
                        style={{
                          background: selected ? "var(--paw-forest)" : "var(--paw-bg)",
                          color: selected ? "var(--paw-bg)" : "var(--paw-ink)",
                          borderColor: selected ? "var(--paw-forest)" : "var(--paw-line)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon size={14} strokeWidth={1.8} style={{ color: selected ? "var(--paw-bg)" : "var(--paw-clay)" }} />
                          <span className="text-sm" style={{ fontWeight: 500 }}>{label}</span>
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: selected ? "rgba(250,249,246,0.78)" : "var(--paw-muted)" }}
                        >
                          {desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        <div className="mt-7">
          <Field
            label="Anything else? (optional)"
            testid="notes-input"
            value={guests.notes}
            onChange={(v) => update("notes", v)}
          />
        </div>
      </div>
    </section>
  );
}

function Field({ label, value, onChange, type = "text", testid, min }) {
  return (
    <label className="block">
      <span className="overline block mb-2" style={{ color: "var(--paw-muted)" }}>
        {label}
      </span>
      <input
        data-testid={testid}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="paw-input"
        min={min}
      />
    </label>
  );
}

function SelectField({ label, value, onChange, options, testid }) {
  return (
    <label className="block">
      <span className="overline block mb-2" style={{ color: "var(--paw-muted)" }}>
        {label}
      </span>
      <select
        data-testid={testid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="paw-input"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}

// ---------------------------------------------------------------------------
// STEP 3
// ---------------------------------------------------------------------------

function StepReview({ catalog, roomId, stayId, tierLabel, discountPercent, guests, rulesAccepted, setRulesAccepted }) {
  const room = catalog.rooms.find((r) => r.id === roomId);
  const stay = catalog.stay_options.find((s) => s.id === stayId);

  const rules = [
    "All dogs are temperament tested on arrival",
    "Vaccines verified before check-in (Rabies, DHPP; Bordetella if using grooming or the dog park)",
    "Quiet hours 10:00 PM – 8:00 AM",
    "Do not exceed your cabin's pet capacity",
    "$250 refundable damage deposit pre-authorised at check-in (released within 24 hours of check-out if no damage occurs)",
    "Dogs may never be left in the cabin unattended",
  ];

  return (
    <section data-testid="step-review">
      <div className="overline mb-3" style={{ color: "var(--paw-muted)" }}>
        Step Three
      </div>
      <h2 className="font-display text-4xl sm:text-5xl mb-3" style={{ color: "var(--paw-ink)" }}>
        Almost there.
      </h2>
      <p className="text-base leading-relaxed mb-10 max-w-xl" style={{ color: "var(--paw-ink-2)" }}>
        Review your reservation, agree to the house rules, and continue to secure payment.
      </p>

      <div className="paw-card p-7" style={{ background: "var(--paw-bg-2)" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <ReviewRow label="Retreat" value={`${room?.name} • ${stay?.label}`} />
          <ReviewRow
            label="Pre-launch discount"
            value={`${tierLabel} • ${Math.round(discountPercent * 100)}% off`}
          />
          <ReviewRow label="Guest" value={guests.full_name || "—"} />
          <ReviewRow label="Email" value={guests.email || "—"} />
          <ReviewRow label="Phone" value={guests.phone || "—"} />
          <ReviewRow label="Guests" value={String(guests.guests || 2)} />
          <ReviewRow label="Check-in" value={`${fmtDate(guests.check_in)} • 4:00 PM`} />
          <ReviewRow label="Check-out" value={`${fmtDate(guests.check_out)} • 11:00 AM`} />
          <ReviewRow
            label="The pack"
            value={
              guests.no_pets
                ? "No dog this stay"
                : guests.pets
                    .filter((p) => p.name.trim())
                    .map((p) => `${p.name}${p.breed ? ` (${p.breed})` : ""}`)
                    .join(", ") || "—"
            }
          />
          {guests.notes && <ReviewRow label="Notes" value={guests.notes} />}
        </div>

        {/* Welcome perks line — confirms what's included */}
        {!guests.no_pets && guests.pets.filter((p) => p.name.trim()).length > 0 && (
          <div
            data-testid="review-perks"
            className="mt-7 pt-7 border-t"
            style={{ borderColor: "var(--paw-line)" }}
          >
            <div className="flex items-center gap-2 mb-3" style={{ color: "var(--paw-clay)" }}>
              <Gift size={14} strokeWidth={1.8} />
              <span className="overline">Welcome perks — included</span>
            </div>
            <ul className="space-y-1.5">
              {guests.pets.filter((p) => p.name.trim()).map((p, i) => (
                <li
                  key={p.id || `perk-${i}`}
                  data-testid={`review-perk-${i}`}
                  className="text-sm"
                  style={{ color: "var(--paw-ink-2)" }}
                >
                  <strong style={{ color: "var(--paw-ink)" }}>{p.name}</strong> →{" "}
                  {p.spa_perk === "blueberry_facial" ? "Blueberry Facial" : "Nail Trim"}{" "}
                  <span style={{ color: "var(--paw-muted)" }}>+ welcome bandana</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* HOUSE RULES — required agreement */}
      <div
        data-testid="review-house-rules"
        className="paw-card p-7 mt-8"
        style={{ background: "var(--paw-bg)", borderColor: "var(--paw-clay)", borderWidth: 1, borderStyle: "solid" }}
      >
        <div className="overline mb-3" style={{ color: "var(--paw-clay)" }}>
          House rules • Required
        </div>
        <h3 className="font-display text-2xl mb-5" style={{ color: "var(--paw-ink)" }}>
          Before you book — please agree.
        </h3>
        <ul className="space-y-3 mb-6">
          {rules.map((r) => (
            <li key={r} className="flex items-start gap-3 text-sm" style={{ color: "var(--paw-ink-2)" }}>
              <ShieldCheck size={15} strokeWidth={1.5} style={{ color: "var(--paw-forest)", marginTop: 3 }} />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <label className="flex items-start gap-3 cursor-pointer select-none" data-testid="house-rules-checkbox-label">
          <input
            type="checkbox"
            data-testid="house-rules-checkbox"
            checked={rulesAccepted}
            onChange={(e) => setRulesAccepted(e.target.checked)}
            className="mt-1"
            style={{ accentColor: "var(--paw-clay)" }}
          />
          <span className="text-sm leading-relaxed" style={{ color: "var(--paw-ink)" }}>
            I have read and agree to the house rules above on behalf of every guest and dog in my party.
          </span>
        </label>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        <Reassurance
          icon={<CalendarDays size={16} strokeWidth={1.5} />}
          heading="Your dates aren't locked in"
          body="If anything changes, you'll have plenty of chances to switch dates. We'll reach out before our December 1, 2026 opening to confirm."
        />
        <Reassurance
          icon={<ShieldCheck size={16} strokeWidth={1.5} />}
          heading="Flexible until 14 days out"
          body="Free rescheduling and full refund any time up to 14 days before your stay."
        />
        <Reassurance
          icon={<PawPrint size={16} strokeWidth={1.5} />}
          heading="$250 damage deposit"
          body="Pre-authorised on your card at check-in. Released within 24 hours of check-out if no damage occurs."
        />
      </div>

      <p className="mt-8 text-xs" style={{ color: "var(--paw-muted)" }}>
        Secure payment by Stripe. You will be redirected to Stripe&apos;s secure checkout to
        complete your reservation.
      </p>
    </section>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div>
      <div className="overline mb-1.5" style={{ color: "var(--paw-muted)" }}>
        {label}
      </div>
      <div className="text-sm" style={{ color: "var(--paw-ink)" }}>
        {value}
      </div>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function Reassurance({ icon, heading, body }) {
  return (
    <div className="paw-card p-5">
      <div className="flex items-center gap-2 mb-3" style={{ color: "var(--paw-forest)" }}>
        {icon}
        <span className="overline">{heading}</span>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
        {body}
      </p>
    </div>
  );
}

