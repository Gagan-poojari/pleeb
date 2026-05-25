"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function AuthModal({ open, onClose, defaultTab = "login" }: Props) {
  const { refresh } = useAuth();
  const [tab, setTab]         = useState<"login" | "register">(defaultTab);
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => setTab(defaultTab), [defaultTab]);
  useEffect(() => {
    if (!open) { setEmail(""); setPassword(""); setError(""); setLoading(false); }
  }, [open]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const endpoint = tab === "login" ? "login" : "register";
    try {
      const res = await fetch(`${API}/api/auth/${endpoint}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.detail ?? "Something went wrong"); return; }
      await refresh();
      onClose();
    } catch {
      setError("Could not reach the server. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={e => e.target === backdropRef.current && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.80)",
        backdropFilter: "blur(4px)",
        padding: 16,
        animation: "fadeIn 0.15s ease",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 400,
        background: "#000000",
        border: "2px solid rgba(255,255,255,0.25)",
        borderRadius: 16,
        padding: "36px 32px 32px",
        position: "relative",
        animation: "slideUp 0.2s ease",
        boxShadow: "0 32px 80px rgba(0,0,0,0.9)",
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 14, right: 14,
            background: "none", border: "none",
            color: "rgba(255,255,255,0.45)", fontSize: "1.4rem",
            cursor: "pointer", lineHeight: 1, padding: 4,
            borderRadius: 4,
            fontFamily: "'Comic Neue', cursive",
          }}
        >x</button>

        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <h2 style={{
            fontSize: "1.3rem", fontWeight: 700, color: "#fff", marginBottom: 6,
            fontFamily: "'Comic Neue', cursive",
          }}>
            {tab === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)" }}>
            {tab === "login" ? "Sign in to unlock PRO models and downloads." : "Free account. Takes 10 seconds."}
          </p>
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          border: "2px solid rgba(255,255,255,0.18)",
          borderRadius: 8, overflow: "hidden", marginBottom: 24,
        }}>
          {(["login", "register"] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              style={{
                padding: "9px 0",
                border: "none",
                cursor: "pointer",
                fontFamily: "'Comic Neue', cursive",
                fontWeight: 700,
                fontSize: "0.85rem",
                transition: "all 0.18s",
                background: tab === t ? "#ffffff" : "transparent",
                color: tab === t ? "#000000" : "rgba(255,255,255,0.5)",
                borderRight: t === "login" ? "2px solid rgba(255,255,255,0.18)" : "none",
              }}
            >
              {t === "login" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{
              display: "block", fontSize: "0.78rem", fontWeight: 700,
              color: "rgba(255,255,255,0.55)", marginBottom: 6,
              fontFamily: "'Comic Neue', cursive", letterSpacing: "0.03em",
            }}>Email</label>
            <input
              type="email" required autoComplete="email"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label style={{
              display: "block", fontSize: "0.78rem", fontWeight: 700,
              color: "rgba(255,255,255,0.55)", marginBottom: 6,
              fontFamily: "'Comic Neue', cursive", letterSpacing: "0.03em",
            }}>Password</label>
            <input
              type="password" required
              autoComplete={tab === "login" ? "current-password" : "new-password"}
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder={tab === "register" ? "Min. 8 characters" : "••••••••"}
            />
          </div>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 7,
              background: "rgba(255,60,60,0.08)",
              border: "1.5px solid rgba(255,60,60,0.35)",
              color: "#ff8080", fontSize: "0.82rem",
              fontFamily: "'Comic Neue', cursive",
            }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ marginTop: 6 }}>
            {loading ? "Please wait..." : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p style={{
          marginTop: 20, textAlign: "center",
          fontSize: "0.8rem", color: "rgba(255,255,255,0.4)",
          fontFamily: "'Comic Neue', cursive",
        }}>
          {tab === "login" ? "No account? " : "Already have one? "}
          <button
            onClick={() => { setTab(tab === "login" ? "register" : "login"); setError(""); }}
            style={{
              background: "none", border: "none", color: "#ffffff",
              cursor: "pointer", fontWeight: 700, fontSize: "inherit",
              fontFamily: "'Comic Neue', cursive", padding: 0, textDecoration: "underline",
            }}
          >
            {tab === "login" ? "Register free" : "Sign in"}
          </button>
        </p>
      </div>

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(14px); opacity: 0 } to { transform: none; opacity: 1 } }
      `}</style>
    </div>
  );
}