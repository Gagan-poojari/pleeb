"use client";

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import AuthModal from "./AuthModal";
import type { WhisperModel } from "@/lib/api";
import { Lock, Zap, Check } from "lucide-react";

interface ModelInfo {
  id: WhisperModel;
  label: string;
  vibe: string;
  speedRating: number;
  accRating: number;
  badge: string;
  pro: boolean;
}

const MODELS: ModelInfo[] = [
  {
    id: "tiny",
    label: "Tiny",
    vibe: "Instant & Free Tier Safe",
    speedRating: 5,
    accRating: 2,
    badge: "RECOMMENDED",
    pro: false,
  },
  {
    id: "base",
    label: "Base",
    vibe: "Higher accuracy (needs 1GB+)",
    speedRating: 4,
    accRating: 3,
    badge: "ACCURATE",
    pro: false,
  },
  {
    id: "small",
    label: "Small",
    vibe: "Catches mumbling",
    speedRating: 3,
    accRating: 4,
    badge: "PRO",
    pro: true,
  },
  {
    id: "medium",
    label: "Medium",
    vibe: "Thick accents",
    speedRating: 2,
    accRating: 5,
    badge: "PRO",
    pro: true,
  },
  {
    id: "large",
    label: "Large",
    vibe: "Gigachad mode",
    speedRating: 1,
    accRating: 5,
    badge: "PRO",
    pro: true,
  },
];

interface Props {
  value: WhisperModel;
  onChange: (m: WhisperModel) => void;
}

export default function ModelSelector({ value, onChange }: Props) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const isSignedIn = !!user;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10,
        }}
      >
        {MODELS.map((m) => {
          const locked = m.pro && !isSignedIn;
          const isSelected = value === m.id && !locked;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                if (locked) {
                  setModalOpen(true);
                } else {
                  onChange(m.id);
                }
              }}
              style={{
                padding: "14px 12px",
                borderRadius: "var(--radius-sm)",
                border: `2px solid ${
                  isSelected
                    ? "var(--lime)"
                    : locked
                    ? "rgba(255, 255, 255, 0.12)"
                    : "rgba(255, 255, 255, 0.22)"
                }`,
                background: isSelected
                  ? "rgba(204, 255, 0, 0.12)"
                  : locked
                  ? "rgba(8, 10, 16, 0.5)"
                  : "rgba(14, 18, 28, 0.8)",
                boxShadow: isSelected
                  ? "3px 3px 0px var(--lime), 0 0 15px rgba(204, 255, 0, 0.3)"
                  : "2px 2px 0px #000",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 115,
                transition: "all 0.12s ease",
                transform: isSelected ? "translate(-1px, -1px)" : "none",
                opacity: locked ? 0.7 : 1,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span
                    style={{
                      fontWeight: 800,
                      fontSize: "0.95rem",
                      fontFamily: "var(--font-display)",
                      color: "#fff",
                    }}
                  >
                    {m.label}
                  </span>

                  {locked ? (
                    <span
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 800,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "rgba(255, 208, 0, 0.2)",
                        border: "1px solid var(--yellow)",
                        color: "var(--yellow)",
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <Lock size={10} /> PRO
                    </span>
                  ) : isSelected ? (
                    <span
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "var(--lime)",
                        color: "#000",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                      }}
                    >
                      <Check size={12} strokeWidth={4} />
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        color: "rgba(255, 255, 255, 0.4)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {m.badge}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: "0.74rem",
                    color: isSelected ? "var(--lime)" : "rgba(255, 255, 255, 0.6)",
                    marginBottom: 8,
                    fontWeight: 700,
                  }}
                >
                  {m.vibe}
                </div>

                {/* Rating bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.68rem" }}>
                    <span style={{ color: "rgba(255, 255, 255, 0.5)", fontFamily: "var(--font-mono)" }}>ACCURACY</span>
                  </div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2,
                          background: i <= m.accRating ? "var(--lime)" : "rgba(255, 255, 255, 0.12)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {locked && (
                <div
                  style={{
                    fontSize: "0.66rem",
                    fontWeight: 800,
                    color: "var(--yellow)",
                    marginTop: 6,
                    fontFamily: "var(--font-display)",
                  }}
                >
                  Sign in to unlock →
                </div>
              )}
            </button>
          );
        })}
      </div>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab="login" />
    </>
  );
}