"use client";

import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import VideoUploader from "@/components/VideoUploader";
import WordInput from "@/components/WordInput";
import ModelSelector from "@/components/ModelSelector";
import ProgressStream from "@/components/ProgressStream";
import ResultsPanel from "@/components/ResultsPanel";
import { startProcess, transcribeOnly, getDownloadUrl } from "@/lib/api";
import type { ProcessMode, WhisperModel } from "@/lib/api";

const MODES: { id: ProcessMode; label: string; desc: string }[] = [
  { id: "auto_bleep",   label: "Auto Bleep",     desc: "Detect & bleep swear words automatically" },
  { id: "meme",         label: "Meme the Mess",  desc: "Replace swear words with random meme sounds" },
  { id: "custom_bleep", label: "Custom Bleep",   desc: "You pick which words to bleep" },
];

export default function Home() {
  const [file, setFile]           = useState<File | null>(null);
  const [mode, setMode]           = useState<ProcessMode>("auto_bleep");
  const [model, setModel]         = useState<WhisperModel>("base");
  const [words, setWords]         = useState<string[]>([]);
  const [phase, setPhase]         = useState<"idle" | "processing" | "done" | "error">("idle");
  const [jobId, setJobId]         = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg]   = useState<string>("");

  const handleTranscribeOnly = useCallback(async () => {
    if (!file) return;
    setPhase("processing");
    setJobId("transcribe");
    try {
      const result = await transcribeOnly(file, model);
      setTranscript(result.transcript);
      setPhase("done");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Transcription failed.");
      setPhase("error");
    }
  }, [file, model]);

  const handleProcess = useCallback(async () => {
    if (!file) return;
    setPhase("processing");
    setTranscript("");
    setDownloadUrl(null);
    setErrorMsg("");
    try {
      const id = await startProcess(file, mode, model, words);
      setJobId(id);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to start processing.");
      setPhase("error");
    }
  }, [file, mode, model, words]);

  const onProgress = useCallback(
    (event: { status: string; transcript?: string }) => {
      if (event.transcript) setTranscript(event.transcript);
      if (event.status === "done" && jobId) {
        setDownloadUrl(getDownloadUrl(jobId));
        setPhase("done");
      }
      if (event.status === "error") {
        setErrorMsg("Processing failed on the server.");
        setPhase("error");
      }
    },
    [jobId]
  );

  const reset = () => {
    setFile(null);
    setPhase("idle");
    setJobId(null);
    setTranscript("");
    setDownloadUrl(null);
    setErrorMsg("");
    setWords([]);
    setMode("auto_bleep");
  };

  const canProcess = !!file && phase === "idle";
  const showSteps  = !!file && phase === "idle";

  return (
    <>
      <Navbar />

      <main style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "96px 20px 80px",
        display: "flex",
        flexDirection: "column",
        gap: 0,
      }}>
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div className="fade-up" style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{
            fontSize: "clamp(2.4rem, 7vw, 3.8rem)",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 14,
            letterSpacing: "-0.01em",
          }}>
            Pleeb — Meme the Mess
          </h1>
          <p style={{
            fontSize: "1rem",
            color: "var(--text-secondary)",
            maxWidth: 480,
            margin: "0 auto",
            lineHeight: 1.65,
          }}>
            Upload a video. Auto-detect swear words. Replace them with a bleep — or a random meme sound.
          </p>
        </div>

        {/* ── Main panel ──────────────────────────────────────────────────── */}
        <div
          className="glass fade-up fade-up-1"
          style={{
            borderRadius: 18,
            overflow: "hidden",
            border: "1.5px solid rgba(255,255,255,0.14)",
          }}
        >
          {/* Step 1: Upload */}
          <Step n={1} label="Upload a video" first>
            <VideoUploader file={file} onFile={setFile} disabled={phase !== "idle"} />
          </Step>

          {showSteps && (
            <>
              {/* Step 2: Mode */}
              <Step n={2} label="Choose what to do">
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMode(m.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "13px 16px",
                        borderRadius: 10,
                        border: `2px solid ${mode === m.id ? "#ffffff" : "rgba(255,255,255,0.14)"}`,
                        background: mode === m.id ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.03)",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 0.18s ease",
                        width: "100%",
                      }}
                    >
                      <div style={{
                        width: 18, height: 18,
                        borderRadius: "50%",
                        border: `2.5px solid ${mode === m.id ? "#ffffff" : "rgba(255,255,255,0.3)"}`,
                        background: mode === m.id ? "#ffffff" : "transparent",
                        flexShrink: 0,
                        transition: "all 0.18s",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {mode === m.id && (
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#000" }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#fff" }}>{m.label}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: 2 }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </Step>

              {/* Step 3: Custom words (conditional) */}
              {mode === "custom_bleep" && (
                <Step n={3} label="Words to bleep (comma separated)">
                  <WordInput words={words} onChange={setWords} />
                </Step>
              )}

              {/* Step 3/4: Model */}
              <Step n={mode === "custom_bleep" ? 4 : 3} label="Choose a model">
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: 12 }}>
                  Recommended: <strong style={{ color: "var(--text-secondary)" }}>base</strong> — fast and accurate enough for most videos. Larger models are slower but better.
                </p>
                <ModelSelector value={model} onChange={setModel} />
              </Step>

              {/* Actions */}
              <div style={{
                padding: "20px 24px 24px",
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                borderTop: "1px solid rgba(255,255,255,0.08)",
              }}>
                <button
                  className="btn btn-secondary"
                  onClick={handleTranscribeOnly}
                  disabled={!canProcess}
                  style={{ minWidth: 140 }}
                >
                  Transcribe Only
                </button>
                <button
                  className="btn btn-primary btn-lg"
                  style={{ flex: 1, minWidth: 200 }}
                  onClick={handleProcess}
                  disabled={!canProcess || (mode === "custom_bleep" && words.length === 0)}
                >
                  {mode === "meme" ? "🎵 Meme the Mess" : "🔇 Process Video"}
                </button>
              </div>
            </>
          )}

          {/* Processing state */}
          {phase === "processing" && (
            <div style={{ padding: "28px 24px", textAlign: "center" }}>
              {jobId === "transcribe" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
                  <div className="spinner" />
                  <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Transcribing audio…</p>
                </div>
              ) : jobId ? (
                <ProgressStream jobId={jobId} onEvent={onProgress} />
              ) : null}
            </div>
          )}

          {/* Error state */}
          {phase === "error" && (
            <div style={{ padding: "24px", textAlign: "center" }}>
              <p style={{ color: "#ff8080", marginBottom: 16, fontSize: "0.9rem" }}>⚠️ {errorMsg}</p>
              <button className="btn btn-secondary btn-sm" onClick={reset}>Try Again</button>
            </div>
          )}
        </div>

        {/* Results */}
        {phase === "done" && (
          <div className="fade-up" style={{ marginTop: 24 }}>
            <ResultsPanel
              originalFile={file}
              downloadUrl={downloadUrl}
              transcript={transcript}
              onReset={reset}
            />
          </div>
        )}

        {/* How it works */}
        <HowItWorks />
      </main>
    </>
  );
}

/* ── Step wrapper ─────────────────────────────────────────────────────────── */
function Step({
  n, label, children, first,
}: {
  n: number; label: string; children: React.ReactNode; first?: boolean;
}) {
  return (
    <div style={{
      padding: "22px 24px",
      borderTop: first ? "none" : "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span className="step-badge">{n}</span>
        <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#fff" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

/* ── How it works ─────────────────────────────────────────────────────────── */
function HowItWorks() {
  const items = [
    { emoji: "📤", title: "Upload",        desc: "Any MP4. Stays on the server, deleted after download." },
    { emoji: "🧠", title: "Transcribe",    desc: "OpenAI Whisper produces word-level timestamps." },
    { emoji: "🔍", title: "Match",         desc: "Catches variants like 'fucking → fuck' and compound words." },
    { emoji: "🎵", title: "Meme the Mess", desc: "Replace matched words with a bleep or a random meme sound." },
  ];

  return (
    <div style={{ marginTop: 60 }}>
      <h2 style={{ fontSize: "1.4rem", fontWeight: 700, textAlign: "center", marginBottom: 24 }}>
        How Pleeb works
      </h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
      }}>
        {items.map((s, i) => (
          <div
            key={s.title}
            className={`glass fade-up`}
            style={{
              borderRadius: 14,
              padding: "20px 18px",
              border: "1.5px solid rgba(255,255,255,0.1)",
              animationDelay: `${i * 0.07}s`,
            }}
          >
            <div style={{ fontSize: "1.8rem", marginBottom: 10 }}>{s.emoji}</div>
            <div style={{ fontWeight: 700, fontSize: "0.88rem", marginBottom: 6 }}>{s.title}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}