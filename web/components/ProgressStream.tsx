"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeProgress, type ProgressEvent } from "@/lib/api";
import { CheckCircle2, AlertCircle, Loader2, Terminal, Flame, Clock } from "lucide-react";

interface StageInfo {
  id: string;
  title: string;
  tagline: string;
}

const STAGES: StageInfo[] = [
  { id: "extracting", title: "Rip Audio Track", tagline: "Extracting raw WAV" },
  { id: "transcribing", title: "Whisper AI", tagline: "Finding words & timestamps" },
  { id: "matching", title: "Hunt Profanity", tagline: "Matching curse variants" },
  { id: "processing", title: "Splice Memes", tagline: "Dropping in the audio clips" },
  { id: "composing", title: "Bake Video", tagline: "Syncing frames & audio" },
];

const FUNNY_MESSAGES = [
  "Sniffing out illicit vocabulary with Whisper AI...",
  "Calibrating the exact millisecond to drop the 'Bruh'...",
  "FFmpeg is working overtime so you don't get banned...",
  "Replacing your F-bombs with wholesome brainrot...",
  "Loading the Metal Pipe reverberation sound effect...",
  "Don't refresh the page you impatient legend...",
  "Surgically removing profanity for family-friendly monetization...",
];

interface Props {
  jobId: string;
  onEvent: (e: ProgressEvent) => void;
}

export default function ProgressStream({ jobId, onEvent }: Props) {
  const [event, setEvent] = useState<ProgressEvent>({
    stage: "queued",
    progress: 0,
    status: "processing",
  });
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [timer, setTimer] = useState(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const qInterval = setInterval(() => {
      setQuoteIdx((i) => (i + 1) % FUNNY_MESSAGES.length);
    }, 3500);
    const tInterval = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => {
      clearInterval(qInterval);
      clearInterval(tInterval);
    };
  }, []);

  useEffect(() => {
    cleanupRef.current = subscribeProgress(
      jobId,
      (e) => {
        setEvent(e);
        onEvent(e);
      },
      (err) => {
        setEvent((prev) => ({ ...prev, status: "error", error: err }));
        onEvent({ stage: "error", progress: 0, status: "error", error: err });
      }
    );
    return () => cleanupRef.current?.();
  }, [jobId, onEvent]);

  const isError = event.status === "error";
  const isDone = event.status === "done";

  const stageOrder = STAGES.map((s) => s.id);
  const currentIdx = stageOrder.indexOf(event.stage);

  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        border: "2px solid rgba(255, 255, 255, 0.25)",
        background: "rgba(10, 12, 18, 0.95)",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
        boxShadow: "5px 5px 0px #000, 0 0 35px rgba(204, 255, 0, 0.15)",
      }}
    >
      {/* Header with live status and EQ bars */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {!isDone && !isError ? (
            <div className="eq-bars">
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
              <div className="eq-bar" />
            </div>
          ) : isDone ? (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--lime)",
                color: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
              }}
            >
              <CheckCircle2 size={22} strokeWidth={3} />
            </div>
          ) : (
            <AlertCircle size={32} color="var(--red)" />
          )}

          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 800, fontFamily: "var(--font-display)", color: "#fff" }}>
              {isDone ? "CHAOS ASSEMBLED!" : isError ? "SYSTEM FAILURE" : "MEME INJECTION IN PROGRESS"}
            </h3>
            <p style={{ fontSize: "0.84rem", color: isError ? "var(--red)" : "var(--lime)", marginTop: 2, fontWeight: 700 }}>
              {isError ? event.error ?? "Processing failed" : FUNNY_MESSAGES[quoteIdx]}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              background: "#000",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 4,
              fontFamily: "var(--font-mono)",
              fontSize: "0.8rem",
              color: "rgba(255, 255, 255, 0.7)",
            }}
          >
            <Clock size={12} />
            <span>{timer}s</span>
          </div>

          <div
            style={{
              fontSize: "1.8rem",
              fontWeight: 800,
              fontFamily: "var(--font-display)",
              color: isDone ? "var(--lime)" : "#ffffff",
              textShadow: isDone ? "0 0 10px var(--lime)" : "none",
            }}
          >
            {event.progress}%
          </div>
        </div>
      </div>

      {/* Progress Track */}
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${event.progress}%` }} />
      </div>

      {/* 5 Stages Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
          gap: 8,
        }}
      >
        {STAGES.map((s, idx) => {
          const isCurrent = event.stage === s.id && !isDone && !isError;
          const isPassed = currentIdx > idx || isDone;

          return (
            <div
              key={s.id}
              style={{
                padding: "10px",
                borderRadius: "var(--radius-xs)",
                border: `1.5px solid ${
                  isCurrent
                    ? "var(--pink)"
                    : isPassed
                    ? "var(--lime)"
                    : "rgba(255, 255, 255, 0.1)"
                }`,
                background: isCurrent
                  ? "rgba(255, 42, 133, 0.2)"
                  : isPassed
                  ? "rgba(204, 255, 0, 0.08)"
                  : "rgba(0, 0, 0, 0.4)",
                boxShadow: isCurrent ? "2px 2px 0px var(--pink)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span
                  style={{
                    fontSize: "0.78rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-display)",
                    color: isCurrent ? "var(--pink)" : isPassed ? "var(--lime)" : "rgba(255, 255, 255, 0.4)",
                  }}
                >
                  {s.title}
                </span>
                {isPassed && <span style={{ color: "var(--lime)", fontSize: "0.75rem", fontWeight: 800 }}>✓</span>}
              </div>
              <span style={{ fontSize: "0.68rem", color: "rgba(255, 255, 255, 0.55)" }}>{s.tagline}</span>
            </div>
          );
        })}
      </div>

      {/* Live Whisper Terminal Output */}
      {event.transcript && (
        <div
          style={{
            background: "#000000",
            border: "2px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "var(--radius-xs)",
            padding: "12px 14px",
            fontFamily: "var(--font-mono)",
            maxHeight: 120,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--lime)",
              marginBottom: 6,
            }}
          >
            <Terminal size={12} />
            <span>WHISPER_FEED // LIVE AUDIO TEXT</span>
          </div>
          <p
            style={{
              fontSize: "0.82rem",
              color: "rgba(255, 255, 255, 0.8)",
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {event.transcript}
          </p>
        </div>
      )}
    </div>
  );
}
