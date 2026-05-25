"use client";

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import AuthModal from "./AuthModal";

interface Props {
  originalFile: File | null;
  downloadUrl: string | null;
  transcript: string;
  onReset: () => void;
}

export default function ResultsPanel({
  originalFile,
  downloadUrl,
  transcript,
  onReset,
}: Props) {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const isSignedIn = !!user;
  const originalUrl = originalFile ? URL.createObjectURL(originalFile) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Success banner */}
      <div
        style={{
          padding: "14px 20px",
          borderRadius: 14,
          background: "rgba(72,202,228,0.08)",
          border: "1px solid rgba(72,202,228,0.25)",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span style={{ fontSize: "1.4rem" }}>🎉</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>
            Video processed successfully!
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 2 }}>
            {isSignedIn
              ? "Your video is ready to download."
              : "Sign in to download your processed video."}
          </div>
        </div>
      </div>

      {/* Side-by-side video comparison */}
      {originalUrl && downloadUrl && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <VideoCard label="Original" url={originalUrl} />
          <VideoCard label="Processed 🎵" url={downloadUrl} accent />
        </div>
      )}

      {/* Transcript */}
      {transcript && (
        <div className="glass section-card" style={{ padding: "20px 24px" }}>
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--text-muted)",
              letterSpacing: "0.06em",
              marginBottom: 10,
            }}
          >
            TRANSCRIPT
          </div>
          <p
            style={{
              fontSize: "0.88rem",
              color: "var(--text-secondary)",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {transcript}
          </p>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginTop: 14 }}
            onClick={() => {
              const blob = new Blob([transcript], { type: "text/plain" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "transcript.txt";
              a.click();
            }}
          >
            Download Transcript
          </button>
        </div>
      )}

      {/* Download / auth gate */}
      <div
        className="glass section-card"
        style={{ textAlign: "center", padding: "28px 24px" }}
      >
        {downloadUrl && isSignedIn ? (
          <>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>⬇️</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Ready to download</div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                marginBottom: 20,
              }}
            >
              Your processed video will be downloaded as MP4.
            </div>
            <a
              className="btn btn-primary btn-lg"
              href={downloadUrl}
              download="pleeb_processed.mp4"
              style={{ display: "inline-flex" }}
            >
              Download Processed Video
            </a>
          </>
        ) : downloadUrl ? (
          <>
            <div style={{ fontSize: "2rem", marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Sign in to download</div>
            <div
              style={{
                fontSize: "0.82rem",
                color: "var(--text-secondary)",
                marginBottom: 20,
              }}
            >
              Create a free account to download your processed video.
              Processing is always free.
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setModalOpen(true)}
            >
              Sign in to Download
            </button>
          </>
        ) : (
          <div style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>
            Transcript saved — no video output for transcribe-only mode.
          </div>
        )}
      </div>

      {/* Reset */}
      <div style={{ textAlign: "center" }}>
        <button className="btn btn-secondary btn-sm" onClick={onReset}>
          ← Process Another Video
        </button>
      </div>

      <AuthModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab="login"
      />
    </div>
  );
}

function VideoCard({
  label,
  url,
  accent,
}: {
  label: string;
  url: string;
  accent?: boolean;
}) {
  return (
    <div
      className="glass"
      style={{
        borderRadius: 14,
        overflow: "hidden",
        border: accent
          ? "1px solid rgba(199,125,255,0.35)"
          : "1px solid var(--border)",
      }}
    >
      <div
        style={{
          padding: "8px 14px",
          fontSize: "0.75rem",
          fontWeight: 600,
          color: accent ? "hsl(265,80%,78%)" : "var(--text-secondary)",
          borderBottom: "1px solid var(--border)",
          background: accent
            ? "rgba(199,125,255,0.06)"
            : "rgba(255,255,255,0.02)",
        }}
      >
        {label}
      </div>
      <video
        src={url}
        controls
        style={{ width: "100%", display: "block", maxHeight: 220 }}
      />
    </div>
  );
}