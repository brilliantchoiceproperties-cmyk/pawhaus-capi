import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Trash2, Plus, ShieldCheck, CalendarDays, PawPrint } from "lucide-react";
import { useBooking } from "@/context/BookingContext";
import { createCheckoutSession } from "@/lib/paw-api";
import { track, identify } from "@/lib/analytics";
import SummaryCard from "@/components/paw/SummaryCard";

// PawHaus brand assets — served as optimised webp from /public/brand/
const ROOM_IMAGES = {
  petite: "/brand/hero.webp",
  standard: "/brand/dsc.webp",
  monolith: "/brand/bedroom.webp",
};

export default function Booking() {
  const navigate = useNavigate();
  const { catalog, tier, tierLabel, discountPercent, roomId, setRoomId, stayId, setStayId, guests, setGuests } = useBooking();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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
    guests.full_name.trim() && guests.email.trim() && guests.phone.trim() && guests.check_in;

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
        className="mb-10 border px-5 py-3 text-xs leading-relaxed"
        style={{ borderColor: "var(--paw-line)", color: "var(--paw-ink-2)", background: "var(--paw-bg-2)" }}
      >
        <span className="overline mr-2" style={{ color: "var(--paw-clay)" }}>
          Phase 1
        </span>
        Only 12 units — 100 Founders Pass holders pick first, then 50,000+ on the
        waitlist. Dates are going fast.
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
            <StepStay
              catalog={catalog}
              roomId={roomId}
              setRoomId={setRoomId}
              stayId={stayId}
              setStayId={setStayId}
            />
          )}
          {step === 2 && (
            <StepGuests guests={guests} setGuests={setGuests} stayId={stayId} catalog={catalog} />
          )}
          {step === 3 && (
            <StepReview
              catalog={catalog}
              roomId={roomId}
              stayId={stayId}
              tier={tier}
              tierLabel={tierLabel}
              discountPercent={discountPercent}
              guests={guests}
            />
          )}

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
                disabled={submitting}
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

function StepStay({ catalog, roomId, setRoomId, stayId, setStayId }) {
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
        {catalog.rooms.map((room) => {
          const selected = roomId === room.id;
          return (
            <button
              key={room.id}
              data-testid={`room-card-${room.id}`}
              onClick={() => handleRoomSelect(room.id)}
              className="paw-card w-full text-left grid grid-cols-1 md:grid-cols-12 overflow-hidden"
              style={{
                background: selected ? "var(--paw-bg-2)" : "var(--paw-bg)",
                borderColor: selected ? "var(--paw-forest)" : "var(--paw-line)",
              }}
            >
              <img
                src={ROOM_IMAGES[room.id]}
                alt={room.name}
                className="md:col-span-5 w-full h-56 md:h-full object-cover"
              />
              <div className="md:col-span-7 p-7">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="overline" style={{ color: "var(--paw-forest)" }}>
                    {room.bed}
                  </span>
                  {room.has_hot_tub && (
                    <span className="overline" style={{ color: "var(--paw-clay)" }}>
                      Hot Tub
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
                <div className="mt-5 text-sm" style={{ color: "var(--paw-muted)" }}>
                  From{" "}
                  <span className="font-display text-lg" style={{ color: "var(--paw-ink)" }}>
                    ${room.nightly_rates.WEEKDAY.toFixed(0)}
                  </span>
                  /night
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <h3 className="font-display text-2xl mt-12 mb-5" style={{ color: "var(--paw-ink)" }}>
        Pick your stay.
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                {s.type}
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
    </section>
  );
}

// ---------------------------------------------------------------------------
// STEP 2
// ---------------------------------------------------------------------------

function StepGuests({ guests, setGuests, stayId, catalog }) {
  const update = (k, v) => setGuests({ ...guests, [k]: v });
  const stay = catalog?.stay_options?.find((s) => s.id === stayId);
  const nights = stay?.nights || 1;

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

  const updatePet = (i, k, v) => {
    const pets = [...guests.pets];
    pets[i] = { ...pets[i], [k]: v };
    setGuests({ ...guests, pets });
  };
  const addPet = () =>
    setGuests({
      ...guests,
      pets: [...guests.pets, { name: "", breed: "", size: "Medium (25-60 lb)", special_needs: "" }],
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
        We'll need a few details to prepare your suite and welcome your pack.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Field label="Full Name" testid="guest-name-input" value={guests.full_name} onChange={(v) => update("full_name", v)} />
        <Field label="Email" type="email" testid="guest-email-input" value={guests.email} onChange={(v) => update("email", v)} />
        <Field label="Phone" testid="guest-phone-input" value={guests.phone} onChange={(v) => update("phone", v)} />
        <Field label="Guests" type="number" testid="guest-count-input" value={guests.guests} onChange={(v) => update("guests", parseInt(v) || 1)} />
        <Field label="Check-In" type="date" testid="guest-checkin-input" value={guests.check_in} onChange={(v) => update("check_in", v)} />
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
          Your booking isn't final yet — pick up to two backup arrival dates and we'll
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
          </div>
          <button data-testid="add-pet-button" onClick={addPet} className="paw-btn-secondary text-xs">
            <Plus size={14} strokeWidth={1.5} className="inline mr-2 -mt-0.5" /> Add a pet
          </button>
        </div>

        <div className="space-y-5">
          {guests.pets.map((p, i) => (
            <div key={i} className="paw-card p-5" data-testid={`pet-card-${i}`}>
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
            </div>
          ))}
        </div>

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

function Field({ label, value, onChange, type = "text", testid }) {
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

function StepReview({ catalog, roomId, stayId, tier, tierLabel, discountPercent, guests }) {
  const room = catalog.rooms.find((r) => r.id === roomId);
  const stay = catalog.stay_options.find((s) => s.id === stayId);

  return (
    <section data-testid="step-review">
      <div className="overline mb-3" style={{ color: "var(--paw-muted)" }}>
        Step Three
      </div>
      <h2 className="font-display text-4xl sm:text-5xl mb-3" style={{ color: "var(--paw-ink)" }}>
        Almost there.
      </h2>
      <p className="text-base leading-relaxed mb-10 max-w-xl" style={{ color: "var(--paw-ink-2)" }}>
        Review your reservation and continue to secure payment.
      </p>

      <div className="paw-card p-7" style={{ background: "var(--paw-bg-2)" }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
          <ReviewRow label="Retreat" value={`${room?.name} • ${stay?.label}`} />
          <ReviewRow
            label="Discount tier"
            value={`${tierLabel} • ${Math.round(discountPercent * 100)}% off`}
          />
          <ReviewRow label="Guest" value={guests.full_name || "—"} />
          <ReviewRow label="Email" value={guests.email || "—"} />
          <ReviewRow label="Phone" value={guests.phone || "—"} />
          <ReviewRow label="Guests" value={String(guests.guests || 2)} />
          <ReviewRow label="Check-in" value={fmtDate(guests.check_in)} />
          <ReviewRow label="Check-out" value={fmtDate(guests.check_out)} />
          <ReviewRow
            label="The pack"
            value={
              guests.pets
                .filter((p) => p.name.trim())
                .map((p) => `${p.name}${p.breed ? ` (${p.breed})` : ""}`)
                .join(", ") || "—"
            }
          />
          {guests.notes && <ReviewRow label="Notes" value={guests.notes} />}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
        <Reassurance
          icon={<CalendarDays size={16} strokeWidth={1.5} />}
          heading="Your dates aren't locked in"
          body="If anything changes, you'll have plenty of chances to switch dates. We'll reach out before our December 1, 2027 opening to confirm."
        />
        <Reassurance
          icon={<ShieldCheck size={16} strokeWidth={1.5} />}
          heading="Flexible until 14 days out"
          body="Free rescheduling and full refund any time up to 14 days before your stay."
        />
        <Reassurance
          icon={<PawPrint size={16} strokeWidth={1.5} />}
          heading="Vaccines & temperament"
          body="Rabies & DHPP for all pets. Bordetella also required for grooming or the public dog park. No breed restrictions — we do screen for temperament."
        />
      </div>

      <p className="mt-8 text-xs" style={{ color: "var(--paw-muted)" }}>
        Secure payment by Stripe. You will be redirected to Stripe's secure checkout to
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

