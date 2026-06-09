// Unified analytics: PostHog + Google Analytics 4 + Meta Pixel
// PostHog uses our own ingestion endpoint (bypasses sdk to avoid singleton conflicts).
// GA4 (gtag) and Meta Pixel (fbq) are bootstrapped in public/index.html.

const KEY = process.env.REACT_APP_POSTHOG_KEY;
const HOST = process.env.REACT_APP_POSTHOG_HOST || "https://us.i.posthog.com";
const VARIANT = process.env.REACT_APP_VARIANT || "v2_light";
const GA4_ID = process.env.REACT_APP_GA4_ID;
const META_ID = process.env.REACT_APP_META_PIXEL_ID;

const STORAGE_KEY = "paw_ph_distinct_id";

function uuidv4() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let distinctId = null;
let personProps = {};

function getDistinctId() {
  if (distinctId) return distinctId;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      distinctId = stored;
      return distinctId;
    }
  } catch (e) {
    console.warn("[analytics] localStorage read failed:", e);
  }
  distinctId = uuidv4();
  try {
    localStorage.setItem(STORAGE_KEY, distinctId);
  } catch (e) {
    console.warn("[analytics] localStorage write failed:", e);
  }
  return distinctId;
}

export function initAnalytics() {
  if (KEY) getDistinctId();
}

// ---------------------------------------------------------------------------
// PostHog (direct ingestion)
// ---------------------------------------------------------------------------

async function sendPosthog(event, properties = {}) {
  if (!KEY) return;
  const payload = {
    api_key: KEY,
    event,
    distinct_id: getDistinctId(),
    properties: {
      variant: VARIANT,
      $current_url: typeof window !== "undefined" ? window.location.href : undefined,
      $host: typeof window !== "undefined" ? window.location.host : undefined,
      $pathname: typeof window !== "undefined" ? window.location.pathname : undefined,
      $referrer: typeof document !== "undefined" ? document.referrer : undefined,
      $lib: "paw-light-tracker",
      ...personProps,
      ...properties,
    },
    timestamp: new Date().toISOString(),
  };
  try {
    await fetch(`${HOST.replace(/\/$/, "")}/i/v0/e/`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
      keepalive: true,
      mode: "cors",
    });
  } catch (e) {
    console.warn("[analytics] posthog send failed:", e);
  }
}

// ---------------------------------------------------------------------------
// GA4 + Meta Pixel mapping
// ---------------------------------------------------------------------------

function gtagSafe() {
  return typeof window !== "undefined" && typeof window.gtag === "function" ? window.gtag : null;
}
function fbqSafe() {
  return typeof window !== "undefined" && typeof window.fbq === "function" ? window.fbq : null;
}

// Map our internal event names to standard ecommerce events for GA4 + Meta
function fireGA4AndMeta(event, props) {
  const gtag = gtagSafe();
  const fbq = fbqSafe();
  const variantParam = { variant: VARIANT };

  switch (event) {
    case "$pageview": {
      gtag && gtag("event", "page_view", {
        page_path: props.$current_url || (typeof window !== "undefined" ? window.location.pathname : ""),
        ...variantParam,
      });
      fbq && fbq("track", "PageView");
      break;
    }
    case "vip_code_validated":
    case "public_cta_clicked": {
      gtag && gtag("event", "sign_up", {
        method: event === "vip_code_validated" ? "vip_code" : "public_link",
        ...variantParam,
      });
      fbq && fbq("track", "Lead", { content_category: event });
      break;
    }
    case "room_selected": {
      gtag && gtag("event", "select_item", {
        item_list_name: "rooms",
        items: [{ item_id: props.room_id, item_name: props.room_id }],
        ...variantParam,
      });
      fbq && fbq("track", "ViewContent", {
        content_ids: [props.room_id],
        content_type: "product",
        content_category: "room",
      });
      break;
    }
    case "checkout_initiated": {
      gtag && gtag("event", "begin_checkout", {
        currency: "USD",
        items: [{ item_id: props.room_id, item_name: props.room_id, quantity: 1 }],
        ...variantParam,
      });
      fbq && fbq("track", "InitiateCheckout", {
        content_ids: [props.room_id],
        content_type: "product",
        content_category: "room",
        num_items: 1,
      });
      break;
    }
    case "checkout_paid": {
      const value = Number(props.amount || 0);
      gtag && gtag("event", "purchase", {
        transaction_id: props.session_id,
        value,
        currency: "USD",
        items: [{ item_id: props.room_id, item_name: props.room_id, price: value, quantity: 1 }],
        ...variantParam,
      });
      fbq && fbq("track", "Purchase", {
        value,
        currency: "USD",
        content_ids: [props.room_id],
        content_type: "product",
      });
      break;
    }
    case "checkout_cancelled":
    case "checkout_expired":
    case "checkout_failed": {
      gtag && gtag("event", event, variantParam);
      break;
    }
    default: {
      // generic custom event — still ping GA4 so it shows up in reports
      gtag && gtag("event", event, { ...props, ...variantParam });
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function track(event, props = {}) {
  sendPosthog(event, props);
  try { fireGA4AndMeta(event, props); } catch (e) {
    console.warn("[analytics] GA4/Meta track failed:", e);
  }
}

export function pageview(path) {
  sendPosthog("$pageview", { $current_url: path });
  try { fireGA4AndMeta("$pageview", { $current_url: path }); } catch (e) {
    console.warn("[analytics] GA4/Meta pageview failed:", e);
  }
}

export function identify(email, traits = {}) {
  if (!email) return;
  const prevId = getDistinctId();
  personProps = { ...personProps, ...traits, email };
  sendPosthog("$identify", {
    $set: { email, variant: VARIANT, ...traits },
    $anon_distinct_id: prevId,
    distinct_id: email,
  });
  distinctId = email;
  try {
    localStorage.setItem(STORAGE_KEY, email);
  } catch (e) {
    console.warn("[analytics] localStorage identify write failed:", e);
  }
  // GA4 user_id (hash on server in production; safe here as it's PII-free hash-ready)
  const gtag = gtagSafe();
  if (gtag && GA4_ID) {
    gtag("config", GA4_ID, { user_id: email });
  }
  // Meta advanced matching
  const fbq = fbqSafe();
  if (fbq && META_ID) {
    fbq("init", META_ID, { em: email });
  }
}
