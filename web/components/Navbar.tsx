"use client";

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import AuthModal from "./AuthModal";
import { User, LogOut, Radio, User2 } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 clamp(16px, 4vw, 32px)",
          height: 66,
          background: "rgba(6, 7, 12, 0.88)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "2px solid rgba(255, 255, 255, 0.15)",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.9)",
        }}
      >
        {/* Brand Logo & Meme Tag */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              position: "relative",
              width: 40,
              height: 40,
              borderRadius: "50%",
              padding: 2,
              background: "var(--lime)",
              border: "2px solid #000",
              boxShadow: "2px 2px 0px #fff, 0 0 15px rgba(204, 255, 0, 0.4)",
            }}
          >
            <img
              src="/logo_as_of_now.jpg"
              alt="Pleeb"
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              style={{
                fontWeight: 800,
                fontSize: "1.35rem",
                fontFamily: "var(--font-display)",
                letterSpacing: "-0.03em",
                color: "#ffffff",
              }}
            >
              Pleeb
            </span>

            <span
              style={{
                fontSize: "0.68rem",
                fontWeight: 800,
                fontFamily: "var(--font-display)",
                color: "#000000",
                background: "var(--lime)",
                border: "1.5px solid #000",
                padding: "1px 6px",
                borderRadius: 4,
                boxShadow: "1px 1px 0px #fff",
                letterSpacing: "0.04em",
              }}
            >
              MEME THE MESS
            </span>
          </div>
        </div>

        {/* Right Nav */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <a
            href="https://github.com/Gagan-poojari/pleeb"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm"
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            <span style={{ fontSize: "0.84rem", fontWeight: 700, fontFamily: "var(--font-display)" }}>GITHUB</span>
          </a>

          {user ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: "rgba(0, 0, 0, 0.6)",
                border: "1.5px solid rgba(255, 255, 255, 0.25)",
                borderRadius: 6,
                padding: "4px 8px 4px 12px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <User size={14} color="var(--lime)" />
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "#fff",
                    fontFamily: "var(--font-mono)",
                    maxWidth: 130,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {user.email}
                </span>
              </div>

              {user.is_pro && (
                <span
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-display)",
                    padding: "2px 6px",
                    borderRadius: 3,
                    background: "var(--yellow)",
                    color: "#000",
                    border: "1px solid #000",
                  }}
                >
                  PRO
                </span>
              )}

              <button
                onClick={logout}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.6)",
                  cursor: "pointer",
                  padding: 4,
                  display: "flex",
                }}
                title="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              className="btn btn-primary btn-sm"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <User2 size={18} />
              <span>SIGN IN</span>
            </button>
          )}
        </div>
      </nav>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}