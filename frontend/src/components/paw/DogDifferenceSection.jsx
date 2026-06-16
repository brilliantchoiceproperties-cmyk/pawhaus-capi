import React from "react";
import { Home, Trees, MapPin, HeartHandshake, Sparkles, Droplets } from "lucide-react";

/**
 * "What we do differently for dogs" — the proof points for why pet parents
 * should book PawHaus over any other dog-friendly nature stay.
 *
 * Four buckets: Cabin / Yard / Property / Service.
 */
const GROUPS = [
  {
    icon: Home,
    overline: "In your cabin",
    title: "Already set up for them.",
    items: [
      "A dedicated dog bed in every cabin — theirs, not an afterthought.",
      "Food and water bowls preset and waiting. No packing, no forgetting.",
      "A welcome treat bag, pup-safe, sized for your dog, ready when you walk in.",
      "Towel stash by the door for muddy paws.",
      "Free spa pick per dog — nail trim or our signature blueberry facial.",
    ],
  },
  {
    icon: Trees,
    overline: "In your private yard",
    title: "Their own little outdoors.",
    items: [
      "A designated potty corner — turf or decomposed-granite zone with a discreet cedar-framed waste station. No more midnight leash walks.",
      "Ground-level auto-fill stainless water bowl, plumbed in. Always full, never warm.",
      "A shaded cedar dog cot under a sail shade — their bed outdoors, not just indoors.",
      "Coming soon: solar-heated outdoor shower + private cold rinse station per cabin. Mud stays outside; dogs come in fresh.",
    ],
  },
  {
    icon: MapPin,
    overline: "Across the property",
    title: "30 acres made for sniffing.",
    items: [
      "Off-leash freedom on 30 private wooded acres — not a sad little gravel run.",
      "Water bowls at every turn: lobby, café, every trailhead.",
      "Poop bag stations everywhere you'd ever need one — you will never go hunting.",
      "Pup cups at the coffee cart every single morning. You get your pour-over, they get theirs. On the house.",
    ],
  },
  {
    icon: HeartHandshake,
    overline: "Our service",
    title: "We treat them like family.",
    items: [
      "Staff that knows your dog's name before you arrive — and uses it. They're a regular from minute one.",
      "24/7 vet help via our Vetster partnership — talk to a vet over video any hour, on us.",
      "10–15 minutes from a daytime vet clinic and 30 minutes from a 24-hour emergency hospital. We've mapped the route already.",
      "Temperament-tested + vaccinated guests only, so every dog is safe to roam.",
    ],
  },
  {
    icon: Droplets,
    overline: "Wash, spa & pool",
    title: "Clean dog, relaxed human.",
    items: [
      "DIY dog wash station included — warm water, low-tearing shampoo, blow-dry stand, leash hook. Free, all day.",
      "Prefer to skip the scrub? Drop them at the PawHaus Dog Spa for a full bath while you head to the pool or human spa next door.",
      "Onsite human spa + heated pool open to all guests — so the whole pack gets pampered.",
      "Spa add-on bookable at the front desk on arrival, or in advance with your reservation team.",
    ],
  },
];

export default function DogDifferenceSection() {
  return (
    <section
      data-testid="dog-difference-section"
      className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32"
    >
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 mb-5" style={{ color: "var(--paw-clay)" }}>
          <Sparkles size={14} strokeWidth={1.8} />
          <span className="overline">What we do differently — for dogs</span>
        </div>
        <h2
          className="font-display text-4xl sm:text-5xl leading-[1.05]"
          style={{ color: "var(--paw-ink)" }}
        >
          A nature hotel designed paw-up from day one.
        </h2>
        <p
          className="mt-6 text-base leading-relaxed max-w-2xl"
          style={{ color: "var(--paw-ink-2)" }}
        >
          Most dog-friendly places tolerate your dog. PawHaus was built around them.
          Here&apos;s what that looks like in practice.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-7">
        {GROUPS.map((g, idx) => {
          const Icon = g.icon;
          const slug = g.overline.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          const isOdd5th = GROUPS.length === 5 && idx === 4;
          return (
            <div
              key={g.overline}
              data-testid={`dog-difference-card-${slug}`}
              className={`paw-card p-7 ${isOdd5th ? "md:col-span-2" : ""}`}
              style={{ background: "var(--paw-bg-2)" }}
            >
              <div className="flex items-center gap-2 mb-4" style={{ color: "var(--paw-clay)" }}>
                <Icon size={15} strokeWidth={1.7} />
                <span className="overline">{g.overline}</span>
              </div>
              <h3
                className="font-display text-2xl sm:text-3xl leading-tight mb-5"
                style={{ color: "var(--paw-ink)" }}
              >
                {g.title}
              </h3>
              <ul className="space-y-3">
                {g.items.map((line, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-sm leading-relaxed"
                    style={{ color: "var(--paw-ink-2)" }}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 inline-block w-1 h-1 shrink-0 rounded-full"
                      style={{ background: "var(--paw-clay)" }}
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
