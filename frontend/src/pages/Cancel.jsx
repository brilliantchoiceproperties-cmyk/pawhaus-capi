import React from "react";
import { useNavigate } from "react-router-dom";

export default function Cancel() {
  const navigate = useNavigate();
  return (
    <div data-testid="cancel-page" className="mx-auto max-w-[900px] px-6 sm:px-10 py-24 text-center">
      <div className="overline" style={{ color: "var(--paw-muted)" }}>
        Payment cancelled
      </div>
      <h1 className="font-display text-5xl mt-3" style={{ color: "var(--paw-ink)" }}>
        No worries — your spot is still open.
      </h1>
      <p className="mt-5 text-base max-w-xl mx-auto leading-relaxed" style={{ color: "var(--paw-ink-2)" }}>
        Nothing was charged. Your selections are saved — pick up exactly where you
        left off.
      </p>
      <div className="mt-9 flex gap-3 justify-center">
        <button
          data-testid="cancel-resume-button"
          onClick={() => navigate("/booking")}
          className="paw-btn-primary"
        >
          Resume my reservation
        </button>
        <button
          data-testid="cancel-home-button"
          onClick={() => navigate("/")}
          className="paw-btn-secondary"
        >
          Back to landing
        </button>
      </div>
    </div>
  );
}
