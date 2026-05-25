"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface Props {
  words: string[];
  onChange: (words: string[]) => void;
}

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
    pasted.split(/[,\s]+/).forEach((w) => addWord(w));
  };

  return (
    <div>
      {/* Tag container */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          padding: "12px 16px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          cursor: "text",
          minHeight: 52,
          alignItems: "center",
          transition: "border-color 0.2s, box-shadow 0.2s",
        }}
        onFocus={() => {}}
      >
        {words.map((w) => (
          <span className="tag" key={w}>
            {w}
            <button onClick={() => removeWord(w)} aria-label={`Remove ${w}`}>
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
          placeholder={words.length === 0 ? "Type a word and press Enter or comma…" : ""}
          style={{
            background: "none",
            border: "none",
            outline: "none",
            color: "var(--text-primary)",
            fontFamily: "inherit",
            fontSize: "0.9rem",
            flex: 1,
            minWidth: 140,
            padding: 0,
          }}
        />
      </div>
      <p
        style={{
          fontSize: "0.78rem",
          color: "var(--text-muted)",
          marginTop: 8,
        }}
      >
        Press <kbd style={{ padding: "1px 5px", borderRadius: 4, border: "1px solid var(--border)", fontSize: "0.75rem" }}>Enter</kbd> or <kbd style={{ padding: "1px 5px", borderRadius: 4, border: "1px solid var(--border)", fontSize: "0.75rem" }}>,</kbd> to add · Paste a comma-separated list to import multiple at once
      </p>
    </div>
  );
}
