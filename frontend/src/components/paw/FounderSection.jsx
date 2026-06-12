import React from "react";

const FOUNDER_IMG = "/brand/garrett.webp";

/**
 * Founder story + face. Premium pre-launch buyers buy from a person,
 * not a brand. Edit the name / story / dog name below to match.
 */
export default function FounderSection() {
  return (
    <section
      data-testid="founder-section"
      className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
        <div className="md:col-span-5">
          <div
            className="relative overflow-hidden"
            style={{ background: "var(--paw-bg-2)" }}
          >
            <img
              src={FOUNDER_IMG}
              alt="Garrett Brown — Founder of PawHaus Resort"
              className="w-full h-[540px] object-cover"
              style={{ objectPosition: "center top" }}
            />
          </div>
        </div>

        <div className="md:col-span-7">
          <div className="overline mb-5" style={{ color: "var(--paw-clay)" }}>
            A note from the founder
          </div>
          <h2
            className="font-display text-4xl sm:text-5xl leading-[1.05]"
            style={{ color: "var(--paw-ink)" }}
          >
            Hi, I&apos;m Garrett. I built PawHaus for the dog I couldn&apos;t bring with me.
          </h2>
          <div
            className="mt-7 space-y-5 max-w-xl text-base leading-relaxed"
            style={{ color: "var(--paw-ink-2)" }}
          >
            <p>
              A few years ago I founded Cameron Ranch Glamping — one of the most viral
              luxury glamping properties in the country. It worked. People came. But
              every time I checked in a family, I&apos;d watch them apologize for the
              dog in the back seat that couldn&apos;t come inside.
            </p>
            <p>
              That apology stuck with me. The dog never asked to be left behind.
              So I&apos;m building the place I wished existed when I was hiding mine
              in a hotel bathroom — twelve glass-and-pine cabins, a private fenced
              yard at every door, a dog concierge on staff, and a property that was
              designed paw-up from day one.
            </p>
            <p>
              If you book during pre-launch, you&apos;re not just getting 30% off.
              You&apos;re telling me you&apos;ve been waiting for this too. I&apos;ll
              be there December 1st to shake your hand and meet your dog. See you then.
            </p>
          </div>

          <div className="mt-8 flex items-center gap-4">
            <div>
              <div
                className="font-display text-2xl"
                style={{ color: "var(--paw-ink)" }}
              >
                Garrett Brown
              </div>
              <div
                className="overline mt-0.5"
                style={{ color: "var(--paw-muted)" }}
              >
                Founder, PawHaus Resort • Cameron Ranch Glamping
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
