"use client";

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import AuthModal from "./AuthModal";
import type { WhisperModel } from "@/lib/api";

interface ModelInfo {
  id: WhisperModel;
  label: string;
  speed: string;
  accuracy: string;
  pro: boolean;
}

const MODELS: ModelInfo[] = [
  { id: "tiny",   label: "Tiny",   speed: "Fastest",  accuracy: "Good",      pro: false },
  { id: "base",   label: "Base",   speed: "Fast",     accuracy: "Better",    pro: false },
  { id: "small",  label: "Small",  speed: "Moderate", accuracy: "Great",     pro: true  },
  { id: "medium", label: "Medium", speed: "Slow",     accuracy: "Excellent", pro: true  },
  { id: "large",  label: "Large",  speed: "Slowest",  accuracy: "Best",      pro: true  },
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
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {MODELS.map((m) => {
          const locked = m.pro && !isSignedIn;
          const selected = value === m.id;

          return (
            <div key={m.id} style={{ position: "relative" }}>
              {locked ? (
                <button
                  className="select-card"
                  style={{ minWidth: 110, opacity: 0.6, cursor: "pointer" }}
                  title="Sign in to unlock higher accuracy models"
                  onClick={() => setModalOpen(true)}
                >
                  <ModelCardContent m={m} locked />
                </button>
              ) : (
                <button
                  className={`select-card${selected ? " selected" : ""}`}
                  style={{ minWidth: 110 }}
                  onClick={() => onChange(m.id)}
                >
                  <ModelCardContent m={m} locked={false} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <AuthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab="login"
      />
    </>
  );
}

function ModelCardContent({ m, locked }: { m: ModelInfo; locked: boolean }) {
  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "0.88rem" }}>{m.label}</span>
        {locked ? (
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 99,
              background: "rgba(255,200,50,0.15)",
              border: "1px solid rgba(255,200,50,0.3)",
              color: "hsl(45,90%,65%)",
              letterSpacing: "0.05em",
            }}
          >
            PRO
          </span>
        ) : (
          m.pro && (
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 99,
                background: "rgba(199,125,255,0.15)",
                border: "1px solid rgba(199,125,255,0.3)",
                color: "hsl(265,80%,78%)",
                letterSpacing: "0.05em",
              }}
            >
              PRO
            </span>
          )
        )}
      </div>
      <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}>
        {m.accuracy}
      </div>
      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
        {m.speed}
      </div>
      {locked && (
        <div
          style={{
            fontSize: "0.68rem",
            color: "hsl(45,80%,65%)",
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          Sign in to unlock
        </div>
      )}
    </>
  );
}