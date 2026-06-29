import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
  useEffect(() => {
    document.title = "Privacy Policy · PawHaus Resort";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ background: "var(--paw-bg)", minHeight: "100vh" }}>
      <div className="mx-auto max-w-3xl px-6 sm:px-10 pt-16 pb-20">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm mb-10"
          style={{ color: "var(--paw-clay)" }}
          data-testid="privacy-back-link"
        >
          <ArrowLeft size={14} strokeWidth={1.6} /> Back to PawHaus
        </Link>

        <div className="overline mb-4" style={{ color: "var(--paw-clay)" }}>
          Last updated: February 2026
        </div>
        <h1 className="font-display text-5xl mb-10" style={{ color: "var(--paw-ink)" }}>
          Privacy Policy
        </h1>

        <div className="space-y-7 text-base leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              Who we are
            </h2>
            <p>
              PawHaus Resort (&quot;PawHaus,&quot; &quot;we,&quot; &quot;us&quot;) operates this website
              (staypawhaus.com) to take pre-launch and standard reservations for our dog-first
              nature hotel in Goodrich, TX. This policy explains how we collect, use, and protect
              the information you share with us.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              What we collect
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Identity &amp; contact:</strong> full name, email address, phone number.</li>
              <li><strong>Booking details:</strong> check-in/out dates, room selection, party size, pet name(s), breed, size, and special needs.</li>
              <li><strong>Payment:</strong> processed by Stripe — we do <strong>not</strong> see or store full card numbers. We retain a Stripe customer ID and last-four for receipts only.</li>
              <li><strong>Analytics:</strong> standard web analytics via Meta Pixel/CAPI, Google Analytics 4, PostHog, and Microsoft Clarity (anonymized session replays).</li>
              <li><strong>Marketing:</strong> referral source (e.g., <code>?ref=CODE</code>), promo codes used, exit-intent emails captured.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              SMS &amp; messaging
            </h2>
            <p>
              By providing your mobile number on this site (booking forms, lead capture, or any
              contact field), you consent to receive both <strong>transactional</strong> messages
              (booking confirmations, abandoned-cart reminders, check-in instructions) and
              occasional <strong>marketing</strong> messages (pre-launch offers, perks updates)
              from PawHaus Resort via our messaging provider (GoHighLevel + Twilio).
            </p>
            <p className="mt-3">
              <strong>Message frequency varies.</strong> Message and data rates may apply.
              Reply <strong>STOP</strong> at any time to unsubscribe — you will receive one
              final confirmation. Reply <strong>HELP</strong> for assistance. We do not share,
              sell, or rent your mobile number to third parties for their own marketing purposes.
              Your mobile opt-in is never shared, transferred, or made available to any other
              party.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              How we use your data
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Process your reservation and payment.</li>
              <li>Send booking confirmations, arrival details, and trip-related updates.</li>
              <li>Recover abandoned carts and follow up with pre-launch offers.</li>
              <li>Improve our website and the on-property experience.</li>
              <li>Comply with legal obligations (tax records, dispute resolution).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              Who we share it with
            </h2>
            <p>
              We share only what&apos;s necessary, only with vetted vendors that help us
              run the business: Stripe (payments), GoHighLevel/Twilio (email + SMS),
              Meta/Google/PostHog/Clarity (analytics), and our hosting provider. We do not
              sell your personal information.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              Your rights
            </h2>
            <p>
              You can request a copy of your data, ask us to correct or delete it, or opt out
              of marketing at any time. Email us at{" "}
              <a href="mailto:bark@staypawhaus.com" style={{ color: "var(--paw-clay)" }}>
                bark@staypawhaus.com
              </a>{" "}
              and we&apos;ll respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              Cookies &amp; tracking
            </h2>
            <p>
              We use cookies and similar technologies for analytics and to remember things
              like your referral code or saved promo. You can disable cookies in your browser
              settings, but some site features (live pricing, referral discounts) won&apos;t work.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              Children
            </h2>
            <p>
              PawHaus is built for adults booking dog-friendly stays. We do not knowingly
              collect data from children under 13.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              Changes
            </h2>
            <p>
              We may update this policy as we grow. We&apos;ll post the new version here with
              a fresh &quot;last updated&quot; date.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              Contact
            </h2>
            <p>
              Questions? Email{" "}
              <a href="mailto:bark@staypawhaus.com" style={{ color: "var(--paw-clay)" }}>
                bark@staypawhaus.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
