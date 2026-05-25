"use client";

import { useCallback, useRef, useState } from "react";

interface Props {
  file: File | null;
  onFile: (f: File) => void;
  disabled?: boolean;
}

export default function VideoUploader({ file, onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (f: File) => {
    if (!f.type.includes("mp4") && !f.name.endsWith(".mp4")) {
      alert("Please upload an MP4 file.");
      return;
    }
    onFile(f);
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      if (disabled) return;
      const f = e.dataTransfer.files[0];
      if (f) accept(f);
    },
    [disabled]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) accept(f);
  };

  const formatSize = (bytes: number) =>
    bytes > 1024 * 1024
      ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
      : `${(bytes / 1024).toFixed(0)} KB`;

  return (
    <div
      onClick={() => !disabled && !file && inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      style={{
        borderRadius: 20,
        border: `2px dashed ${
          dragging
            ? "var(--accent)"
            : file
            ? "rgba(199,125,255,0.4)"
            : "var(--border)"
        }`,
        background: dragging
          ? "rgba(199,125,255,0.06)"
          : file
          ? "rgba(199,125,255,0.04)"
          : "var(--bg-card)",
        padding: file ? "20px 24px" : "48px 24px",
        textAlign: "center",
        cursor: disabled || file ? "default" : "pointer",
        transition: "all 0.25s ease",
        position: "relative",
        boxShadow: dragging ? "0 0 0 4px var(--accent-glow)" : "none",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,.mp4"
        onChange={onInputChange}
        style={{ display: "none" }}
        disabled={disabled}
      />

      {!file ? (
        <>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(199,125,255,0.1)",
              border: "1px solid rgba(199,125,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: "1.6rem",
              transition: "transform 0.2s",
              transform: dragging ? "scale(1.15)" : "scale(1)",
            }}
          >
            🎬
          </div>
          <div style={{ fontWeight: 600, marginBottom: 8, fontSize: "0.95rem" }}>
            {dragging ? "Drop it!" : "Drop your video here"}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            or click to browse · MP4 only
          </div>
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "rgba(199,125,255,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.4rem",
              flexShrink: 0,
            }}
          >
            🎬
          </div>
          <div style={{ textAlign: "left", flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: "0.9rem",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {file.name}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 2 }}>
              {formatSize(file.size)}
            </div>
          </div>
          {!disabled && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={(e) => {
                e.stopPropagation();
                onFile(null as unknown as File);
                if (inputRef.current) inputRef.current.value = "";
              }}
              style={{ flexShrink: 0 }}
            >
              Change
            </button>
          )}
        </div>
      )}
    </div>
  );
}
