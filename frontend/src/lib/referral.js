// Referral code capture + helpers.
// Customers land on /?ref=CODE — we store the code in localStorage and pass it
// to /api/quote + /api/payments/checkout/session so the friend gets $50 off.
const LS_KEY = "pawhaus_referrer_code";

export function captureReferrerFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = (params.get("ref") || "").trim().toUpperCase();
    if (ref) {
      localStorage.setItem(LS_KEY, ref);
      return ref;
    }
  } catch (e) {
    console.warn("[referral] failed to capture from URL:", e);
  }
  return getReferrer();
}

export function getReferrer() {
  try {
    return (localStorage.getItem(LS_KEY) || "").trim().toUpperCase() || null;
  } catch (e) {
    return null;
  }
}

export function clearReferrer() {
  try { localStorage.removeItem(LS_KEY); } catch (e) { /* noop */ }
}

export const REFERRAL_DISCOUNT_USD = 50;
