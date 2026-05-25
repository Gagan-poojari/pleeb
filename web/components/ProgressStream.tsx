"use client";

import { useEffect, useRef, useState } from "react";
import { subscribeProgress, type ProgressEvent } from "@/lib/api";

const STAGE_LABELS: Record<string, string> = {
  queued:       "Queued…",
  extracting:   "Extracting audio…",
  transcribing: "Transcribing with Whisper…",
  matching:     "Matching words…",
  processing:   "Replacing audio…",
  composing:    "Composing final video…",
  done:         "Done!",
  error:        "Something went wrong",
};

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
  const cleanupRef = useRef<(() => void) | null>(null);

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
  const isDone  = event.status === "done";

  return (
    <div
      className="glass section-card"
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {!isDone && !isError && (
          <div className="spinner" style={{ flexShrink: 0 }} />
        )}
        {isDone && (
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "var(--gradient)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.7rem",
              flexShrink: 0,
            }}
          >
            ✓
          </div>
        )}
        {isError && (
          <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>⚠️</span>
        )}
        <div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            {STAGE_LABELS[event.stage] ?? event.stage}
          </div>
          {isError && (
            <div style={{ fontSize: "0.8rem", color: "#ff6b6b", marginTop: 2 }}>
              {event.error}
            </div>
          )}
        </div>
        <div
          style={{
            marginLeft: "auto",
            fontWeight: 700,
            fontSize: "0.9rem",
            background: "var(--gradient-text)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          {event.progress}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${event.progress}%` }}
        />
      </div>

      {/* Stage pills */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {["extracting", "transcribing", "matching", "processing", "composing"].map(
          (stage) => {
            const stageOrder = ["extracting", "transcribing", "matching", "processing", "composing"];
            const currentIdx = stageOrder.indexOf(event.stage);
            const thisIdx    = stageOrder.indexOf(stage);
            const isPast     = thisIdx < currentIdx || isDone;
            const isCurrent  = stage === event.stage && !isDone;

            return (
              <span
                key={stage}
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  padding: "3px 10px",
                  borderRadius: 99,
                  background: isCurrent
                    ? "rgba(199,125,255,0.15)"
                    : isPast
                    ? "rgba(72,202,228,0.1)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${
                    isCurrent
                      ? "rgba(199,125,255,0.4)"
                      : isPast
                      ? "rgba(72,202,228,0.2)"
                      : "var(--border)"
                  }`,
                  color: isCurrent
                    ? "hsl(265,80%,78%)"
                    : isPast
                    ? "hsl(195,80%,70%)"
                    : "var(--text-muted)",
                  transition: "all 0.3s ease",
                }}
              >
                {isPast && !isCurrent ? "✓ " : ""}
                {STAGE_LABELS[stage]?.replace("…", "") ?? stage}
              </span>
            );
          }
        )}
      </div>

      {/* Live transcript preview */}
      {event.transcript && (
        <div
          style={{
            padding: "12px 16px",
            background: "rgba(255,255,255,0.03)",
            borderRadius: 10,
            border: "1px solid var(--border)",
            fontSize: "0.82rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            maxHeight: 100,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "var(--text-muted)",
              marginBottom: 6,
              letterSpacing: "0.05em",
            }}
          >
            TRANSCRIPT PREVIEW
          </div>
          {event.transcript}
        </div>
      )}
    </div>
  );
}
