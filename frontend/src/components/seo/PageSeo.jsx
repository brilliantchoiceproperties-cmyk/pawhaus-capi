import React from "react";
import { Helmet } from "react-helmet-async";

/**
 * Per-route SEO helper. Sets <title>, <meta name="description">, canonical URL,
 * and OG/Twitter tags for a specific page.
 *
 * Usage:
 *   <PageSeo
 *     title="Book your PawHaus stay"
 *     description="Pick your dates and cabin..."
 *     path="/booking"
 *   />
 */

const SITE = "https://pawhausresort.com";
const DEFAULT_IMG = `${SITE}/brand/hero.webp`;

export default function PageSeo({ title, description, path = "/", image, noIndex = false }) {
  const url = `${SITE}${path === "/" ? "" : path}`;
  const fullTitle = title.includes("PawHaus") ? title : `${title} — PawHaus Resort`;
  const img = image || DEFAULT_IMG;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
    </Helmet>
  );
}
