"use client";

import { useState, useRef } from "react";
import { Volume2, Play, Radio, Flame } from "lucide-react";

interface SoundItem {
  id: string;
  name: string;
  slogan: string;
  emoji: string;
  file: string;
  color: string;
}

const MEME_SOUNDS: SoundItem[] = [
  { id: "bruh", name: "Bruh", slogan: "Peak disappointment", emoji: "🗿", file: "/sounds/bruh.wav", color: "#ccff00" },
  { id: "boom", name: "Metal Boom", slogan: "Ear destroying 808", emoji: "💣", file: "/sounds/metal_boom.wav", color: "#ff2a85" },
  { id: "oof", name: "Minecraft Oof", slogan: "Nostalgic pain", emoji: "💥", file: "/sounds/minecraft_oof.wav", color: "#00f0ff" },
  { id: "windows", name: "Windows Error", slogan: "System crash", emoji: "💻", file: "/sounds/windows_error.wav", color: "#ffd000" },
  { id: "yeet", name: "Yeet", slogan: "Pure propulsion", emoji: "🚀", file: "/sounds/yeet.wav", color: "#a855f7" },
  { id: "sheep", name: "Screaming Sheep", slogan: "Vocal cord damage", emoji: "🐑", file: "/sounds/screaming_sheep.wav", color: "#ff3344" },
  { id: "huh", name: "Huh Cat", slogan: "Zero braincells", emoji: "🐱", file: "/sounds/huh.wav", color: "#10b981" },
  { id: "nope", name: "Nope", slogan: "Absolutely not", emoji: "🚫", file: "/sounds/nope.wav", color: "#f97316" },
  { id: "bleep", name: "Classic Bleep", slogan: "PG-13 daytime TV", emoji: "📢", file: "/sounds/bleep.wav", color: "#ffffff" },
];

export default function SoundboardPreview() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastPlayed, setLastPlayed] = useState<string>("Click any pad to test");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = (s: SoundItem) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      const audio = new Audio(s.file);
      audioRef.current = audio;
      setActiveId(s.id);
      setLastPlayed(`Playing: "${s.name}" — ${s.slogan}`);

      audio.play().catch(() => {});
      audio.onended = () => setActiveId(null);
    } catch {
      setActiveId(null);
    }
  };

  return (
    <div
      className="meme-card"
      style={{
        padding: "22px 24px",
        border: "2px solid rgba(255, 255, 255, 0.25)",
        background: "rgba(10, 12, 18, 0.92)",
        position: "relative",
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
          borderBottom: "2px dashed rgba(255, 255, 255, 0.12)",
          paddingBottom: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              padding: "4px 8px",
              background: "var(--pink)",
              color: "#fff",
              fontWeight: 800,
              fontSize: "0.75rem",
              fontFamily: "var(--font-display)",
              borderRadius: 4,
              border: "1.5px solid #000",
              boxShadow: "2px 2px 0px #fff",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Radio size={12} />
            <span>SOUNDBOARD</span>
          </div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#fff" }}>
            The Meme Arsenal
          </h3>
        </div>

        {/* Live Audio Monitor Pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 12px",
            borderRadius: 99,
            background: "rgba(0, 0, 0, 0.6)",
            border: "1.5px solid rgba(255, 255, 255, 0.2)",
            fontSize: "0.8rem",
            color: activeId ? "var(--lime)" : "rgba(255, 255, 255, 0.6)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {activeId ? (
            <div className="eq-bars">
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
            </div>
          ) : (
            <Volume2 size={14} />
          )}
          <span style={{ fontSize: "0.76rem" }}>{lastPlayed}</span>
        </div>
      </div>

      {/* Grid of MPC Meme Pads */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
          gap: 10,
        }}
      >
        {MEME_SOUNDS.map((s) => {
          const isPlaying = activeId === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => play(s)}
              className={`sound-pad${isPlaying ? " active" : ""}`}
              style={{
                borderColor: isPlaying ? s.color : "rgba(255, 255, 255, 0.18)",
                background: isPlaying ? "rgba(255, 42, 133, 0.3)" : "rgba(18, 22, 34, 0.7)",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "10px 12px",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                <span style={{ fontSize: "1.25rem" }}>{s.emoji}</span>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: isPlaying ? s.color : "rgba(255, 255, 255, 0.2)",
                    boxShadow: isPlaying ? `0 0 8px ${s.color}` : "none",
                  }}
                />
              </div>

              <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#ffffff", marginTop: 2 }}>
                {s.name}
              </div>
              <div style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.55)", lineHeight: 1.2 }}>
                {s.slogan}
              </div>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 14,
          textAlign: "right",
          fontSize: "0.74rem",
          color: "rgba(255, 255, 255, 0.45)",
          fontFamily: "var(--font-comic)",
        }}
      >
        👆 In "Meme the Mess" mode, Pleeb randomly picks from these every time you swear.
      </div>
    </div>
  );
}
