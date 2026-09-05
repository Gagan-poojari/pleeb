"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { X, Mail, Lock, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { useToast } from "./Toast";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function AuthModal({ open, onClose, defaultTab = "login" }: Props) {
  const { refresh } = useAuth();
  const { success } = useToast();
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => setTab(defaultTab), [defaultTab]);
  useEffect(() => {
    if (!open) {
      setEmail("");
      setPassword("");
      setError("");
      setLoading(false);
      setShowPassword(false);
    }
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
      if (!res.ok) {
        setError(data.detail ?? "Authentication failed. Check your email/password.");
        return;
      }
      await refresh();
      success(tab === "login" ? "Welcome back!" : "Account created!", "You are logged in.");
      onClose();
    } catch {
      setError("Could not reach backend API server. Is it running on port 8000?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={(e) => e.target === backdropRef.current && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        padding: 16,
      }}
    >
      <div
        className="pop-in"
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#0d101a",
          border: "2px solid #ffffff",
          borderRadius: "var(--radius-md)",
          padding: "32px 28px",
          position: "relative",
          boxShadow: "8px 8px 0px #000, 0 0 40px rgba(0, 0, 0, 0.9)",
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "#000",
            border: "1.5px solid rgba(255, 255, 255, 0.4)",
            color: "#fff",
            cursor: "pointer",
            padding: 4,
            borderRadius: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <span style={{ fontSize: "2rem" }}>🔑</span>
          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: "#fff",
              marginTop: 6,
            }}
          >
            {tab === "login" ? "WELCOME BACK TO PLEEB" : "JOIN THE MEME SQUAD"}
          </h2>
          <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.6)", marginTop: 4 }}>
            {tab === "login"
              ? "Sign in to download videos & unlock heavy Whisper models."
              : "Free account. Takes 10 seconds. No spam ever."}
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            background: "#000000",
            border: "2px solid rgba(255, 255, 255, 0.2)",
            borderRadius: 6,
            padding: 3,
            marginBottom: 20,
          }}
        >
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setError("");
              }}
              style={{
                padding: "8px 0",
                border: "none",
                cursor: "pointer",
                borderRadius: 4,
                fontWeight: 800,
                fontSize: "0.86rem",
                fontFamily: "var(--font-display)",
                background: tab === t ? "var(--lime)" : "transparent",
                color: tab === t ? "#000000" : "rgba(255, 255, 255, 0.6)",
                boxShadow: tab === t ? "2px 2px 0px #fff" : "none",
                transition: "all 0.1s ease",
              }}
            >
              {t === "login" ? "SIGN IN" : "REGISTER"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.7)",
                marginBottom: 6,
                fontFamily: "var(--font-mono)",
              }}
            >
              EMAIL
            </label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255, 255, 255, 0.4)", display: "flex" }}>
                <Mail size={16} />
              </div>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                style={{ paddingLeft: 42 }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "rgba(255, 255, 255, 0.7)",
                marginBottom: 6,
                fontFamily: "var(--font-mono)",
              }}
            >
              PASSWORD
            </label>
            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "rgba(255, 255, 255, 0.4)", display: "flex" }}>
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === "register" ? "At least 8 chars" : "••••••••"}
                style={{ paddingLeft: 42, paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.4)",
                  cursor: "pointer",
                  display: "flex",
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 12px",
                borderRadius: 4,
                background: "rgba(255, 51, 68, 0.15)",
                border: "1.5px solid var(--red)",
                color: "var(--red)",
                fontSize: "0.84rem",
                fontWeight: 700,
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", marginTop: 6, height: 46 }}
          >
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Loader2 className="spinner" size={16} />
                <span>CONNECTING...</span>
              </div>
            ) : tab === "login" ? (
              "SIGN IN TO ACCOUNT"
            ) : (
              "CREATE MY ACCOUNT"
            )}
          </button>
        </form>

        <p style={{ marginTop: 18, textAlign: "center", fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.5)" }}>
          {tab === "login" ? "No account? " : "Already signed up? "}
          <button
            onClick={() => {
              setTab(tab === "login" ? "register" : "login");
              setError("");
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--lime)",
              cursor: "pointer",
              fontWeight: 800,
              textDecoration: "underline",
              fontFamily: "inherit",
              padding: 0,
            }}
          >
            {tab === "login" ? "Register free" : "Sign in here"}
          </button>
        </p>
      </div>
    </div>
  );
}