import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Lock, RefreshCw, DollarSign, TrendingUp, Users, MapPin, Calendar, Flame } from "lucide-react";

const LS_TOKEN = "pawhaus_admin_token";
const LS_SITES = "pawhaus_admin_sites";

const THIS_SITE = {
  id: "this",
  label: "PawHaus Public",
  base_url: process.env.REACT_APP_BACKEND_URL,
};

function loadStoredSites() {
  try {
    const raw = localStorage.getItem(LS_SITES);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("[admin] failed to read connected sites:", e);
  }
  return [];
}

function saveSites(sites) {
  try {
    localStorage.setItem(LS_SITES, JSON.stringify(sites));
  } catch (e) {
    console.warn("[admin] failed to persist connected sites:", e);
  }
}

export default function Admin() {
  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN) || "");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({}); // keyed by site id
  const [bookings, setBookings] = useState([]);
  const [inventory, setInventory] = useState([]); // [{site_id, site_label, room_id, room_name, cap, date, booked, remaining, status}]
  const [loading, setLoading] = useState(false);
  const [extraSites, setExtraSites] = useState(() => loadStoredSites());
  const [newSiteUrl, setNewSiteUrl] = useState("");
  const [newSiteLabel, setNewSiteLabel] = useState("");

  const allSites = useMemo(() => [THIS_SITE, ...extraSites], [extraSites]);

  const handleLogin = async () => {
    if (!token.trim()) { setError("Enter an admin token"); return; }
    try {
      const r = await axios.get(`${THIS_SITE.base_url}/api/admin/stats`, {
        headers: { "X-Admin-Token": token.trim() },
      });
      if (r.data) {
        localStorage.setItem(LS_TOKEN, token.trim());
        setAuthed(true);
        setError("");
      }
    } catch (e) {
      setError("Invalid token. Try again.");
    }
  };

  const logout = () => {
    localStorage.removeItem(LS_TOKEN);
    setAuthed(false);
    setToken("");
    setStats({});
    setBookings([]);
  };

  const refreshAll = async () => {
    setLoading(true);
    const nextStats = {};
    const nextBookings = [];
    const nextInventory = [];
    await Promise.all(
      allSites.map(async (site) => {
        try {
          const [s, b, inv] = await Promise.all([
            axios.get(`${site.base_url}/api/admin/stats`, { headers: { "X-Admin-Token": token } }),
            axios.get(`${site.base_url}/api/admin/bookings?limit=100`, { headers: { "X-Admin-Token": token } }),
            axios.get(`${site.base_url}/api/admin/inventory`, { headers: { "X-Admin-Token": token } }).catch(() => ({ data: { items: [] } })),
          ]);
          nextStats[site.id] = { ...s.data, site_label: site.label };
          (b.data.items || []).forEach((it) =>
            nextBookings.push({ ...it, site_label: site.label, site_id: site.id })
          );
          (inv.data?.items || []).forEach((it) =>
            nextInventory.push({ ...it, site_label: site.label, site_id: site.id })
          );
        } catch (e) {
          nextStats[site.id] = { error: "unreachable", site_label: site.label };
        }
      })
    );
    nextBookings.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
    nextInventory.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
    setStats(nextStats);
    setBookings(nextBookings);
    setInventory(nextInventory);
    setLoading(false);
  };

  useEffect(() => {
    if (authed) refreshAll();
  }, [authed, extraSites]);

  // Auto-authed if token was previously valid
  useEffect(() => {
    if (token && !authed) handleLogin();
  }, []);

  // Combined totals across all sites
  const combined = useMemo(() => {
    const out = {
      checkouts_started: 0,
      bookings_confirmed: 0,
      bookings_pending: 0,
      revenue: 0,
    };
    Object.values(stats).forEach((s) => {
      if (!s || s.error) return;
      out.checkouts_started += s.funnel?.checkouts_started || 0;
      out.bookings_confirmed += s.funnel?.bookings_confirmed || 0;
      out.bookings_pending += s.funnel?.bookings_pending || 0;
      out.revenue += s.revenue?.total_usd || 0;
    });
    out.conversion_rate = out.checkouts_started
      ? Math.round((out.bookings_confirmed / out.checkouts_started) * 1000) / 10
      : 0;
    return out;
  }, [stats]);

  // Login screen
  if (!authed) {
    return (
      <div data-testid="admin-login" className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--paw-bg)" }}>
        <div className="w-full max-w-md paw-card p-10" style={{ background: "var(--paw-bg-2)" }}>
          <div className="flex items-center gap-3 mb-6" style={{ color: "var(--paw-clay)" }}>
            <Lock size={18} strokeWidth={1.5} />
            <span className="overline">Admin Access</span>
          </div>
          <h1 className="font-display text-3xl mb-2" style={{ color: "var(--paw-ink)" }}>
            PawHaus Dashboard
          </h1>
          <p className="text-sm mb-8" style={{ color: "var(--paw-ink-2)" }}>
            Enter your admin token to view bookings, revenue, and funnel metrics.
          </p>
          <input
            data-testid="admin-token-input"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Admin token"
            className="w-full px-4 py-3 mb-4 text-sm"
            style={{ background: "var(--paw-bg)", border: "1px solid var(--paw-line)" }}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          {error && (
            <p data-testid="admin-login-error" className="text-xs mb-4" style={{ color: "var(--paw-clay)" }}>
              {error}
            </p>
          )}
          <button
            data-testid="admin-login-button"
            onClick={handleLogin}
            className="paw-btn-primary w-full"
            style={{ background: "var(--paw-clay)", borderColor: "var(--paw-clay)" }}
          >
            Unlock dashboard
          </button>
        </div>
      </div>
    );
  }

  // Dashboard
  return (
    <div data-testid="admin-dashboard" className="min-h-screen px-6 sm:px-10 py-10 mx-auto max-w-[1400px]">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-10">
        <div>
          <div className="overline mb-2" style={{ color: "var(--paw-clay)" }}>
            Launch Control Tower
          </div>
          <h1 className="font-display text-4xl" style={{ color: "var(--paw-ink)" }}>
            Combined dashboard
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--paw-muted)" }}>
            Showing {allSites.length} site{allSites.length === 1 ? "" : "s"} · auto-refresh manual
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            data-testid="admin-refresh"
            onClick={refreshAll}
            disabled={loading}
            className="paw-btn-secondary text-sm"
          >
            <RefreshCw size={14} strokeWidth={1.5} className={`inline mr-2 -mt-0.5 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button onClick={logout} className="paw-btn-secondary text-sm" data-testid="admin-logout">
            Logout
          </button>
        </div>
      </div>

      {/* COMBINED KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Kpi icon={<DollarSign size={16} />} label="Combined revenue" value={`$${combined.revenue.toLocaleString()}`} testid="kpi-revenue" />
        <Kpi icon={<Users size={16} />} label="Bookings paid" value={String(combined.bookings_confirmed)} testid="kpi-confirmed" />
        <Kpi icon={<TrendingUp size={16} />} label="Checkouts started" value={String(combined.checkouts_started)} testid="kpi-started" />
        <Kpi icon={<TrendingUp size={16} />} label="Conversion" value={`${combined.conversion_rate}%`} testid="kpi-conv" />
      </div>

      {/* PER-SITE BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
        {allSites.map((site) => {
          const s = stats[site.id];
          if (!s) return null;
          if (s.error) {
            return (
              <div key={site.id} className="paw-card p-6" style={{ background: "var(--paw-bg-2)" }}>
                <div className="overline mb-2" style={{ color: "var(--paw-clay)" }}>
                  {site.label} · unreachable
                </div>
                <p className="text-xs" style={{ color: "var(--paw-muted)" }}>
                  Couldn&apos;t reach {site.base_url}. Check token + URL.
                </p>
              </div>
            );
          }
          return (
            <div key={site.id} data-testid={`site-card-${site.id}`} className="paw-card p-6" style={{ background: "var(--paw-bg-2)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className="overline" style={{ color: "var(--paw-clay)" }}>
                  {site.label}
                </div>
                <div className="text-xs" style={{ color: "var(--paw-muted)" }}>
                  {s.site}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <Mini label="Revenue" value={`$${(s.revenue?.total_usd || 0).toLocaleString()}`} />
                <Mini label="Paid" value={String(s.funnel?.bookings_confirmed || 0)} />
                <Mini label="Conv." value={`${s.funnel?.conversion_rate || 0}%`} />
              </div>
              <div className="text-xs" style={{ color: "var(--paw-ink-2)" }}>
                <div className="mb-1">
                  <span style={{ color: "var(--paw-muted)" }}>Started:</span> {s.funnel?.checkouts_started || 0} · <span style={{ color: "var(--paw-muted)" }}>Pending:</span> {s.funnel?.bookings_pending || 0}
                </div>
                {s.by_room && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(s.by_room).map(([k, v]) => (
                      <span key={k} className="text-xs px-2 py-0.5" style={{ background: "var(--paw-bg)", color: "var(--paw-ink)" }}>
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* CONNECT ANOTHER SITE */}
      <div className="paw-card p-6 mb-10" style={{ background: "var(--paw-bg-2)" }}>
        <div className="overline mb-3" style={{ color: "var(--paw-clay)" }}>
          Connect another site
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--paw-muted)" }}>
          Add your Founders / VIP site here. Must have the SAME admin token configured.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            data-testid="admin-add-label"
            value={newSiteLabel}
            onChange={(e) => setNewSiteLabel(e.target.value)}
            placeholder="Site label (e.g. PawHaus Founders)"
            className="px-3 py-2 text-sm"
            style={{ background: "var(--paw-bg)", border: "1px solid var(--paw-line)" }}
          />
          <input
            data-testid="admin-add-url"
            value={newSiteUrl}
            onChange={(e) => setNewSiteUrl(e.target.value)}
            placeholder="https://founders-xyz.preview.emergentagent.com"
            className="px-3 py-2 text-sm md:col-span-1"
            style={{ background: "var(--paw-bg)", border: "1px solid var(--paw-line)" }}
          />
          <button
            data-testid="admin-add-site"
            onClick={() => {
              if (!newSiteUrl.trim() || !newSiteLabel.trim()) return;
              const next = [...extraSites, { id: `s${Date.now()}`, label: newSiteLabel.trim(), base_url: newSiteUrl.trim().replace(/\/$/, "") }];
              setExtraSites(next);
              saveSites(next);
              setNewSiteUrl("");
              setNewSiteLabel("");
            }}
            className="paw-btn-primary text-sm"
            style={{ background: "var(--paw-clay)", borderColor: "var(--paw-clay)" }}
          >
            Add site
          </button>
        </div>
        {extraSites.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2" data-testid="admin-extra-sites">
            {extraSites.map((s, i) => (
              <span key={s.id} className="text-xs px-3 py-1.5 flex items-center gap-2" style={{ background: "var(--paw-bg)", color: "var(--paw-ink-2)" }}>
                {s.label} · {s.base_url}
                <button
                  onClick={() => {
                    const next = extraSites.filter((_, idx) => idx !== i);
                    setExtraSites(next);
                    saveSites(next);
                  }}
                  style={{ color: "var(--paw-clay)" }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* INVENTORY — capacity-limited rooms by check-in date */}
      {inventory.length > 0 && (
        <div
          data-testid="admin-inventory-widget"
          className="paw-card overflow-hidden mb-7"
          style={{ background: "var(--paw-bg-2)" }}
        >
          <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--paw-line)" }}>
            <div className="flex items-center gap-2">
              <Flame size={14} strokeWidth={1.7} style={{ color: "var(--paw-clay)" }} />
              <div className="overline" style={{ color: "var(--paw-clay)" }}>
                Capped inventory · upcoming
              </div>
            </div>
            <span className="text-xs" style={{ color: "var(--paw-muted)" }}>
              {inventory.length} date{inventory.length === 1 ? "" : "s"} with bookings
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ color: "var(--paw-muted)" }}>
                  <Th>Date</Th>
                  <Th>Site</Th>
                  <Th>Cabin</Th>
                  <Th>Booked</Th>
                  <Th>Remaining</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((row) => (
                  <tr
                    key={`${row.site_id}-${row.room_id}-${row.date}`}
                    style={{ borderTop: "1px solid var(--paw-line)" }}
                    data-testid={`inventory-row-${row.room_id}-${row.date}`}
                  >
                    <Td><strong style={{ color: "var(--paw-ink)" }}>{row.date}</strong></Td>
                    <Td>{row.site_label}</Td>
                    <Td>{row.room_name}</Td>
                    <Td>
                      <span style={{ color: "var(--paw-ink)" }}>{row.booked}</span>
                      <span className="ml-1 text-xs" style={{ color: "var(--paw-muted)" }}>
                        / {row.cap}
                      </span>
                      {row.pending > 0 && (
                        <span className="ml-2 text-xs" style={{ color: "var(--paw-muted)" }}>
                          ({row.pending} pending)
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span style={{ color: row.remaining === 0 ? "var(--paw-clay)" : "var(--paw-forest)" }}>
                        {row.remaining}
                      </span>
                    </Td>
                    <Td>
                      <span
                        className="text-xs px-2 py-0.5"
                        style={{
                          background:
                            row.status === "sold_out" ? "var(--paw-clay)"
                            : row.status === "low" ? "var(--paw-bg)"
                            : "var(--paw-forest)",
                          color:
                            row.status === "low" ? "var(--paw-clay)" : "var(--paw-bg)",
                          border: row.status === "low" ? "1px solid var(--paw-clay)" : "none",
                        }}
                      >
                        {row.status === "sold_out" ? "Sold out" : row.status === "low" ? "Last 1" : "Open"}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-3 text-xs" style={{ color: "var(--paw-muted)", borderTop: "1px solid var(--paw-line)" }}>
            Tracks rooms with daily caps (e.g. Standard + Hot Tub — max 2 per night). Helps you size hot-tub inventory ahead of launch. Pending carts older than 30 min are excluded.
          </div>
        </div>
      )}

      {/* BOOKINGS TABLE */}
      <div className="paw-card overflow-hidden" data-testid="admin-bookings-list" style={{ background: "var(--paw-bg-2)" }}>
        <div className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: "1px solid var(--paw-line)" }}>
          <div className="overline" style={{ color: "var(--paw-clay)" }}>
            Recent bookings · all sites
          </div>
          <span className="text-xs" style={{ color: "var(--paw-muted)" }}>
            {bookings.length} record{bookings.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ color: "var(--paw-muted)" }}>
                <Th>Status</Th>
                <Th>Site</Th>
                <Th>Guest</Th>
                <Th>Cabin</Th>
                <Th>Stay</Th>
                <Th>Check-in</Th>
                <Th>Perks</Th>
                <Th>Total</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-10 text-xs" style={{ color: "var(--paw-muted)" }}>No bookings yet.</td></tr>
              ) : (
                bookings.map((b) => (
                  <tr key={`${b.site_id}-${b.id}`} style={{ borderTop: "1px solid var(--paw-line)" }} data-testid={`booking-row-${b.id}`}>
                    <Td>
                      <span className="text-xs px-2 py-0.5" style={{
                        background: b.status === "confirmed" ? "var(--paw-forest)" : "var(--paw-bg)",
                        color: b.status === "confirmed" ? "var(--paw-bg)" : "var(--paw-ink-2)",
                      }}>
                        {b.status}
                      </span>
                    </Td>
                    <Td>{b.site_label}</Td>
                    <Td>
                      <div style={{ color: "var(--paw-ink)" }}>{b.full_name || "—"}</div>
                      <div className="text-xs" style={{ color: "var(--paw-muted)" }}>{b.email}</div>
                    </Td>
                    <Td>{b.room_name}</Td>
                    <Td>{b.stay_label}</Td>
                    <Td>{b.check_in}</Td>
                    <Td>
                      {(b.perks && b.perks.length > 0) ? (
                        <div className="text-xs space-y-0.5" style={{ color: "var(--paw-ink-2)" }}>
                          {b.perks.map((p, i) => (
                            <div key={`${b.id}-perk-${i}`}>
                              <strong style={{ color: "var(--paw-ink)" }}>{p.name}</strong>: {p.spa_perk_label} + Bandana
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: "var(--paw-muted)" }}>—</span>
                      )}
                    </Td>
                    <Td><strong>${(b.total || 0).toLocaleString()}</strong></Td>
                    <Td className="text-xs" style={{ color: "var(--paw-muted)" }}>{(b.created_at || "").slice(0, 16).replace("T", " ")}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, testid }) {
  return (
    <div className="paw-card p-5" style={{ background: "var(--paw-bg-2)" }} data-testid={testid}>
      <div className="flex items-center gap-2 mb-2" style={{ color: "var(--paw-muted)" }}>
        {icon}
        <span className="overline">{label}</span>
      </div>
      <div className="font-display text-3xl" style={{ color: "var(--paw-ink)" }}>
        {value}
      </div>
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div>
      <div className="text-xs mb-1" style={{ color: "var(--paw-muted)" }}>{label}</div>
      <div className="font-display text-lg" style={{ color: "var(--paw-ink)" }}>{value}</div>
    </div>
  );
}

function Th({ children }) {
  return <th className="text-xs uppercase tracking-wider px-4 py-3 font-normal">{children}</th>;
}

function Td({ children, ...rest }) {
  return <td className="px-4 py-3 align-top" {...rest}>{children}</td>;
}
