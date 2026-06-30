import React, { useState } from "react";
import { Camera, X } from "lucide-react";

/**
 * Editorial photo gallery — asymmetric magazine grid.
 * Sits between "Dog Difference" and the cabin deep-dives on the landing page.
 *
 * Layout (desktop, 12-col):
 *   Row 1  : signature-exterior (7) | pool-twilight (5) / dog-park-2 (5)
 *   Row 2  : signature-interior (6)   monolith-exterior (6)
 *   Row 3  : treat-bar (4)            human-spa (4)        grooming (4)
 *   Row 4  : wash-station (3)         shower (3)           play-lounge (3)   lobby (3)
 *   Row 5  : dog-park aerial (12, panoramic finale)
 *
 * Click any tile -> lightbox.
 */

const IMG = (name) => `/brand/${name}.webp`;

const TILES = [
  {
    key: "signature-exterior",
    src: IMG("signature-exterior"),
    label: "Your private cabin",
    sub: "Cedar walls, lake light, dogs welcome at the gate.",
  },
  {
    key: "pool-twilight",
    src: IMG("pool-twilight"),
    label: "The pool at twilight",
    sub: "Open to humans. Always close to your cabin.",
  },
  {
    key: "dog-park-2",
    src: IMG("dog-park-2"),
    label: "PawHaus Nature Dog Park",
    sub: "Off-leash zoomies. Splash pool. Shade sails.",
  },
  {
    key: "signature-interior",
    src: IMG("signature-interior"),
    label: "Wake up to the lake",
    sub: "Floor-to-ceiling glass. Linen sheets. Pup at the foot of the bed.",
  },
  {
    key: "monolith-exterior",
    src: IMG("monolith-exterior"),
    label: "Monolith with wood-fire hot tub",
    sub: "Cedar soak. Fire pit. Your own piece of forest.",
  },
  {
    key: "treat-bar-suite",
    src: IMG("treat-bar-suite"),
    label: "The Doggy Treat Bar",
    sub: "Stocked in every cabin. Pup-safe, sized to your dog.",
  },
  {
    key: "human-spa",
    src: IMG("human-spa"),
    label: "Spa — for the humans",
    sub: "Massages, facials, robes. While your dog plays next door.",
  },
  {
    key: "grooming-salon",
    src: IMG("grooming-salon"),
    label: "PawHaus Dog Spa",
    sub: "Full bath, blow-dry, blueberry facial. Free pick per dog.",
  },
  {
    key: "wash-station",
    src: IMG("wash-station"),
    label: "DIY dog wash",
    sub: "Warm water, shampoo, blow-dryer. Included, all day.",
  },
  {
    key: "shower",
    src: IMG("shower"),
    label: "Rainfall shower",
    sub: "Private, slate-tiled, with forest views.",
  },
  {
    key: "play-lounge",
    src: IMG("play-lounge"),
    label: "Indoor play lounge",
    sub: "Climate-controlled romp zone for rainy days.",
  },
  {
    key: "lobby",
    src: IMG("lobby"),
    label: "The lobby",
    sub: "Pour-overs for you. Pup cups for them. Every morning, on the house.",
  },
  {
    key: "dog-park",
    src: IMG("dog-park"),
    label: "30 acres of sniffing",
    sub: "Trails, water bowls at every turn, dedicated off-leash zones.",
  },
];

function Tile({ tile, span, onOpen, priority = false }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(tile)}
      data-testid={`gallery-tile-${tile.key}`}
      className={`group relative overflow-hidden ${span} block w-full`}
      style={{ background: "var(--paw-bg-2)" }}
    >
      <img
        src={tile.src}
        alt={tile.label}
        loading={priority ? "eager" : "lazy"}
        className="w-full h-full object-cover transition-transform duration-[700ms] ease-out group-hover:scale-[1.04]"
      />
      {/* gradient scrim for caption legibility */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
      {/* caption */}
      <div className="absolute left-0 right-0 bottom-0 p-5 sm:p-6 text-left">
        <div className="font-display text-white text-lg sm:text-xl leading-tight">
          {tile.label}
        </div>
        <div className="text-white/85 text-[12px] sm:text-[13px] leading-snug mt-1 max-w-[34ch] opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
          {tile.sub}
        </div>
      </div>
    </button>
  );
}

export default function GallerySection() {
  const [lightbox, setLightbox] = useState(null);

  const byKey = Object.fromEntries(TILES.map((t) => [t.key, t]));

  return (
    <section
      data-testid="gallery-section"
      className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32"
    >
      {/* Header */}
      <div className="max-w-3xl">
        <div className="flex items-center gap-2 mb-5" style={{ color: "var(--paw-clay)" }}>
          <Camera size={14} strokeWidth={1.8} />
          <span className="overline">A look around the property</span>
        </div>
        <h2
          className="font-display text-4xl sm:text-5xl leading-[1.05]"
          style={{ color: "var(--paw-ink)" }}
        >
          What 30 acres for dogs &amp; their humans actually looks like.
        </h2>
        <p
          className="mt-6 text-base leading-relaxed max-w-2xl"
          style={{ color: "var(--paw-ink-2)" }}
        >
          Cabins, the pool, the dog park, the spa, the wash station — every corner
          designed paw-up. Tap any photo to look closer.
        </p>
      </div>

      {/* Row 1 — hero asymmetric */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3">
        <div className="md:col-span-7 md:row-span-2 h-[420px] md:h-[640px]">
          <Tile tile={byKey["signature-exterior"]} span="h-full" onOpen={setLightbox} priority />
        </div>
        <div className="md:col-span-5 h-[260px] md:h-[316px]">
          <Tile tile={byKey["pool-twilight"]} span="h-full" onOpen={setLightbox} priority />
        </div>
        <div className="md:col-span-5 h-[260px] md:h-[316px]">
          <Tile tile={byKey["dog-park-2"]} span="h-full" onOpen={setLightbox} />
        </div>
      </div>

      {/* Row 2 — two equal heroes */}
      <div className="mt-2 sm:mt-3 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3">
        <div className="md:col-span-6 h-[320px] md:h-[440px]">
          <Tile tile={byKey["signature-interior"]} span="h-full" onOpen={setLightbox} />
        </div>
        <div className="md:col-span-6 h-[320px] md:h-[440px]">
          <Tile tile={byKey["monolith-exterior"]} span="h-full" onOpen={setLightbox} />
        </div>
      </div>

      {/* Row 3 — trio (treat bar, human spa, grooming) */}
      <div className="mt-2 sm:mt-3 grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-3">
        {["treat-bar-suite", "human-spa", "grooming-salon"].map((k) => (
          <div key={k} className="md:col-span-4 h-[300px] md:h-[380px]">
            <Tile tile={byKey[k]} span="h-full" onOpen={setLightbox} />
          </div>
        ))}
      </div>

      {/* Row 4 — quartet of details */}
      <div className="mt-2 sm:mt-3 grid grid-cols-2 md:grid-cols-12 gap-2 sm:gap-3">
        {["wash-station", "shower", "play-lounge", "lobby"].map((k) => (
          <div key={k} className="md:col-span-3 h-[220px] md:h-[300px]">
            <Tile tile={byKey[k]} span="h-full" onOpen={setLightbox} />
          </div>
        ))}
      </div>

      {/* Row 5 — panoramic finale */}
      <div className="mt-2 sm:mt-3 grid grid-cols-1 gap-2">
        <div className="h-[320px] md:h-[480px]">
          <Tile tile={byKey["dog-park"]} span="h-full" onOpen={setLightbox} />
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="gallery-lightbox"
          className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightbox(null);
            }}
            data-testid="gallery-lightbox-close"
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.6} />
          </button>
          <figure
            className="max-w-[1200px] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={lightbox.src}
              alt={lightbox.label}
              className="w-full max-h-[80vh] object-contain"
            />
            <figcaption className="mt-4 text-center text-white">
              <div className="font-display text-xl sm:text-2xl">{lightbox.label}</div>
              <div className="text-white/80 text-sm mt-1">{lightbox.sub}</div>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
