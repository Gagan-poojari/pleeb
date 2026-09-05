"use client";

import type { ProcessMode } from "@/lib/api";
import { VolumeX, Music, Sliders, FileText, Check } from "lucide-react";

interface ModeOption {
  id: ProcessMode;
  icon: React.ElementType;
  title: string;
  desc: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  borderAccent: string;
}

const MODES: ModeOption[] = [
  {
    id: "auto_bleep",
    icon: VolumeX,
    title: "Daytime TV Bleep",
    desc: "1000Hz classic censor tone. Sounds like Gordon Ramsay losing his mind on Fox.",
    badge: "FCC COMPLIANT",
    badgeBg: "rgba(0, 240, 255, 0.15)",
    badgeColor: "#00f0ff",
    borderAccent: "#00f0ff",
  },
  {
    id: "meme",
    icon: Music,
    title: "Full Brainrot Remix",
    desc: "Replaces swears with Bruh, Metal Pipe drops, Minecraft Oofs & Windows Errors.",
    badge: "🔥 COMMUNITY FAVORITE",
    badgeBg: "rgba(255, 42, 133, 0.2)",
    badgeColor: "#ff2a85",
    borderAccent: "#ff2a85",
  },
  {
    id: "custom_bleep",
    icon: Sliders,
    title: "The Hit List",
    desc: "Target custom words: your ex's name, company secrets, movie spoilers, or inside jokes.",
    badge: "SNIPER MODE",
    badgeBg: "rgba(204, 255, 0, 0.15)",
    badgeColor: "#ccff00",
    borderAccent: "#ccff00",
  },
  {
    id: "transcribe_only",
    icon: FileText,
    title: "Just The Words",
    desc: "No bleeps, no video chops. Pure Whisper AI speech-to-text with millisecond timestamps.",
    badge: "RAW TEXT",
    badgeBg: "rgba(255, 208, 0, 0.15)",
    badgeColor: "#ffd000",
    borderAccent: "#ffd000",
  },
];

interface Props {
  value: ProcessMode;
  onChange: (m: ProcessMode) => void;
}

export default function ModeSelector({ value, onChange }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {MODES.map((m) => {
        const isSelected = value === m.id;
        const IconComponent = m.icon;

        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            style={{
              padding: "16px 18px",
              borderRadius: "var(--radius-sm)",
              border: `2px solid ${isSelected ? m.borderAccent : "rgba(255, 255, 255, 0.18)"}`,
              background: isSelected ? "rgba(25, 30, 48, 0.95)" : "rgba(12, 14, 22, 0.75)",
              boxShadow: isSelected
                ? `4px 4px 0px ${m.borderAccent}, 0 0 20px ${m.borderAccent}33`
                : "3px 3px 0px #000",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              minHeight: 140,
              transition: "all 0.15s ease",
              transform: isSelected ? "translate(-2px, -2px)" : "none",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 8,
                    background: isSelected ? m.borderAccent : "rgba(255, 255, 255, 0.08)",
                    color: isSelected ? "#000" : "#fff",
                    border: "1.5px solid #000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconComponent size={20} />
                </div>

                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-display)",
                    padding: "3px 8px",
                    borderRadius: 4,
                    background: m.badgeBg,
                    border: `1px solid ${m.badgeColor}`,
                    color: m.badgeColor,
                    letterSpacing: "0.02em",
                  }}
                >
                  {m.badge}
                </span>
              </div>

              <div
                style={{
                  fontWeight: 800,
                  fontSize: "1.02rem",
                  color: isSelected ? "#ffffff" : "rgba(255, 255, 255, 0.9)",
                  fontFamily: "var(--font-display)",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>{m.title}</span>
                {isSelected && <Check size={18} color={m.borderAccent} strokeWidth={3} />}
              </div>

              <p
                style={{
                  fontSize: "0.82rem",
                  color: isSelected ? "rgba(255, 255, 255, 0.85)" : "rgba(255, 255, 255, 0.55)",
                  lineHeight: 1.4,
                  fontFamily: "var(--font-comic)",
                }}
              >
                {m.desc}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
