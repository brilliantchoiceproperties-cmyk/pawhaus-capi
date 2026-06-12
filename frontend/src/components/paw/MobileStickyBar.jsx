import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Sticky bottom-of-screen "Book Now" bar — mobile only.
 * Appears after the user has scrolled past the hero (~30vh) and stays visible
 * while they browse the rest of the landing page.
 */
export default function MobileStickyBar() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Show after 30% of viewport height scrolled (past hero CTA fold)
      setVisible(window.scrollY > window.innerHeight * 0.3);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    track("mobile_sticky_cta_clicked", { source: "landing" });
    navigate("/booking");
  };

  return (
    <div
      data-testid="mobile-sticky-bar"
      aria-hidden={!visible}
      className="md:hidden fixed bottom-0 left-0 right-0 z-40"
      style={{
        transform: visible ? "translateY(0)" : "translateY(100%)",
        transition: "transform 240ms cubic-bezier(0.32, 0.72, 0, 1)",
        background: "var(--paw-bg)",
        borderTop: "1px solid var(--paw-line)",
        boxShadow: "0 -8px 24px rgba(28, 36, 30, 0.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div
            className="overline"
            style={{ color: "var(--paw-clay)", fontSize: "10px" }}
          >
            Pre-Launch Pricing
          </div>
          <div
            className="text-sm leading-tight mt-0.5"
            style={{ color: "var(--paw-ink)", fontWeight: 500 }}
          >
            30% off every booking
          </div>
        </div>
        <button
          data-testid="mobile-sticky-book-btn"
          onClick={handleClick}
          className="paw-btn-primary text-sm"
          style={{
            background: "var(--paw-clay)",
            borderColor: "var(--paw-clay)",
            padding: "12px 18px",
            whiteSpace: "nowrap",
          }}
        >
          Book Now
          <ArrowRight size={13} strokeWidth={1.8} className="inline ml-1.5 -mt-0.5" />
        </button>
      </div>
    </div>
  );
}
