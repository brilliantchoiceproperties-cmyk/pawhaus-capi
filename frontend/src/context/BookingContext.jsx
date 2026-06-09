import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { fetchCatalog } from "@/lib/paw-api";

const BookingContext = createContext(null);

const STORAGE_KEY = "pawhaus_booking_v1";

const defaultGuests = {
  full_name: "",
  email: "",
  phone: "",
  guests: 2,
  check_in: "",
  check_out: "",
  backup_date_1: "",
  backup_date_2: "",
  pets: [{ id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()), name: "", breed: "", size: "Medium (25-60 lb)", special_needs: "" }],
  notes: "",
};

export function BookingProvider({ children }) {
  const [catalog, setCatalog] = useState(null);
  const [tier] = useState("PUBLIC");
  const [tierLabel] = useState("Pre-Launch Guest");
  const [discountPercent] = useState(0.30);
  const [roomId, setRoomId] = useState(null);
  const [stayId, setStayId] = useState("WEEKDAY_1N");
  const [guests, setGuests] = useState(defaultGuests);

  // Load persisted
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.roomId) setRoomId(data.roomId);
        if (data.stayId) setStayId(data.stayId);
        if (data.guests) setGuests({ ...defaultGuests, ...data.guests });
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Persist
  useEffect(() => {
    const data = { roomId, stayId, guests };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // ignore
    }
  }, [roomId, stayId, guests]);

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    setRoomId(null);
    setStayId("WEEKDAY_1N");
    setGuests(defaultGuests);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <BookingContext.Provider
      value={{
        catalog,
        tier,
        tierLabel,
        discountPercent,
        roomId,
        setRoomId,
        stayId,
        setStayId,
        guests,
        setGuests,
        reset,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
}
