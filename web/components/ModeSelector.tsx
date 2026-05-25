"use client";

import type { ProcessMode } from "@/lib/api";

interface Mode {
  id: ProcessMode;
  icon: string;
  label: string;
  desc: string;
}

const MODES: Mode[] = [
  {
    id: "auto_bleep",
    icon: "🔇",
    label: "Auto Bleep",
    desc: "Auto-detect & bleep all swear words",
  },
  {
    id: "meme",
    icon: "🎵",
    label: "Meme the Mess",
    desc: "Replace swears with random meme sounds",
  },
  {
    id: "custom_bleep",
    icon: "✏️",
    label: "Custom Words",
    desc: "Bleep only the words you choose",
  },
  {
    id: "transcribe_only",
    icon: "📝",
    label: "Transcribe Only",
    desc: "Get a text transcript of your video",
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
        gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
        gap: 12,
      }}
    >
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`select-card${value === m.id ? " selected" : ""}`}
          onClick={() => onChange(m.id)}
        >
          <div style={{ fontSize: "1.5rem", marginBottom: 8 }}>{m.icon}</div>
          <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 4 }}>
            {m.label}
          </div>
          <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
            {m.desc}
          </div>
        </button>
      ))}
    </div>
  );
}
