# PawHaus VIP Portal — A/B-Test Variant

## Original Problem Statement
User wanted to build an A/B-test variant of their existing PawHaus VIP Portal (a dog-first luxury nature hotel pre-booking site) built in Emergent. User supplied a detailed PDF specification for mimicking the original site's offer logic with clearer presentation. The A/B test will compare the new variant against the original's "dark forest" aesthetic and single-hero landing.

## User Choices (locked in)
- **Landing layout:** Two-lane funnel — Founders VIP card + Pre-Launch 20% card side-by-side above the fold
- **VIP card status:** "Sold Out — Holders only enter code"
- **Public path:** Simple "Continue with 20% off" (no EMAIL26 reference)
- **Payment:** Real Stripe checkout (test key sk_test_emergent in env)
- **VIP rule:** 50% off one-time per email, full payment now
- **Aesthetic:** Light, organic, editorial luxury (Aman / Six Senses tier) — deliberately distinct from the original dark forest variant for A/B contrast

## Architecture

### Tech Stack
- Frontend: React 19 + React Router 7 + Tailwind + shadcn/ui primitives. Custom design tokens in CSS variables (`--paw-bg`, `--paw-forest`, `--paw-clay`). Fonts: Cormorant Garamond (display) + Outfit (body).
- Backend: FastAPI + Motor (async MongoDB). Pricing & catalog server-side authoritative.
- Payments: Stripe Checkout via `emergentintegrations.payments.stripe.checkout` (test mode).
- Persistence: `bookings` and `payment_transactions` MongoDB collections.

### Backend Endpoints (all `/api/*`)
- `GET /catalog` — rooms, stay options, discount tiers
- `POST /code/validate` — validates Founders code (PAWVIP), returns tier
- `POST /quote` — server-side computed pricing (base, discount, hot tub premium, total)
- `POST /payments/checkout/session` — creates Stripe session + booking + transaction row; blocks VIP re-use per email
- `GET /payments/checkout/status/{session_id}` — polls Stripe, updates DB once per session
- `POST /webhook/stripe` — webhook handler updates payment_transactions + bookings

### Frontend Routes
- `/` — Landing (two-lane funnel, hero, amenities, transparency)
- `/booking` — 3-step funnel (Stay → Guests & Pets → Review)
- `/booking/success` — polls payment status, shows confirmation
- `/booking/cancel` — graceful return, selections preserved in localStorage

### Pricing Rules (server-side source of truth)
| Room | Weekday Rate | Weekend Rate | Hot Tub |
|---|---|---|---|
| Petite | $558 | $558 | No |
| Standard | $658 | $658 | +$20/night |
| Monolith | $858 | $849 | +$20/night |

Discounts: VIP (PAWVIP) = 50%; PUBLIC = 20%. Applied to base only (hot tub premium is full-price add-on).

Verified examples from spec:
- VIP Standard Weekday 1N → **$349.00** ✓
- VIP Monolith Weekend 2N → **$889.00** ✓
- Public Monolith Weekend 2N → **$1,398.40** ✓

## What's Been Implemented (2026-01-30)
- ✅ Two-lane offer funnel landing with hero, property statement, amenities grid, interior gallery, construction transparency, closing CTA
- ✅ Founders code unlock (PAWVIP) with invalid-code error + public fallback link
- ✅ Public 20% path direct entry
- ✅ 3-step booking funnel with room cards, stay-type picker, full guest details + multi-pet "The Pack" section
- ✅ Live sticky summary card with server-computed quote (base / discount / hot tub / total)
- ✅ Active discount badge in header across booking flow
- ✅ Stripe Checkout integration with backend-controlled amount + dynamic origin URLs
- ✅ Success page with status polling; Cancel page preserves selections
- ✅ VIP repeat-block: one 50% checkout per email
- ✅ Persistence in localStorage across reloads
- ✅ 17/17 backend pytest cases passing; full e2e Stripe redirect verified

## Additional Updates (2026-02)
- ✅ Stripe upgraded to **LIVE MODE** + HMAC-verified webhook (`/api/webhook/stripe`)
- ✅ Dynamic pricing engine: weekday vs weekend rates + 1-night 10% surcharge
- ✅ Three discount tiers locked in: Founders (PAWVIP -50%) / Insider (PAW40 -40%) / Public (-25%)
- ✅ Date validation: blocks check-ins before Dec 1, 2026 + holiday blackouts
- ✅ Pet capacity enforcement per room (Petite: 2, Standard/Monolith: 3) — server + UI
- ✅ Cameron Ranch Glamping credibility section + Email CTAs (bark@staypawhaus.com)
- ✅ Unified analytics tracker: PostHog + GA4 + Meta Pixel (`analytics.js`)
- ✅ Property photo galleries powered by optimized webp assets in `/public/brand/`
- ✅ Tier-based check-in/out times in funnel (VIP: 3PM in / Public+Insider: 4PM in / All: 11AM out) — user confirmed good to go

## Personas
- **Founders Pass holder** — paid $47 for early access; wants exclusive 50% off + perks; enters PAWVIP
- **Pre-launch public visitor** — no code; wants 20% off pre-launch pricing; high intent dog owner

## Prioritized Backlog
- **P1** — Add a 2nd Stripe webhook endpoint for the production domain (`experiment-forge.emergent.host`)
- **P1** — Lock backend CORS from `*` down to the live production domain
- **P1** — Confirmation email via Resend/SendGrid after successful payment
- **P2** — Admin dashboard at `/admin` to view bookings + payment transactions
- **P2** — Visual calendar showing blackout dates on Step 1 of booking
- **P2** — Founders Pass purchase flow (currently shown as "Sold Out" per user choice)
- **P3** — Refactor `Booking.jsx` (800+ lines) into `StepStay`, `StepGuests`, `StepReview` files
- **P3** — `?v=light` A/B variant URL routing
- **P3** — Wishlist / save-for-later for visitors not ready to pay
- **P3** — Optional crypto payment method (Stripe supports it for US accounts)

## Next Tasks (suggested)
1. Production-domain Stripe webhook + CORS lockdown (post-deploy hardening)
2. Wire confirmation emails on payment success
3. Add `/admin` booking-list view (gated)
