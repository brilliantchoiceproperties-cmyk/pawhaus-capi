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
  pets: [{ name: "", breed: "", size: "Medium (25-60 lb)", special_needs: "" }],
  notes: "",
};

export function BookingProvider({ children }) {
  const [catalog, setCatalog] = useState(null);
  const [tier, setTier] = useState(null); // 'VIP' | 'PUBLIC'
  const [tierLabel, setTierLabel] = useState("");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [roomId, setRoomId] = useState(null);
  const [stayId, setStayId] = useState("WEEKDAY_1N");
  const [guests, setGuests] = useState(defaultGuests);

  // Load persisted
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.tier) setTier(data.tier);
        if (data.tierLabel) setTierLabel(data.tierLabel);
        if (data.discountPercent != null) setDiscountPercent(data.discountPercent);
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
    const data = { tier, tierLabel, discountPercent, roomId, stayId, guests };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // ignore
    }
  }, [tier, tierLabel, discountPercent, roomId, stayId, guests]);

  useEffect(() => {
    fetchCatalog().then(setCatalog).catch(() => {});
  }, []);

  const reset = useCallback(() => {
    setTier(null);
    setTierLabel("");
    setDiscountPercent(0);
    setRoomId(null);
    setStayId("WEEKDAY_1N");
    setGuests(defaultGuests);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setTierFromValidation = useCallback((info) => {
    setTier(info.tier);
    setTierLabel(info.tier_label);
    setDiscountPercent(info.discount_percent);
  }, []);

  const enterPublic = useCallback(() => {
    setTier("PUBLIC");
    setTierLabel("Pre-Launch Guest");
    setDiscountPercent(0.2);
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
        setTierFromValidation,
        enterPublic,
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
