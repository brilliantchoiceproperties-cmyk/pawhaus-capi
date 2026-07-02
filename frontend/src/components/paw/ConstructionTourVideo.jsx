import React, { useState } from "react";
import { Play, HardHat } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Construction tour video — YouTube facade pattern.
 *
 * Only loads the YouTube iframe when the user clicks play (avoids ~500KB
 * of YouTube JS + iframe on initial page load). Until then, shows a
 * static thumbnail with a play button overlay.
 *
 * To swap videos: change YT_ID below.
 */

const YT_ID = "hOy2rN1-fd0";
const THUMB = `https://img.youtube.com/vi/${YT_ID}/maxresdefault.jpg`;

export default function ConstructionTourVideo() {
  const [playing, setPlaying] = useState(false);

  const handlePlay = () => {
    track("construction_tour_video_play", { yt_id: YT_ID });
    setPlaying(true);
  };

  return (
    <section
      data-testid="construction-tour-section"
      className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32"
    >
      {/* Header */}
      <div className="max-w-3xl">
        <div
          className="flex items-center gap-2 mb-5"
          style={{ color: "var(--paw-clay)" }}
        >
          <HardHat size={14} strokeWidth={1.8} />
          <span className="overline">Under construction — right now</span>
        </div>
        <h2
          className="font-display text-4xl sm:text-5xl leading-[1.05]"
          style={{ color: "var(--paw-ink)" }}
        >
          This isn&apos;t a rendering. Walk the property with us.
        </h2>
        <p
          className="mt-6 text-base leading-relaxed max-w-2xl"
          style={{ color: "var(--paw-ink-2)" }}
        >
          A quick tour of the land, the cabins going up, and what your dog will
          see when you pull in on opening day. Filmed on-site — no filters, no polish, just the build.
        </p>
      </div>

      {/* Video */}
      <div
        className="mt-10 relative w-full overflow-hidden"
        style={{
          aspectRatio: "16 / 9",
          background: "var(--paw-ink)",
        }}
      >
        {!playing ? (
          <button
            type="button"
            onClick={handlePlay}
            data-testid="construction-tour-play-button"
            aria-label="Play construction tour video"
            className="group block w-full h-full relative"
          >
            <img
              src={THUMB}
              alt="PawHaus Resort construction tour — walkthrough of the property"
              className="w-full h-full object-cover transition-transform duration-[700ms] group-hover:scale-[1.02]"
              loading="lazy"
            />
            {/* Dark scrim */}
            <div className="absolute inset-0 bg-black/25 group-hover:bg-black/15 transition-colors duration-300" />
            {/* Play button */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              aria-hidden
            >
              <div
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: "rgba(250, 249, 246, 0.95)",
                  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.4)",
                }}
              >
                <Play
                  size={32}
                  strokeWidth={1.6}
                  className="ml-1"
                  style={{ color: "var(--paw-forest)" }}
                  fill="currentColor"
                />
              </div>
            </div>
            {/* Bottom caption strip */}
            <div className="absolute left-0 right-0 bottom-0 p-5 sm:p-6 text-left">
              <div
                className="overline mb-1"
                style={{ color: "rgba(250, 249, 246, 0.8)" }}
              >
                Construction Tour · 2026
              </div>
              <div className="font-display text-xl sm:text-2xl text-white leading-tight max-w-xl">
                Walk the site before doors open.
              </div>
            </div>
          </button>
        ) : (
          <iframe
            data-testid="construction-tour-iframe"
            src={`https://www.youtube.com/embed/${YT_ID}?autoplay=1&rel=0&modestbranding=1`}
            title="PawHaus Resort construction tour"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        )}
      </div>
    </section>
  );
}
