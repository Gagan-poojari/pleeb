"use client";

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import AuthModal from "./AuthModal";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <nav style={{
        position: "fixed",
        top: 0, left: 0, right: 0,
        zIndex: 999,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 60,
        background: "#000000",
        borderBottom: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 2px 20px rgba(0,0,0,0.8)",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* <div style={{
            width: 36, height: 36,
            borderRadius: "50%",
            border: "2px solid #ffffff",
            background: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.1rem",
            flexShrink: 0,
          }}>
            🎵
          </div> */}
          <img src="/logo_as_of_now.jpg" style={{
            width: 36, height: 36,
            borderRadius: "50%", border: "2px solid #ffffff", background: "#000",
            flexShrink: 0, objectFit: "cover", objectPosition: "center", aspectRatio: "1/1"
          }} alt="Pleeb"
          />
          <span style={{
            fontFamily: "'Comic Neue', cursive",
            fontWeight: 700,
            fontSize: "1rem",
            color: "#fff",
            letterSpacing: "0.01em",
          }}>
            Pleeb
          </span>
        </div>

        {/* Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <NavLink href="https://github.com" label="GitHub" />

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.5)",
                fontFamily: "'Comic Neue', cursive",
              }}>
                {user.email}
              </span>
              {user.is_pro && (
                <span style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 99,
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff",
                  letterSpacing: "0.06em",
                }}>
                  PRO
                </span>
              )}
              <button
                onClick={logout}
                style={{
                  background: "transparent",
                  border: "2px solid rgba(255,255,255,0.35)",
                  borderRadius: 6,
                  color: "rgba(255,255,255,0.65)",
                  fontFamily: "'Comic Neue', cursive",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  padding: "4px 12px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "#fff";
                  (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.35)";
                  (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.65)";
                }}
              >
                Log out
              </button>
            </div>
          ) : (
            <button
              onClick={() => setModalOpen(true)}
              style={{
                background: "#ffffff",
                color: "#000000",
                border: "2px solid #ffffff",
                borderRadius: 7,
                fontFamily: "'Comic Neue', cursive",
                fontWeight: 700,
                fontSize: "0.85rem",
                padding: "6px 16px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "#000";
                (e.currentTarget as HTMLButtonElement).style.color = "#fff";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = "#fff";
                (e.currentTarget as HTMLButtonElement).style.color = "#000";
              }}
            >
              Sign in
            </button>
          )}
        </div>
      </nav>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        position: "relative",
        color: "#ffffff",
        textDecoration: "none",
        fontFamily: "'Comic Neue', cursive",
        fontWeight: 700,
        fontSize: "0.88rem",
        paddingBottom: 2,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget.querySelector(".underline") as HTMLElement;
        if (el) el.style.width = "100%";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget.querySelector(".underline") as HTMLElement;
        if (el) el.style.width = "0%";
      }}
    >
      {label}
      <span className="underline" style={{
        display: "block",
        position: "absolute",
        bottom: -1,
        left: 0,
        width: "0%",
        height: "2px",
        background: "#ffffff",
        transition: "width 0.25s ease",
      }} />
    </a>
  );
}