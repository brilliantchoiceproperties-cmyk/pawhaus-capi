import React, { useEffect, useState } from "react";
import axios from "axios";
import { Flame, Sparkles } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ScarcityTicker() {
  const [data, setData] = useState(null);
  const [recentIdx, setRecentIdx] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await axios.get(`${API}/scarcity`);
        if (!cancelled) setData(r.data);
      } catch (e) {
        // silent fail — ticker is non-critical
      }
    };
    load();
    const t = setInterval(load, 60000); // refresh every 60s
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // Rotate recent bookings every 5 seconds
  useEffect(() => {
    if (!data?.recent?.length) return;
    const t = setInterval(() => {
      setRecentIdx((i) => (i + 1) % data.recent.length);
    }, 5000);
    return () => clearInterval(t);
  }, [data?.recent?.length]);

  if (!data) return null;

  const monolithLeft = data.weekends_left?.monolith;
  const standardLeft = data.weekends_left?.standard;
  const petiteLeft = data.weekends_left?.petite;
  const recent = data.recent?.[recentIdx];

  // Find the cabin closest to selling out (highest scarcity = fewest left)
  const cabinPairs = [
    { id: "monolith", name: "Monolith", left: monolithLeft },
    { id: "standard", name: "Standard", left: standardLeft },
    { id: "petite", name: "Petite", left: petiteLeft },
  ].filter((c) => typeof c.left === "number");
  const hotCabin = cabinPairs.sort((a, b) => a.left - b.left)[0];

  return (
    <div
      data-testid="scarcity-ticker"
      className="paw-card overflow-hidden"
      style={{
        background: "var(--paw-bg)",
        borderColor: "var(--paw-clay)",
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x" style={{ borderColor: "var(--paw-line)" }}>
        {/* LEFT — scarcity */}
        {hotCabin && (
          <div className="flex items-center gap-3 px-5 py-4" data-testid="scarcity-left">
            <Flame
              size={18}
              strokeWidth={1.8}
              style={{ color: "var(--paw-clay)" }}
            />
            <div className="text-sm" style={{ color: "var(--paw-ink)" }}>
              <span className="overline" style={{ color: "var(--paw-clay)" }}>
                Going fast
              </span>{" "}
              · Only{" "}
              <strong style={{ color: "var(--paw-clay)" }}>
                {hotCabin.left} {hotCabin.name} weekend{hotCabin.left === 1 ? "" : "s"}
              </strong>{" "}
              left in our launch window
            </div>
          </div>
        )}

        {/* RIGHT — recent booking */}
        {recent && (
          <div className="flex items-center gap-3 px-5 py-4" data-testid="scarcity-right">
            <Sparkles
              size={16}
              strokeWidth={1.8}
              style={{ color: "var(--paw-forest)" }}
            />
            <div className="text-sm" style={{ color: "var(--paw-ink-2)" }}>
              <strong style={{ color: "var(--paw-ink)" }}>
                {recent.first_name}
              </strong>{" "}
              just booked the{" "}
              <strong style={{ color: "var(--paw-ink)" }}>{recent.room_name}</strong>{" "}
              <span style={{ color: "var(--paw-muted)" }}>· {recent.ago}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
