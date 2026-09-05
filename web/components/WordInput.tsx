"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Tag, X, Plus, Trash2, Crosshair } from "lucide-react";

interface Props {
  words: string[];
  onChange: (words: string[]) => void;
}

const HIT_LIST_PRESETS = [
  "spoilers",
  "my boss",
  "confidential",
  "ex-girlfriend",
  "f-bomb",
  "cringe",
  "secret",
];

export default function WordInput({ words, onChange }: Props) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addWord = (raw: string) => {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed && !words.includes(trimmed)) {
      onChange([...words, trimmed]);
    }
    setInput("");
  };

  const removeWord = (w: string) => onChange(words.filter((x) => x !== w));

  const clearAll = () => onChange([]);

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addWord(input);
    } else if (e.key === "Backspace" && input === "" && words.length > 0) {
      removeWord(words[words.length - 1]);
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const incoming = pasted
      .split(/[,\s]+/)
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);
    const combined = Array.from(new Set([...words, ...incoming]));
    onChange(combined);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Tag Box */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: "12px 16px",
          borderRadius: "var(--radius-sm)",
          cursor: "text",
          minHeight: 56,
          alignItems: "center",
          border: "2px solid rgba(255, 255, 255, 0.2)",
          background: "rgba(8, 10, 16, 0.9)",
          boxShadow: "inset 0 2px 4px rgba(0,0,0,0.7)",
        }}
      >
        <Crosshair size={18} color="var(--lime)" style={{ flexShrink: 0 }} />

        {words.map((w) => (
          <span className="meme-tag" key={w}>
            <span>{w}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeWord(w);
              }}
              aria-label={`Remove ${w}`}
            >
              ✕
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onBlur={() => input.trim() && addWord(input)}
          placeholder={words.length === 0 ? "Type a word to bleep and press Enter or comma…" : "Add more targets…"}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            boxShadow: "none",
            color: "#ffffff",
            fontFamily: "var(--font-comic)",
            fontSize: "0.95rem",
            fontWeight: 700,
            flex: 1,
            minWidth: 180,
            padding: "4px 0",
          }}
        />

        {words.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              clearAll();
            }}
            style={{
              background: "rgba(255, 51, 68, 0.2)",
              border: "1px solid var(--red)",
              color: "var(--red)",
              cursor: "pointer",
              fontSize: "0.74rem",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              borderRadius: 4,
              marginLeft: "auto",
            }}
          >
            <Trash2 size={12} />
            <span>NUKE ALL</span>
          </button>
        )}
      </div>

      {/* Preset Chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "rgba(255, 255, 255, 0.5)" }}>
          Quick targets:
        </span>
        {HIT_LIST_PRESETS.map((preset) => {
          const isAdded = words.includes(preset);
          return (
            <button
              key={preset}
              type="button"
              onClick={() => (isAdded ? removeWord(preset) : addWord(preset))}
              style={{
                background: isAdded ? "var(--lime)" : "rgba(255, 255, 255, 0.08)",
                border: "1.5px solid",
                borderColor: isAdded ? "#000" : "rgba(255, 255, 255, 0.2)",
                borderRadius: 99,
                padding: "3px 10px",
                fontSize: "0.76rem",
                fontWeight: 700,
                color: isAdded ? "#000" : "#fff",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                boxShadow: isAdded ? "2px 2px 0px #fff" : "none",
                transition: "all 0.1s ease",
              }}
            >
              {isAdded ? <X size={11} /> : <Plus size={11} />}
              <span>{preset}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
