import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { track } from "@/lib/analytics";

const FAQ_GROUPS = [
  {
    id: "pre-booking",
    label: "Pre-Booking PawHaus",
    items: [
      {
        q: "Can I still get a Founders Pass?",
        a: "The 100 Founders passes are gone and that program is closed for good. But you do not need one to get in early. Pre-booking is open now, and you save 30% when you reserve before we open to the public.",
      },
      {
        q: "What do I get by pre-booking now?",
        a: "30% off your stay and your pick of dates before general booking opens. The earlier you reserve, the better the availability, especially for weekends and the larger ÖÖD mirror houses.",
      },
      {
        q: "How does the 30% off work?",
        a: "Reserve your unit and dates during pre-booking and 30% comes off at checkout. No code to hunt for. It's built into the pre-booking rate.",
      },
      {
        q: "How do I pre-book?",
        a: "Right here on this page. Choose your unit and dates, place your deposit, and you're locked in at the pre-booking rate. Questions, email bark@staypawhaus.com.",
      },
      {
        q: "Is my deposit refundable?",
        a: "Yes. Your deposit is refundable up to 14 days before your stay, and you can reschedule up to that same window. Full terms are shown at checkout before anything is charged.",
      },
      {
        q: "Why pre-book instead of waiting for public booking?",
        a: "Two reasons. Price and availability. Pre-booking saves you 30%, and you choose from open dates before everyone else. Once we open to the public, rates go to standard and the calendar fills fast.",
      },
      {
        q: "When does PawHaus open?",
        a: "We're opening in December 2026, and we're on pace. Pre-booking is open now so you can lock your dates and your rate ahead of the crowd.",
      },
    ],
  },
  {
    id: "the-dogs",
    label: "The Dogs",
    items: [
      {
        q: "Is this actually dog-first, or pet-friendly with a nicer name?",
        a: "Dog-first, and the difference is everything. Pet-friendly means your dog is tolerated in the corner with a fee attached. At PawHaus your dog is the reason the place exists. Every space, every amenity, every detail was built with them in mind.",
      },
      {
        q: "Do I need to bring a dog to come?",
        a: "Not at all. You're welcome with or without a pup. We partner with local shelters so you can spend the day with a dog who needs one, or just settle in and enjoy everything PawHaus has to offer dog-free.",
      },
      {
        q: "How many dogs can I bring?",
        a: "Two dogs per unit, no weight limit. Our larger Big Monolith units can take up to three. Need to bring more than that? Email bark@staypawhaus.com before you book and we'll see what we can do.",
      },
      {
        q: "Are there breed or size restrictions?",
        a: "No breed restrictions and no weight limits. Great Dane or Chihuahua, equally welcome. Because this is a shared dog environment, we keep it safe for everyone. Every owner completes a short declaration confirming their dog has no bite history or aggression, all guests submit current vaccination records before arrival, and every dog does a quick five-minute temperament check at check-in. Any dog showing aggression will be asked to leave.",
      },
      {
        q: "Is there a pet fee?",
        a: "No. Dog-first means your dog isn't a line item, they're the whole point. The rate is the rate.",
      },
      {
        q: "What dog amenities are on site?",
        a: (
          <>
            <p>This is where it gets good.</p>
            <ul className="mt-3 space-y-1.5 list-disc pl-5">
              <li>The Nature Dog Park, an open space to run and play</li>
              <li>A private fenced yard at every unit, so your dog has their own space off-leash</li>
              <li>A private dog run you can rent when you want the space to yourselves</li>
              <li>An on-leash hiking trail across the property</li>
              <li>A dog spa for grooming and post-bath glamour shots</li>
              <li>A dog concierge you can hire by the hour to walk or watch your dog, with monitored group play available</li>
              <li>Free pup cups in the lobby anytime we&apos;re open</li>
              <li>A dog welcome bag, an elevated dog bed, and a stainless water and feed station in every unit</li>
            </ul>
          </>
        ),
      },
      {
        q: "Where can my dog be off-leash?",
        a: "Inside your mirror house and in your unit's private fenced yard, your dog is free. The Nature Dog Park and the rentable private dog run are open-play spaces. Our hiking trail is on-leash. We'll have monitors at the dog park at times, but it's use at your own risk, and any dog showing aggression is asked to leave immediately.",
      },
      {
        q: "Can I leave my dog alone in the unit?",
        a: "We ask that you don't. You're responsible for any damage your dog causes, so leaving them alone isn't a good idea. If you want to head out without your pup, hire one of our team by the hour to walk or watch them, or drop them for monitored group play at an hourly rate.",
      },
      {
        q: "What if my dog barks a lot?",
        a: "A little noise is part of dog life and we get it. For excessive overnight barking, you'll get one courtesy warning. If it keeps disturbing other guests after that, we'll have to ask you to leave, and the remaining nights of your stay are non-refundable. If you've got a dog who barks nonstop, PawHaus probably isn't the right fit, and we'd rather be upfront about that now than ruin the trip later.",
      },
      {
        q: "Is there a vet nearby?",
        a: "Yes. There's a vet within 15 minutes during business hours, and a 24-hour emergency vet less than 30 minutes away. We keep the details posted in the lobby too.",
      },
      {
        q: "What do I need to do before we arrive?",
        a: "Two quick things. Submit your dog's current vaccination records ahead of time, and complete a short declaration confirming your dog has no bite history or aggression. At check-in, every dog does a quick five-minute temperament check. That's it.",
      },
      {
        q: "What do I need to pack for my dog?",
        a: "Less than you'd think. Beds, bowls, and water stations are already in your unit, and treats are in your welcome bag. Bring their food, their leash, and anything that makes them feel at home.",
      },
    ],
  },
  {
    id: "the-stay",
    label: "The Stay",
    items: [
      {
        q: "What are the units?",
        a: "ÖÖD mirror houses. Mirror-paneled cabins that reflect the landscape and all but disappear into the trees and water. Floor-to-ceiling glass on the inside, total privacy from the outside. There's nothing else like them in Texas.",
      },
      {
        q: "How many people can stay in a unit?",
        a: "Most ÖÖD mirror houses sleep two people and two dogs. Our larger Big Monolith units fit three to four people and up to three dogs. They're intimate spaces at around 500 square feet, so pack light and stay cozy.",
      },
      {
        q: "What's included?",
        a: "Your mirror house, the full run of the property, and dog amenities built into every unit. Elevated dog bed, stainless water and feed station, premium natural bedding, warm lighting throughout, a private fenced yard, and a private deck with a sightline to water or tree canopy.",
      },
      {
        q: "Is there food on site?",
        a: "Yes. We'll have rotating food trucks and more for everyone, so you and your dog never have to leave to eat well. And pup cups are free in the lobby anytime we're open.",
      },
      {
        q: "What's here for the humans?",
        a: "Plenty. The Fetch Club, our fitness space, an on-leash hiking trail, rotating food trucks, and 30 acres of private lakefront to explore.",
      },
      {
        q: "Can my dog or I swim in the lake?",
        a: "We don't recommend swimming in the lake, for people or dogs. Any time in the water is at your own risk. There's plenty of dry ways to enjoy the lakefront.",
      },
      {
        q: "How's the WiFi and cell service?",
        a: "Generally good. That said, you're in the woods on a rural lakefront, so service can get spotty here and there. Think of it as part of the escape.",
      },
      {
        q: "What does my stay cost?",
        a: "Standard rates start at $700 to $1,000 a night depending on the unit and dates. Pre-book now and take 30% off that, locked in before public booking opens.",
      },
      {
        q: "Where exactly is PawHaus?",
        a: "Thirty private lakefront acres near Lake Livingston in Goodrich, Texas. About 90 minutes from Houston. Close enough for a weekend, far enough to feel like you actually left.",
      },
      {
        q: "Is this real, or just renderings?",
        a: "Real, and further along than you'd think. Most of the site work is already done, and our ÖÖD mirror houses are being built in a factory in Houston, Texas right now. We use renderings to show the finished vision, and we're documenting the whole build in the open. Follow @pawhausresort to watch it come together.",
      },
    ],
  },
  {
    id: "booking-logistics",
    label: "Booking & Logistics",
    items: [
      {
        q: "What dates can I book?",
        a: "Open dates are live now right here on this page. Weekends and the larger ÖÖD mirror houses go fastest, so reserve early.",
      },
      {
        q: "Is there a damage deposit?",
        a: "Yes. We keep a $250 refundable damage deposit and a card on file. Normal wear from a well-behaved dog is expected and fine. The deposit is released within 24 hours of check-out if no damage occurs. Anything beyond your deposit gets billed to the card on file, which is why we ask that dogs aren't left unattended in the units.",
      },
      {
        q: "Can I visit just for the day?",
        a: "Not yet. PawHaus is overnight-only for now. We're always adding, so stay tuned.",
      },
      {
        q: "Who do I contact with questions?",
        a: (
          <>
            Email{" "}
            <a
              href="mailto:bark@staypawhaus.com"
              className="underline"
              style={{ color: "var(--paw-clay)" }}
              onClick={() => track("faq_email_click", { source: "faq" })}
            >
              bark@staypawhaus.com
            </a>{" "}
            and a real human gets back to you, usually within 24 hours. Or DM us @pawhausresort.
          </>
        ),
      },
    ],
  },
];

export default function FaqSection() {
  return (
    <section
      id="faq"
      data-testid="faq-section"
      className="mx-auto max-w-[1400px] px-6 sm:px-10 pt-32 scroll-mt-24"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-4">
          <div className="overline mb-4" style={{ color: "var(--paw-clay)" }}>
            Pre-Booking FAQ
          </div>
          <h3
            className="font-display text-4xl sm:text-5xl leading-[1.05]"
            style={{ color: "var(--paw-ink)" }}
          >
            Questions, answered.
          </h3>
          <p
            className="mt-6 text-base leading-relaxed"
            style={{ color: "var(--paw-ink-2)" }}
          >
            The 100 Founders passes have closed. You can still get in early — and you still save 30% when you pre-book.
          </p>
          <p
            className="mt-4 text-sm leading-relaxed"
            style={{ color: "var(--paw-muted)" }}
          >
            Don&apos;t see your question? Email{" "}
            <a
              href="mailto:bark@staypawhaus.com"
              className="underline"
              style={{ color: "var(--paw-clay)" }}
              onClick={() => track("faq_email_click", { source: "faq_header" })}
              data-testid="faq-email-link"
            >
              bark@staypawhaus.com
            </a>
            .
          </p>
        </div>

        <div className="md:col-span-8 space-y-10">
          {FAQ_GROUPS.map((group) => (
            <div key={group.id} data-testid={`faq-group-${group.id}`}>
              <div
                className="overline mb-3"
                style={{ color: "var(--paw-muted)" }}
              >
                {group.label}
              </div>
              <Accordion
                type="multiple"
                className="w-full"
                onValueChange={(open) =>
                  open.length > 0 &&
                  track("faq_item_opened", { group: group.id, opened_count: open.length })
                }
              >
                {group.items.map((item, idx) => (
                  <AccordionItem
                    key={`${group.id}-${idx}`}
                    value={`${group.id}-${idx}`}
                    data-testid={`faq-item-${group.id}-${idx}`}
                    style={{ borderColor: "var(--paw-line)" }}
                  >
                    <AccordionTrigger
                      className="text-base font-normal py-5"
                      style={{ color: "var(--paw-ink)" }}
                    >
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent
                      className="text-sm leading-relaxed pb-5"
                      style={{ color: "var(--paw-ink-2)" }}
                    >
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
