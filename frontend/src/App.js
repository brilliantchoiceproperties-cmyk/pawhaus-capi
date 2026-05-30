import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { BookingProvider } from "@/context/BookingContext";
import Header from "@/components/paw/Header";
import Footer from "@/components/paw/Footer";
import Landing from "@/pages/Landing";
import Booking from "@/pages/Booking";
import Success from "@/pages/Success";
import Cancel from "@/pages/Cancel";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <BookingProvider>
          <Header />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/booking/success" element={<Success />} />
            <Route path="/booking/cancel" element={<Cancel />} />
          </Routes>
          <Footer />
        </BookingProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
