"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/providers/AuthProvider";
import AuthModal from "./AuthModal";
import {
  Download,
  Copy,
  Check,
  RotateCcw,
  Lock,
  FileText,
  Video,
  Play,
  Pause,
  Flame,
  User,
} from "lucide-react";
import { useToast } from "./Toast";

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
  const [copied, setCopied] = useState(false);
  const [isPlayingBoth, setIsPlayingBoth] = useState(false);
  const { success } = useToast();
  const isSignedIn = !!user;

  const originalRef = useRef<HTMLVideoElement>(null);
  const processedRef = useRef<HTMLVideoElement>(null);

  const originalUrl = originalFile ? URL.createObjectURL(originalFile) : null;

  const handleCopyTranscript = () => {
    if (!transcript) return;
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    success("Copied to clipboard!", "Paste it wherever you want.");
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadTranscript = () => {
    const blob = new Blob([transcript], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pleeb_transcript.txt";
    a.click();
    URL.revokeObjectURL(url);
    success("Transcript exported!", "pleeb_transcript.txt downloaded.");
  };

  const togglePlayBoth = () => {
    if (originalRef.current && processedRef.current) {
      if (isPlayingBoth) {
        originalRef.current.pause();
        processedRef.current.pause();
        setIsPlayingBoth(false);
      } else {
        originalRef.current.currentTime = 0;
        processedRef.current.currentTime = 0;
        originalRef.current.play();
        processedRef.current.play();
        setIsPlayingBoth(true);
      }
    }
  };

  const wordCount = transcript ? transcript.trim().split(/\s+/).length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Banner */}
      <div
        className="meme-card"
        style={{
          padding: "20px 24px",
          background: "rgba(12, 16, 26, 0.95)",
          border: "2px solid var(--lime)",
          boxShadow: "5px 5px 0px var(--lime), 0 0 30px rgba(204, 255, 0, 0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: "2rem" }}>🔥</span>
          <div>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                fontFamily: "var(--font-display)",
                color: "#ffffff",
              }}
            >
              CERTIFIED HOOD CLASSIC READY!
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--lime)", fontWeight: 700, marginTop: 2 }}>
              Swear words eliminated. Memes locked in. Perfect frame sync.
            </p>
          </div>
        </div>

        {downloadUrl && originalUrl && (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={togglePlayBoth}
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            {isPlayingBoth ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlayingBoth ? "PAUSE BOTH" : "SYNC PLAY COMPARISON"}</span>
          </button>
        )}
      </div>

      {/* Side-by-Side Video Players */}
      {originalUrl && downloadUrl && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 16,
          }}
        >
          {/* Before */}
          <div
            style={{
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              border: "2px solid rgba(255, 51, 68, 0.4)",
              background: "#000",
              boxShadow: "4px 4px 0px #000",
            }}
          >
            <div
              style={{
                padding: "8px 14px",
                background: "rgba(255, 51, 68, 0.15)",
                borderBottom: "1.5px solid rgba(255, 51, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--red)", fontFamily: "var(--font-display)" }}>
                BEFORE: RAW & UNHOLY
              </span>
              <span style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.5)", fontFamily: "var(--font-mono)" }}>
                DIRTY AUDIO
              </span>
            </div>
            <video
              ref={originalRef}
              src={originalUrl}
              controls
              style={{ width: "100%", maxHeight: 260, display: "block" }}
            />
          </div>

          {/* After */}
          <div
            style={{
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              border: "2px solid var(--lime)",
              background: "#000",
              boxShadow: "4px 4px 0px var(--lime), 0 0 20px rgba(204, 255, 0, 0.2)",
            }}
          >
            <div
              style={{
                padding: "8px 14px",
                background: "rgba(204, 255, 0, 0.15)",
                borderBottom: "1.5px solid var(--lime)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--lime)", fontFamily: "var(--font-display)" }}>
                AFTER: PLEEB REMIX 🎵
              </span>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  background: "var(--lime)",
                  color: "#000",
                  padding: "1px 6px",
                  borderRadius: 3,
                  fontFamily: "var(--font-mono)",
                }}
              >
                CENSORED
              </span>
            </div>
            <video
              ref={processedRef}
              src={downloadUrl}
              controls
              style={{ width: "100%", maxHeight: 260, display: "block" }}
            />
          </div>
        </div>
      )}

      {/* Transcript Viewer */}
      {transcript && (
        <div
          className="meme-card"
          style={{
            padding: "20px 22px",
            background: "rgba(10, 12, 18, 0.9)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={16} color="var(--lime)" />
              <h4 style={{ fontSize: "0.98rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "#fff" }}>
                Whisper Transcript
              </h4>
              <span style={{ fontSize: "0.72rem", color: "rgba(255, 255, 255, 0.5)", fontFamily: "var(--font-mono)" }}>
                [{wordCount} words detected]
              </span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleCopyTranscript}
              >
                {copied ? <Check size={12} color="var(--lime)" /> : <Copy size={12} />}
                <span>{copied ? "COPIED" : "COPY TEXT"}</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDownloadTranscript}
              >
                <Download size={12} />
                <span>SAVE .TXT</span>
              </button>
            </div>
          </div>

          <div
            style={{
              background: "#000000",
              border: "1.5px solid rgba(255, 255, 255, 0.15)",
              borderRadius: "var(--radius-xs)",
              padding: "14px 16px",
              fontSize: "0.92rem",
              lineHeight: 1.6,
              color: "rgba(255, 255, 255, 0.85)",
              maxHeight: 160,
              overflowY: "auto",
              fontFamily: "var(--font-comic)",
            }}
          >
            {transcript}
          </div>
        </div>
      )}

      {/* Main Download Card */}
      <div
        className="meme-card"
        style={{
          padding: "32px 24px",
          textAlign: "center",
          background: "rgba(12, 16, 26, 0.95)",
          border: "2px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        {downloadUrl && isSignedIn ? (
          <div>
            <div style={{ fontSize: "2.4rem", marginBottom: 10 }}>💾</div>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "#fff", marginBottom: 6 }}>
              READY TO GRAB
            </h3>
            <p style={{ fontSize: "0.88rem", color: "rgba(255, 255, 255, 0.7)", marginBottom: 20 }}>
              Hit download and take your newly censored clip straight to TikTok, YouTube, or wherever.
            </p>
            <a
              className="btn btn-primary btn-lg"
              href={downloadUrl}
              download="pleeb_censored.mp4"
              style={{ display: "inline-flex", gap: 10 }}
            >
              <Download size={20} />
              <span>DOWNLOAD CENSORED MP4</span>
            </a>
          </div>
        ) : downloadUrl ? (
          <div>
            <div style={{ fontSize: "2.4rem", marginBottom: 10 }}>🔒</div>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "#fff", marginBottom: 6 }}>
              SIGN IN TO DOWNLOAD
            </h3>
            <p
              style={{
                fontSize: "0.88rem",
                color: "rgba(255, 255, 255, 0.7)",
                maxWidth: 440,
                margin: "0 auto 20px",
                lineHeight: 1.5,
              }}
            >
              Free 10-second account. Unlocks direct video downloads and opens up the heavier Pro Whisper models.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={() => setModalOpen(true)}
              style={{ display: "inline-flex", gap: 10 }}
            >
              <User size={18} />
              <span>FREE SIGN IN / REGISTER</span>
            </button>
          </div>
        ) : (
          <div style={{ color: "rgba(255, 255, 255, 0.7)", fontSize: "0.95rem" }}>
            Transcript ready above! No video rendered in transcribe-only mode.
          </div>
        )}
      </div>

      {/* Restart Button */}
      <div style={{ textAlign: "center" }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onReset}
          style={{ display: "inline-flex", gap: 6 }}
        >
          <RotateCcw size={14} />
          <span>CENSOR ANOTHER CLIP</span>
        </button>
      </div>

      <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} defaultTab="login" />
    </div>
  );
}