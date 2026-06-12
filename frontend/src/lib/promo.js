// Promo code capture + helpers.
// Customers land on /?promo=PAW25 (e.g. from exit-intent follow-up email).
// We store the code in localStorage and pass it to /api/quote +
// /api/payments/checkout/session so the discount applies automatically.
//
// Mirrors referral.js — keep the two in sync.
const LS_KEY = "pawhaus_promo_code";

export function capturePromoFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = (params.get("promo") || "").trim().toUpperCase();
    if (code) {
      localStorage.setItem(LS_KEY, code);
      return code;
    }
  } catch (e) {
    console.warn("[promo] failed to capture from URL:", e);
  }
  return getPromo();
}

export function getPromo() {
  try {
    return (localStorage.getItem(LS_KEY) || "").trim().toUpperCase() || null;
  } catch (e) {
    return null;
  }
}

export function setPromo(code) {
  try {
    if (!code) return clearPromo();
    localStorage.setItem(LS_KEY, code.trim().toUpperCase());
  } catch (e) {
    /* noop — quota / privacy mode */
  }
}

export function clearPromo() {
  try { localStorage.removeItem(LS_KEY); } catch (e) { /* noop */ }
}
