import React from "react";
import { Helmet } from "react-helmet-async";

/**
 * Schema.org LodgingBusiness (Resort) JSON-LD for rich Google search results.
 *
 * Adds structured data so Google/Bing can show amenities, price range, address,
 * and cabin inventory directly in the SERP.
 *
 * Only inject on the LANDING page — not on Privacy/Terms/Admin.
 * Update prices in `makesOffer` if pre-launch pricing changes.
 */

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Resort",
  "@id": "https://pawhausresort.com/#resort",
  name: "PawHaus Resort",
  alternateName: "PawHaus",
  description:
    "The USA's first dog-first luxury nature hotel. 12 glass-and-pine cabins on 30 private acres in Goodrich, TX, with wood-fired hot tubs, on-site dog spa, private yards, and a Nature Dog Park.",
  url: "https://pawhausresort.com",
  logo: "https://pawhausresort.com/brand/logo.webp",
  image: [
    "https://pawhausresort.com/brand/hero.webp",
    "https://pawhausresort.com/brand/signature-exterior.webp",
    "https://pawhausresort.com/brand/pool-twilight.webp",
    "https://pawhausresort.com/brand/monolith-hottub.webp",
  ],
  address: {
    "@type": "PostalAddress",
    addressLocality: "Goodrich",
    addressRegion: "TX",
    postalCode: "77335",
    addressCountry: "US",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 30.6013,
    longitude: -94.9483,
  },
  areaServed: {
    "@type": "State",
    name: "Texas",
  },
  priceRange: "$195 – $595",
  currenciesAccepted: "USD",
  paymentAccepted:
    "Credit Card, Apple Pay, Google Pay, Debit Card",
  petsAllowed: true,
  amenityFeature: [
    { "@type": "LocationFeatureSpecification", name: "Pet-friendly", value: true },
    { "@type": "LocationFeatureSpecification", name: "Private yard per cabin", value: true },
    { "@type": "LocationFeatureSpecification", name: "On-site dog spa", value: true },
    { "@type": "LocationFeatureSpecification", name: "DIY dog wash station", value: true },
    { "@type": "LocationFeatureSpecification", name: "Off-leash dog park (30 acres)", value: true },
    { "@type": "LocationFeatureSpecification", name: "In-cabin doggy treat bar", value: true },
    { "@type": "LocationFeatureSpecification", name: "Wood-fired hot tub (Monolith tier)", value: true },
    { "@type": "LocationFeatureSpecification", name: "Twilight pool", value: true },
    { "@type": "LocationFeatureSpecification", name: "Human wellness spa", value: true },
    { "@type": "LocationFeatureSpecification", name: "Free Wi-Fi", value: true },
    { "@type": "LocationFeatureSpecification", name: "Vetted 24/7 vet partner", value: true },
    { "@type": "LocationFeatureSpecification", name: "Zero pet fees", value: true },
  ],
  containsPlace: [
    {
      "@type": "HotelRoom",
      name: "Petite Cabin",
      description:
        "Cozy mirrored cabin for 1-2 humans and up to 2 dogs. Queen bed, private yard, in-cabin doggy treat bar.",
      occupancy: { "@type": "QuantitativeValue", maxValue: 2 },
      petsAllowed: true,
    },
    {
      "@type": "HotelRoom",
      name: "Standard Cabin",
      description:
        "Signature lakefront cabin for 2-4 humans and up to 2 dogs. Full kitchen, expanded living, private yard, doggy treat bar.",
      occupancy: { "@type": "QuantitativeValue", maxValue: 4 },
      petsAllowed: true,
    },
    {
      "@type": "HotelRoom",
      name: "Monolith Cabin",
      description:
        "Premium lakefront cabin for 2-4 humans and up to 2 dogs. Wood-fired hot tub, outdoor fire pit, expanded views.",
      occupancy: { "@type": "QuantitativeValue", maxValue: 4 },
      petsAllowed: true,
    },
  ],
  makesOffer: [
    {
      "@type": "Offer",
      name: "Pre-launch 30% off — every cabin, every night",
      description:
        "Public pre-launch pricing before doors open to the general market on January 1, 2027. 30% off every booking with no code required.",
      priceCurrency: "USD",
      price: "195.00",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        priceCurrency: "USD",
        price: "195.00",
        referenceQuantity: {
          "@type": "QuantitativeValue",
          value: 1,
          unitCode: "NIT",
        },
      },
      availability: "https://schema.org/InStock",
      validFrom: "2026-01-01",
      validThrough: "2026-12-31",
      url: "https://pawhausresort.com/booking",
    },
  ],
  sameAs: [
    "https://www.instagram.com/pawhausresort",
    "https://www.facebook.com/pawhausresort",
  ],
  potentialAction: {
    "@type": "ReserveAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://pawhausresort.com/booking",
      inLanguage: "en-US",
      actionPlatform: [
        "http://schema.org/DesktopWebPlatform",
        "http://schema.org/MobileWebPlatform",
      ],
    },
    result: { "@type": "LodgingReservation", name: "Reserve a cabin at PawHaus Resort" },
  },
};

export default function ResortSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(SCHEMA)}
      </script>
    </Helmet>
  );
}
