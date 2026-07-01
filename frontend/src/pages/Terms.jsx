import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageSeo from "@/components/seo/PageSeo";

export default function Terms() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div style={{ background: "var(--paw-bg)", minHeight: "100vh" }}>
      <PageSeo
        title="Terms of Service"
        description="PawHaus Resort terms of service — bookings, cancellations, refunds, pet policies, house rules, and payment terms."
        path="/terms"
      />
      <div className="mx-auto max-w-3xl px-6 sm:px-10 pt-16 pb-20">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm mb-10"
          style={{ color: "var(--paw-clay)" }}
          data-testid="terms-back-link"
        >
          <ArrowLeft size={14} strokeWidth={1.6} /> Back to PawHaus
        </Link>

        <div className="overline mb-4" style={{ color: "var(--paw-clay)" }}>
          Last updated: February 2026
        </div>
        <h1 className="font-display text-5xl mb-10" style={{ color: "var(--paw-ink)" }}>
          Terms of Service
        </h1>

        <div className="space-y-7 text-base leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
          <section>
            <p>
              These Terms govern your use of staypawhaus.com and any reservation you book
              with PawHaus Resort (&quot;PawHaus,&quot; &quot;we,&quot; &quot;us&quot;). By using
              the site or booking a stay, you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              Bookings &amp; payment
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>All bookings are subject to availability and confirmation.</li>
              <li>Payment is processed at booking via Stripe. All taxes and fees are included in the displayed price.</li>
              <li>Earliest check-in date is January 1, 2027 (our opening date).</li>
              <li>Blackout dates apply (Dec 24, 25, &amp; 31 currently).</li>
              <li>Check-in 4:00 PM, check-out 11:00 AM.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              Cancellations &amp; refunds
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Free reschedule or full refund</strong> if requested at least 14 days before check-in.</li>
              <li>Within 14 days of check-in: 50% refund or free date change (subject to availability).</li>
              <li>No-shows: non-refundable.</li>
              <li><strong>Pre-launch guarantee:</strong> If the property is not delivered as advertised at our January 1, 2027 opening, you get a full refund — no questions asked.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              House rules (for everyone&apos;s comfort)
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Vaccines required:</strong> all dogs must be current on Rabies, DHPP, and Bordetella.</li>
              <li><strong>Temperament-tested:</strong> dogs must be non-aggressive toward people and other dogs.</li>
              <li><strong>Pet capacity:</strong> Petite up to 2 pets; Standard and Monolith up to 3 pets. No exceptions.</li>
              <li><strong>Quiet hours:</strong> 10:00 PM – 8:00 AM, for the comfort of all guests.</li>
              <li><strong>Dogs left unattended in cabins are not permitted.</strong> Use the dog spa or daycare service if needed.</li>
              <li><strong>Damage deposit:</strong> $250 hold, refundable if no damage at checkout.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              SMS &amp; messaging
            </h2>
            <p>
              By providing your phone number, you consent to receive transactional and marketing
              SMS messages from PawHaus Resort. Message frequency varies. Message and data rates
              may apply. Reply STOP to opt out, HELP for help. See our{" "}
              <Link to="/privacy" style={{ color: "var(--paw-clay)" }}>Privacy Policy</Link>{" "}
              for full details.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              Liability
            </h2>
            <p>
              You assume normal risks of an outdoor, off-leash, nature-resort environment.
              PawHaus is not liable for injuries to humans or dogs caused by guest negligence,
              fights between guest-owned dogs, wildlife encounters, or weather events. We
              maintain general property insurance, but recommend pet insurance for your dog.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              Disputes
            </h2>
            <p>
              Any disputes will be resolved first by good-faith conversation. Failing that,
              by mediation, and finally arbitration under the laws of the State of Texas,
              Polk County.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--paw-ink)" }}>
              Changes
            </h2>
            <p>
              We may update these terms. The version active when you book is the one that
              applies to your stay.
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
