// Lightweight PostHog client that POSTs events directly to the ingestion API.
// Bypasses posthog-js to avoid singleton conflicts with other tools (e.g. emergent dev tooling)
// that already claim `window.posthog`.

const KEY = process.env.REACT_APP_POSTHOG_KEY;
const HOST = process.env.REACT_APP_POSTHOG_HOST || "https://us.i.posthog.com";
const VARIANT = process.env.REACT_APP_VARIANT || "v2_light";

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
  } catch (e) {}
  distinctId = uuidv4();
  try {
    localStorage.setItem(STORAGE_KEY, distinctId);
  } catch (e) {}
  return distinctId;
}

export function initAnalytics() {
  if (!KEY) return;
  // Ensure we have a distinct_id ready
  getDistinctId();
}

async function send(event, properties = {}) {
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
  const body = JSON.stringify(payload);
  const url = `${HOST.replace(/\/$/, "")}/i/v0/e/`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body,
      keepalive: true,
      mode: "cors",
    });
  } catch (e) {
    // swallow — analytics must never break the app
  }
}

export function track(event, props = {}) {
  send(event, props);
}

export function pageview(path) {
  send("$pageview", { $current_url: path });
}

export function identify(email, traits = {}) {
  if (!email) return;
  // Use email as the new distinct_id (alias prior anonymous id) by sending $identify
  const prevId = getDistinctId();
  personProps = { ...personProps, ...traits, email };
  send("$identify", {
    $set: { email, variant: VARIANT, ...traits },
    $anon_distinct_id: prevId,
    distinct_id: email,
  });
  distinctId = email;
  try {
    localStorage.setItem(STORAGE_KEY, email);
  } catch (e) {}
}
