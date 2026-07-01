import React from "react";
import { Heart } from "lucide-react";

/**
 * "Every booking supports a shelter" — trust/values reinforcement section.
 *
 * Editorial single-image + text block (mirrors FounderSection but flipped:
 * text on the LEFT, image on the RIGHT).
 *
 * The shelter list rotates each quarter — edit the SHELTERS array below
 * as partnerships change. Deliberately no dollar amount or percentage
 * so we can adjust the give-back model without a code change.
 */

const SHELTER_IMG = "/brand/dog-park.webp";

const SHELTERS = [
  "SPCA of Polk County — Livingston, TX",
  "Houston SPCA — Houston, TX",
];

export default function ShelterGivingSection() {
  return (
    <section
      data-testid="shelter-giving-section"
      className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
        {/* Text — LEFT */}
        <div className="md:col-span-7 md:order-1">
          <div
            className="flex items-center gap-2 mb-5"
            style={{ color: "var(--paw-clay)" }}
          >
            <Heart size={14} strokeWidth={1.8} />
            <span className="overline">A portion of every booking</span>
          </div>
          <h2
            className="font-display text-4xl sm:text-5xl leading-[1.05]"
            style={{ color: "var(--paw-ink)" }}
          >
            Every stay puts food in a shelter dog&apos;s bowl.
          </h2>

          <div
            className="mt-7 space-y-5 max-w-xl text-base leading-relaxed"
            style={{ color: "var(--paw-ink-2)" }}
          >
            <p>
              We built PawHaus for the people who bring their dog everywhere.
              But we know not every dog got the family we did. So a portion of every
              booking goes directly to a rotating list of local East&nbsp;Texas
              and Houston-area shelters — no marketing gimmick, no rounded-up
              checkout donation, just a real check written after every stay.
            </p>
            <p>
              You show up. Your dog gets 30 acres. Another dog — one we&apos;ll
              probably never meet — gets a meal, a vaccine, a foster placement,
              or a spay/neuter surgery paid for. That&apos;s the trade.
            </p>
          </div>

          {/* Rotating shelter list */}
          <div className="mt-8">
            <div
              className="overline mb-3"
              style={{ color: "var(--paw-muted)" }}
            >
              Currently supporting
            </div>
            <ul className="space-y-2" data-testid="shelter-partners-list">
              {SHELTERS.map((name) => (
                <li
                  key={name}
                  data-testid={`shelter-partner-${name
                    .split(" —")[0]
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, "-")}`}
                  className="flex items-center gap-3 text-base"
                  style={{ color: "var(--paw-ink)" }}
                >
                  <span
                    aria-hidden
                    className="inline-block w-4 h-[1.5px]"
                    style={{ background: "var(--paw-forest)" }}
                  />
                  <span>{name}</span>
                </li>
              ))}
            </ul>
            <p
              className="text-xs mt-4 max-w-lg leading-relaxed"
              style={{ color: "var(--paw-muted)" }}
            >
              Partner list rotates quarterly. Have a shelter you&apos;d like us
              to support?{" "}
              <a
                href="mailto:team@pawhausresort.com?subject=Shelter%20partner%20suggestion"
                className="underline underline-offset-4"
                style={{ color: "var(--paw-forest)" }}
                data-testid="shelter-suggest-email"
              >
                Tell us
              </a>
              .
            </p>
          </div>
        </div>

        {/* Image — RIGHT */}
        <div className="md:col-span-5 md:order-2">
          <div
            className="relative overflow-hidden"
            style={{ background: "var(--paw-bg-2)" }}
          >
            <img
              src={SHELTER_IMG}
              alt="PawHaus supports local East Texas and Houston-area animal shelters"
              className="w-full h-[540px] object-cover"
              loading="lazy"
            />
            {/* Small floating badge in bottom-left, forest tint */}
            <div
              className="absolute left-4 bottom-4 px-3 py-2 flex items-center gap-2 backdrop-blur-sm"
              style={{
                background: "rgba(44, 76, 59, 0.85)",
                color: "var(--paw-bg)",
              }}
            >
              <Heart size={13} strokeWidth={2} />
              <span
                className="text-[11px] tracking-[0.18em] uppercase font-medium"
              >
                Every booking gives back
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
