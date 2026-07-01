import React, { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { BookingProvider } from "@/context/BookingContext";
import Header from "@/components/paw/Header";
import Footer from "@/components/paw/Footer";
import Landing from "@/pages/Landing";
import Booking from "@/pages/Booking";
import Success from "@/pages/Success";
import Cancel from "@/pages/Cancel";
import Admin from "@/pages/Admin";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import { initAnalytics, pageview } from "@/lib/analytics";
import { captureReferrerFromUrl } from "@/lib/referral";
import { capturePromoFromUrl } from "@/lib/promo";

function RouteTracker() {
  const loc = useLocation();
  useEffect(() => {
    pageview(loc.pathname + loc.search);
  }, [loc.pathname, loc.search]);
  return null;
}

function App() {
  useEffect(() => {
    initAnalytics();
    captureReferrerFromUrl();
    capturePromoFromUrl();
  }, []);

  return (
    <div className="App">
      <HelmetProvider>
        <BrowserRouter>
          <BookingProvider>
            <RouteTracker />
            <Header />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/booking" element={<Booking />} />
              <Route path="/booking/success" element={<Success />} />
              <Route path="/booking/cancel" element={<Cancel />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />
            </Routes>
            <Footer />
          </BookingProvider>
        </BrowserRouter>
      </HelmetProvider>
    </div>
  );
}

export default App;
