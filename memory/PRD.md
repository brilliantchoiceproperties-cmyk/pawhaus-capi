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

## Additional Updates (2026-02 → 2026-06)
- ✅ Stripe upgraded to **LIVE MODE** + HMAC-verified webhook (`/api/webhook/stripe`)
- ✅ Dynamic pricing engine: weekday vs weekend rates + 1-night 10% surcharge
- ✅ Date validation: blocks check-ins before Dec 1, 2026 + holiday blackouts
- ✅ Pet capacity enforcement per room (Petite: 2, Standard/Monolith: 3) — server + UI
- ✅ Cameron Ranch Glamping credibility section + Email CTAs (bark@staypawhaus.com)
- ✅ Unified analytics tracker: PostHog + GA4 + Meta Pixel (`analytics.js`)
- ✅ Property photo galleries powered by optimized webp assets in `/public/brand/`
- ✅ **GoHighLevel integration** — `GHL_WEBHOOK_URL` env. `notify_ghl_payment_success()` fires on Stripe webhook + status polling. Idempotent via `ghl_notified_at`. Full booking payload (contact + booking + pets + monetary) POSTed for GHL workflow to map.
- ✅ **Public-only pivot (2026-06)**: This A/B variant is now Public 25%-only. All VIP/Insider/Founders code paths stripped from backend (`/api/code/validate` removed; DISCOUNTS dict reduced to PUBLIC) and frontend (Landing two-lane → single Public CTA; tier auto-defaults to PUBLIC in BookingContext; check-in fixed at 4PM). User maintains a separate site for VIP audience.
- ✅ **House Rules** — 6 rules added: temperament tested, vaccines verified (Rabies/DHPP/Bordetella), quiet hours 10PM–8AM, cabin pet capacity enforcement, $250 refundable damage deposit, no dogs left unattended. Visible on landing page + required agreement checkbox on Review step (blocks Pay button until checked).
- ✅ **Welcome Perks (2026-02-12)** — Every booking now includes (1) a free PawHaus welcome bandana per dog, and (2) a per-dog choice of either a free Nail Trim or Signature Blueberry Facial. `Pet.spa_perk` field on backend (validates to nail_trim/blueberry_facial, defaults nail_trim). Visible as a callout banner on Booking Step 2 above the pets section, per-pet perk picker inside each pet card, summary line on Step 3 Review, confirmation block on Success page, new PERKS column on `/admin` table, and `welcome_bandana` + `perks_summary` fields added to GHL webhook payload for ops prep. Public landing card bullet list also updated. Pytest 9/9 + UI E2E verified.
- ✅ **Referral fields in GHL payload (2026-02-12)** — `notify_ghl` payment_success payload extended with `referral_code`, `referral_share_url` (pre-built share link), `referred_by_code`, `referred_by_email`, `referral_discount_applied` — lets GHL workflow auto-email the buyer their referral link on payment success without code changes. Verified with mocked httpx test (8/8 pass including end-to-end referral flow).
- ✅ **Conversion-optimization batch (2026-02-12)** — 4 features shipped:
   1. **Mobile sticky CTA bar** (`MobileStickyBar.jsx`) — fixed bottom on mobile only (`md:hidden`), slides up after 30vh scroll, "30% off every booking — Book Now" → /booking.
   2. **Exit-intent modal** (`ExitIntentModal.jsx`) — desktop mouseout (clientY≤0) + mobile scroll-idle (60% + 6s) triggers; single-email capture for extra $25 off code (`PAW25`); localStorage flag `pawhaus_exit_intent_seen` prevents repeat triggers; POSTs to new `/api/lead-capture` endpoint (upserts into `db.leads` + fires GHL webhook `event=exit_intent_lead`).
   3. **Sharper price anchor** on Booking room cards — adds savings badge (`Save $X` forest pill) next to discount price + green "+ free welcome bandana & spa treatment per dog (worth $40)" line below.
   4. **Founder section** (`FounderSection.jsx`) — adds Garrett Brown's photo + 3-paragraph founder story between Cameron Ranch and "Inside the cabin" sections on Landing; photo at `/brand/garrett.webp` (51KB).
   All 4 verified via testing agent: 100% backend (6/6 lead-capture pytest) + 100% frontend (mobile sticky, desktop exit-intent, founder section, all 3 room cards with savings badge, full booking funnel regression to live Stripe URL).
- ✅ **PAW25 Promo Code (2026-02-12)** — Wired the $25 exit-intent code as a real backend discount. New `PROMO_CODES = {"PAW25": 25.0}` dict in server.py for easy expansion, `_validate_promo_code()` helper (case-insensitive, silent rejection), `promo_code` field added to QuoteRequest/CheckoutRequest, `calculate_quote()` stacks promo on top of 30% public + $50 referral with $1 hard floor. New `lib/promo.js` mirrors referral.js (URL `?promo=PAW25` → localStorage `pawhaus_promo_code`). `SummaryCard.jsx` displays applied promo (data-testid='summary-promo'), supports manual entry via 'Have a promo code?' toggle + input, shows error on invalid codes (data-testid='summary-promo-error'), allows removal. GHL `payment_success` payload now includes `promo_code` + `promo_discount_applied`. Pytest 10/10 (case-insensitive, stacks with referral $75 total off, persists to booking + GHL, $1 floor). Frontend E2E 100% (URL auto-apply, manual entry, error display, remove). Full Stripe regression verified to live `cs_live_` URL.
- ✅ **Room Catalog v2 + Dog Difference Section (2026-02-16, polished 2026-02-16)** — Major room/pricing restructure with later naming revert:
   - Two-SKU split of "Standard Room" (kept original brand name) to measure hot-tub demand:
     - `standard` (no hot tub) — $623/wkday-1N base
     - `standard_ht` (with wood-fired hot tub) — $698/wkday-1N base, exactly $75/night premium
   - Bumped Monolith prices by $50/night across all stays ($898→$948 wkday/1N, etc.)
   - `ROOM_DAILY_CAPS = {"standard_ht": 2}` — hard 409 when 3rd booking attempted on same check-in date
   - `PENDING_BOOKING_TTL_MIN = 30` — abandoned carts older than 30 min no longer count toward cap (filter on created_at)
   - New `DogDifferenceSection.jsx` on Landing with **5 cards** (In your cabin / In your private yard / Across the property / Our service / Wash, spa & pool) covering all dog amenities: dedicated dog bed, treat bag, food/water bowls preset, towel stash, designated potty corner with cedar waste station, ground-level auto-fill water bowl, shaded cedar dog cot, **coming soon: solar-heated outdoor shower + private cold rinse station per cabin**, 30 acres off-leash, water bowls everywhere, pup cups, named-greeting service, **Vetster 24/7 vet partnership**, 10–15min to daytime vet / 30min to 24-hr emergency hospital, **DIY dog wash station included**, **paid PawHaus Dog Spa bath while owner relaxes in pool or human spa**.
   - New `GET /api/admin/inventory` endpoint — returns per-date booking counts for every capped SKU with {booked, confirmed, pending, remaining, status: open/low/sold_out}. Default window 400 days to capture launch window.
   - New `admin-inventory-widget` on `/admin` page above bookings table — table with Date / Site / Cabin / Booked / Remaining / Status badge. Hidden when no inventory bookings exist. Helps operator plan hot-tub install before launch.
   - Pytest: 41/41 tests pass. Frontend testing agent 100%.
- ✅ **PostHog A/B enrichment (2026-02-16)** — Every key funnel event (`room_selected`, `checkout_initiated`, `checkout_paid`) now carries enriched A/B-comparison properties via new `roomEventProps(roomId)` helper in `analytics.js`. Auto-attaches `room_name` (human-readable), `has_hot_tub` (boolean — true for standard_ht & monolith), and `is_capped_sku` (boolean — true for standard_ht only). Lets the operator build PostHog funnels filtered/grouped by hot tub demand without memorizing which room_id maps to what. Used as `track("checkout_initiated", { ...roomEventProps(roomId), tier, stay_id, ... })`.
- ✅ **Property Photo Gallery (2026-06-30)** — New `GallerySection.jsx` editorial magazine-style asymmetric grid added to Landing between `DogDifferenceSection` and the "Inside the cabin" block. 13 curated property photos (signature-exterior, pool-twilight, dog-park-2, signature-interior, monolith-exterior, treat-bar-suite, human-spa, grooming-salon, wash-station, shower, play-lounge, lobby, dog-park) optimized as webp under `/brand/`. 5-row asymmetric layout (1 hero + 2 stacked → 2 medium → 3 trio → 4 quartet → 1 panoramic finale). Click any tile → full-screen lightbox with caption; closes via X button, backdrop tap, or **Escape key**. Mobile: single-column stack with sub-captions always visible (no hover dependency). Native lazy-loading on all 13 tiles; aria-label on each. Frontend testing agent 21/21 assertions pass.

- ✅ **All 3 Room Galleries refreshed (2026-06-30)** — Replaced legacy room photos in `Booking.jsx` with curated 5-6 photo carousels per tier:
  - **Petite (6):** `cabin-vol` (twilight fire pit, LEAD) → `cabin-yg` (golden hour Cabin 101) → `petite-mirror-sunset` (Petite-exclusive sunset mirror cabin) → `petite-kitchen` → `petite-treatbar-lifestyle` (Doggy Treat Bar, man) → `shower`
  - **Standard (6):** `petite-mirror` (mirror cabin LEAD) → `standard-treatbar-lake` (Treat Bar, woman, lake) → `cabin-vol` → `cabin-yg` → `petite-kitchen` → `shower`
  - **Monolith (5):** `monolith-mirror-couple` (mirror cabin, couple, 2 dogs golden hour, LEAD) → `monolith-hottub` (wood-fired hot tub + fire pit + couple) → `monolith-bedroom-lake` (corner glass bedroom) → `monolith-dining` (green velvet chairs + lake) → `monolith-kitchen` (kitchenette + dog bed)
  - Cross-room shared assets are intentional (same architectural unit) but lead photos are unique per tier for visual differentiation in the funnel.

- ✅ **Exit-Intent Pop-up — major UX & GHL upgrade (2026-06-30)**
  - **New: 15-second dwell trigger** added to existing mouseout + scroll-idle triggers (fires whichever first; once per session via localStorage)
  - **New: First name field** alongside email — both required
  - **New: Code revealed on screen immediately** in big dashed-border tile (copy-selectable `PAW25`) with personalized success: *"You're in, {firstName}."* — plus email delivery
  - **New copy:** Removed misleading "we'll text you" language. New: *"Drop your name and email and we'll reveal your one-time $25 off code on the next screen — and email it to you for safekeeping."*
  - **Submit button:** *"Reveal my $25 code"*
  - **Backend:** `LeadCaptureRequest` now accepts `first_name`; saved to `db.leads`; GHL payload includes `"first_name"` field for Contact mapping
  - **GHL routing:** Added dedicated `GHL_EXIT_INTENT_WEBHOOK_URL` env var with priority fallback chain (exit_intent → main → abandoned). User created dedicated workflow `PawHaus — Exit Intent $25 Off (PAW25)` with inbound webhook URL set in env. **Live tested 2026-06-30 03:57** — payload landed in GHL.
  - **PAW25 email copy delivered** (3-email sequence: immediate, 24hr reminder, 47hr final) — user owns plug-in to GHL workflow.

- ✅ **PostHog `gallery_tile_click` tracking (2026-06-30)** — Every gallery tile click fires `gallery_tile_click` event with `{ tile_key, tile_label, position }` (1-13 ordinal). Lets operator identify highest-engagement property photos within 1 week of launch to reorder hero tile for max conversion lift.

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
