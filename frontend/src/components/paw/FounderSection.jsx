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
            Hi, I&apos;m Garrett. Cameron Ranch welcomed your dog. PawHaus was built for them.
          </h2>
          <div
            className="mt-7 space-y-5 max-w-xl text-base leading-relaxed"
            style={{ color: "var(--paw-ink-2)" }}
          >
            <p>
              A few years ago I founded Cameron Ranch Glamping — one of the most viral
              luxury glamping properties in the country. Dogs were always welcome,
              and a lot of them came. But Cameron Ranch wasn&apos;t designed around
              them. It was designed for guests, who happened to bring a dog.
            </p>
            <p>
              And every check-in, I&apos;d watch a family work around that. Apologizing
              for muddy paws on the rug. Tying a leash to a deck post because there
              was no fenced yard. Skipping the trail because there was no water bowl
              halfway through it. Loving the place anyway — but always working a little
              harder than they should have to.
            </p>
            <p>
              So I&apos;m building the place that fixes all of that — twelve glass-and-pine
              cabins on 30 private acres, a fenced yard at every door, designated potty
              corners, a dog spa, a 24/7 vet partner on call, and a property that was
              designed paw-up from day one. If you book during pre-launch, you&apos;re
              not just getting 30% off. You&apos;re telling me you&apos;ve been waiting
              for this too. I&apos;ll be there January 1st to shake your hand and meet
              your dog. See you then.
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
