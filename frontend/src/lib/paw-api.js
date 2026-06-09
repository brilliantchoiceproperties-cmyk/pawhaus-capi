import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({
  baseURL: API,
  headers: { "Content-Type": "application/json" },
});

export const fetchCatalog = () => api.get("/catalog").then((r) => r.data);
export const getQuote = (payload) => api.post("/quote", payload).then((r) => r.data);
export const createCheckoutSession = (payload) =>
  api.post("/payments/checkout/session", payload).then((r) => r.data);
export const getPaymentStatus = (sessionId) =>
  api.get(`/payments/checkout/status/${sessionId}`).then((r) => r.data);
