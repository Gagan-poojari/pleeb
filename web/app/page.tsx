"use client";

import { useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import VideoUploader from "@/components/VideoUploader";
import WordInput from "@/components/WordInput";
import ModelSelector from "@/components/ModelSelector";
import ModeSelector from "@/components/ModeSelector";
import SoundboardPreview from "@/components/SoundboardPreview";
import ProgressStream from "@/components/ProgressStream";
import ResultsPanel from "@/components/ResultsPanel";
import { startProcess, transcribeOnly, getDownloadUrl } from "@/lib/api";
import type { ProcessMode, WhisperModel } from "@/lib/api";
import {
  Zap,
  Music,
  VolumeX,
  FileText,
  ShieldAlert,
  ArrowRight,
  Film,
  Cpu,
  Smile,
  Flame,
  Bomb,
  Radio,
} from "lucide-react";
import { useToast } from "@/components/Toast";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<ProcessMode>("auto_bleep");
  const [model, setModel] = useState<WhisperModel>("tiny");
  const [words, setWords] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "processing" | "done" | "error">("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const { error: toastError, success: toastSuccess } = useToast();

  const handleTranscribeOnly = useCallback(async () => {
    if (!file) return;
    setPhase("processing");
    setJobId("transcribe");
    try {
      const result = await transcribeOnly(file, model);
      setTranscript(result.transcript);
      setPhase("done");
      toastSuccess("Transcription finished!", "Check your transcript below.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Transcription failed.";
      setErrorMsg(msg);
      toastError("Failed to transcribe", msg);
      setPhase("error");
    }
  }, [file, model, toastError, toastSuccess]);

  const handleProcess = useCallback(async () => {
    if (!file) return;

    if (mode === "transcribe_only") {
      handleTranscribeOnly();
      return;
    }

    setPhase("processing");
    setTranscript("");
    setDownloadUrl(null);
    setErrorMsg("");
    try {
      const id = await startProcess(file, mode, model, words);
      setJobId(id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Server error starting process.";
      setErrorMsg(msg);
      toastError("Could not start job", msg);
      setPhase("error");
    }
  }, [file, mode, model, words, handleTranscribeOnly, toastError]);

  const onProgress = useCallback(
    (event: { status: string; transcript?: string }) => {
      if (event.transcript) setTranscript(event.transcript);
      if (event.status === "done" && jobId) {
        setDownloadUrl(getDownloadUrl(jobId));
        setPhase("done");
        toastSuccess("Video ready!", "Download your newly censored clip.");
      }
      if (event.status === "error") {
        setErrorMsg("Processing failed on the server. Check backend terminal logs.");
        setPhase("error");
      }
    },
    [jobId, toastSuccess]
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
  const showSteps = !!file && phase === "idle";

  return (
    <>
      <Navbar />

      <main
        style={{
          maxWidth: 880,
          margin: "0 auto",
          padding: "96px 18px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        {/* ── HERO ────────────────────────────────────────────────────────── */}
        <section style={{ textAlign: "center", padding: "10px 0 6px" }}>
          {/* Top Pill Tag */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 6,
              background: "#000000",
              border: "2px solid var(--lime)",
              boxShadow: "3px 3px 0px var(--lime)",
              color: "var(--lime)",
              fontSize: "0.82rem",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              marginBottom: 18,
            }}
          >
            <Bomb size={15} />
            <span>AI VIDEO AUTO-CENSORSHIP & BRAINROT REMIX</span>
          </div>

          {/* Main Display Headline */}
          <h1
            style={{
              fontSize: "clamp(2.5rem, 6.5vw, 4.4rem)",
              fontWeight: 800,
              lineHeight: 1.05,
              marginBottom: 16,
              letterSpacing: "-0.04em",
              textTransform: "uppercase",
              textShadow: "4px 4px 0px #000, 0 0 40px rgba(0,0,0,0.8)",
            }}
          >
            Censor the dirty talk. <br />
            <span style={{ color: "var(--lime)", WebkitTextStroke: "1px #000" }}>Slap in the memes.</span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: "1.08rem",
              color: "rgba(255, 255, 255, 0.9)",
              maxWidth: 620,
              margin: "0 auto 24px",
              lineHeight: 1.55,
              textShadow: "1px 1px 2px #000",
            }}
          >
            Got a video with too many F-bombs for YouTube, TikTok, or your mom? Whisper AI
            catches every curse with millisecond precision, and Pleeb automatically splices
            in <strong style={{ color: "var(--lime)" }}>Bruh</strong>, <strong style={{ color: "var(--pink)" }}>Metal Pipe</strong>, and <strong style={{ color: "var(--cyan)" }}>Oof</strong> sounds
            so you don't get demonetized.
          </p>

          {/* Feature Badges */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              flexWrap: "wrap",
              fontSize: "0.82rem",
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.7)", padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)" }}>
              <Zap size={13} color="var(--lime)" /> 0ms FRAME DRIFT
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.7)", padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)" }}>
              <Radio size={13} color="var(--pink)" /> 9+ MEME SOUND FX
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(0,0,0,0.7)", padding: "4px 10px", borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)" }}>
              <Cpu size={13} color="var(--cyan)" /> WHISPER ASR TIMESTAMPS
            </span>
          </div>
        </section>

        {/* ── SOUNDBOARD PREVIEW (THE NOISE MACHINE) ──────────────────────── */}
        <SoundboardPreview />

        {/* ── WIZARD WORKBENCH ────────────────────────────────────────────── */}
        <div
          className="meme-card"
          style={{
            overflow: "hidden",
            background: "rgba(10, 13, 20, 0.94)",
            border: "2.5px solid rgba(255, 255, 255, 0.3)",
            boxShadow: "6px 6px 0px #000, 0 20px 60px rgba(0, 0, 0, 0.9)",
          }}
        >
          {/* Step 1: Upload */}
          <Step n={1} label="FEED YOUR MP4 VIDEO" first>
            <VideoUploader file={file} onFile={setFile} disabled={phase !== "idle"} />
          </Step>

          {showSteps && (
            <div className="pop-in">
              {/* Step 2: Mode */}
              <Step n={2} label="CHOOSE YOUR CENSOR VIBE">
                <ModeSelector value={mode} onChange={setMode} />
              </Step>

              {/* Step 3: Custom words (only in custom mode) */}
              {mode === "custom_bleep" && (
                <Step n={3} label="THE HIT LIST (CUSTOM WORDS TO BLEEP)">
                  <p style={{ fontSize: "0.84rem", color: "rgba(255, 255, 255, 0.65)", marginBottom: 10 }}>
                    Add whatever names, words, or secret phrases you want censored out of the video:
                  </p>
                  <WordInput words={words} onChange={setWords} />
                </Step>
              )}

              {/* Step 3 or 4: Whisper AI model */}
              <Step n={mode === "custom_bleep" ? 4 : 3} label="PICK THE WHISPER AI ENGINE">
                <p style={{ fontSize: "0.84rem", color: "rgba(255, 255, 255, 0.65)", marginBottom: 12 }}>
                  We recommend <strong style={{ color: "var(--lime)" }}>Base</strong> for fast, reliable accuracy on most speech.
                </p>
                <ModelSelector value={model} onChange={setModel} />
              </Step>

              {/* Action Bar */}
              <div
                style={{
                  padding: "22px 24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap",
                  borderTop: "2px solid rgba(255, 255, 255, 0.15)",
                  background: "rgba(0, 0, 0, 0.6)",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleTranscribeOnly}
                  disabled={!canProcess}
                  style={{ display: "inline-flex", gap: 8 }}
                >
                  <FileText size={16} />
                  <span>JUST TRANSCRIBE</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleProcess}
                  disabled={!canProcess || (mode === "custom_bleep" && words.length === 0)}
                  style={{
                    flex: 1,
                    minWidth: 260,
                    display: "inline-flex",
                    gap: 10,
                  }}
                >
                  {mode === "meme" ? (
                    <>
                      <Music size={20} />
                      <span>SLAP MEMES ON THIS VIDEO 💥</span>
                    </>
                  ) : mode === "custom_bleep" ? (
                    <>
                      <VolumeX size={20} />
                      <span>BLEEP HIT LIST TARGETS 🎯</span>
                    </>
                  ) : mode === "transcribe_only" ? (
                    <>
                      <FileText size={20} />
                      <span>TRANSCRIBE WITH WHISPER 📝</span>
                    </>
                  ) : (
                    <>
                      <VolumeX size={20} />
                      <span>AUTO BLEEP ALL SWEARS 📢</span>
                    </>
                  )}
                  <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Processing State */}
          {phase === "processing" && (
            <div style={{ padding: "26px" }}>
              {jobId === "transcribe" ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 14,
                    padding: "32px 0",
                  }}
                >
                  <div className="spinner" />
                  <p style={{ color: "var(--lime)", fontSize: "0.96rem", fontWeight: 800, fontFamily: "var(--font-display)" }}>
                    WHISPER AI TRANSCRIBING AUDIO TRACK...
                  </p>
                </div>
              ) : jobId ? (
                <ProgressStream jobId={jobId} onEvent={onProgress} />
              ) : null}
            </div>
          )}

          {/* Error State */}
          {phase === "error" && (
            <div style={{ padding: "36px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "2.4rem", marginBottom: 10 }}>⚠️</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "var(--red)", marginBottom: 8 }}>
                SOMETHING BROKE IN THE PIPELINE
              </h3>
              <p style={{ color: "rgba(255, 255, 255, 0.8)", marginBottom: 20, maxWidth: 440, margin: "0 auto 20px" }}>
                {errorMsg || "Could not reach the server or processing failed."}
              </p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>
                TRY AGAIN
              </button>
            </div>
          )}
        </div>

        {/* ── RESULTS STATE ────────────────────────────────────────────────── */}
        {phase === "done" && (
          <div className="pop-in">
            <ResultsPanel
              originalFile={file}
              downloadUrl={downloadUrl}
              transcript={transcript}
              onReset={reset}
            />
          </div>
        )}

        {/* ── UNDER THE HOOD (NO CORPORATE AI BULLSHIT) ───────────────────── */}
        <HowItWorks />

        {/* ── FOOTER ──────────────────────────────────────────────────────── */}
        <footer
          style={{
            marginTop: 40,
            padding: "24px 0 40px",
            borderTop: "2px solid rgba(255, 255, 255, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            fontSize: "0.85rem",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 800, color: "#fff", fontFamily: "var(--font-display)" }}>PLEEB</span>
            <span>— Meme the Mess. Keep your audio in sync.</span>
          </div>

          <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
            POWERED BY WHISPER ASR & FFMPEG
          </div>
        </footer>
      </main>
    </>
  );
}

/* ── Step Container ───────────────────────────────────────────────────────── */
function Step({
  n,
  label,
  children,
  first,
}: {
  n: number;
  label: string;
  children: React.ReactNode;
  first?: boolean;
}) {
  return (
    <div
      style={{
        padding: "22px 24px",
        borderTop: first ? "none" : "2px solid rgba(255, 255, 255, 0.12)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span className="step-badge">{n}</span>
        <h2 style={{ fontWeight: 800, fontSize: "1.1rem", color: "#ffffff", fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
          {label}
        </h2>
      </div>
      {children}
    </div>
  );
}

/* ── How It Works ─────────────────────────────────────────────────────────── */
function HowItWorks() {
  const steps = [
    {
      title: "1. Feed the Video",
      desc: "Drop any MP4. It processes privately on your machine and never gets stored permanently.",
    },
    {
      title: "2. Whisper Tracks Syllables",
      desc: "OpenAI Whisper transcribes speech down to the exact millisecond timestamps.",
    },
    {
      title: "3. Phonetic Slang Sniffer",
      desc: "Lemmatization and phonetic matching catch disguised curses, plurals, and mumbled swears.",
    },
    {
      title: "4. Meme Audio Surgical Drop",
      desc: "FFmpeg mutes the foul language and drops in Bruh, Oof, or Bleep without shifting audio sync 1 single frame.",
    },
  ];

  return (
    <section style={{ marginTop: 24 }}>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <h2
          style={{
            fontSize: "1.8rem",
            fontWeight: 800,
            fontFamily: "var(--font-display)",
            textTransform: "uppercase",
            letterSpacing: "-0.03em",
          }}
        >
          Under The Hood
        </h2>
        <p style={{ fontSize: "0.92rem", color: "rgba(255, 255, 255, 0.7)" }}>
          How Pleeb preserves speech rhythm and keeps audio 100% in sync
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
        }}
      >
        {steps.map((s) => (
          <div
            key={s.title}
            className="meme-card meme-card-interactive"
            style={{
              padding: "18px 16px",
              background: "rgba(12, 16, 26, 0.85)",
            }}
          >
            <h3 style={{ fontWeight: 800, fontSize: "0.98rem", color: "#fff", marginBottom: 6 }}>
              {s.title}
            </h3>
            <p style={{ fontSize: "0.82rem", color: "rgba(255, 255, 255, 0.65)", lineHeight: 1.45 }}>
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}