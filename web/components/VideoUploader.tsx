"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { UploadCloud, Video, RefreshCw, Trash2, Clock, HardDrive, Film } from "lucide-react";
import { useToast } from "./Toast";

interface Props {
  file: File | null;
  onFile: (f: File | null) => void;
  disabled?: boolean;
}

export default function VideoUploader({ file, onFile, disabled }: Props) {
  const [dragging, setDragging] = useState(false);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<string | null>(null);
  const [videoResolution, setVideoResolution] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { error, success } = useToast();

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setVideoPreviewUrl(null);
      setVideoDuration(null);
      setVideoResolution(null);
    }
  }, [file]);

  const accept = (f: File) => {
    const isMp4 = f.type.includes("mp4") || f.name.toLowerCase().endsWith(".mp4");
    if (!isMp4) {
      error("Wrong format chief", "Pleeb only eats MP4 files right now.");
      return;
    }

    if (f.size > 200 * 1024 * 1024) {
      error("Way too thick", "Keep the video under 200MB so the server doesn't catch fire.");
      return;
    }

    onFile(f);
    success("Video loaded!", `Ready to meme "${f.name}"`);
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

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const d = videoRef.current.duration;
      const mins = Math.floor(d / 60);
      const secs = Math.floor(d % 60);
      setVideoDuration(`${mins}:${secs < 10 ? "0" : ""}${secs}`);
      setVideoResolution(`${videoRef.current.videoWidth}×${videoRef.current.videoHeight}`);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,.mp4"
        onChange={onInputChange}
        style={{ display: "none" }}
        disabled={disabled}
      />

      {!file ? (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            borderRadius: "var(--radius-md)",
            border: `3px dashed ${dragging ? "var(--lime)" : "rgba(255, 255, 255, 0.25)"}`,
            background: dragging
              ? "rgba(204, 255, 0, 0.1)"
              : "rgba(10, 12, 18, 0.65)",
            padding: "44px 20px",
            textAlign: "center",
            cursor: disabled ? "default" : "pointer",
            transition: "all 0.15s ease",
            boxShadow: dragging ? "0 0 30px rgba(204, 255, 0, 0.3)" : "none",
          }}
        >
          {/* Animated upload icon circle */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: dragging ? "var(--lime)" : "rgba(255, 255, 255, 0.08)",
              border: "2px solid #000",
              boxShadow: "3px 3px 0px #fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: dragging ? "#000" : "#fff",
              transform: dragging ? "scale(1.15) rotate(-3deg)" : "scale(1)",
              transition: "all 0.15s ease",
            }}
          >
            <Film size={34} />
          </div>

          <h3
            style={{
              fontWeight: 800,
              fontSize: "1.25rem",
              color: "#ffffff",
              marginBottom: 6,
              fontFamily: "var(--font-display)",
            }}
          >
            {dragging ? "LET GO AND DROP IT!" : "Feed your MP4 to Pleeb"}
          </h3>

          <p
            style={{
              fontSize: "0.92rem",
              color: "rgba(255, 255, 255, 0.75)",
              marginBottom: 16,
            }}
          >
            Drag & drop here or <span style={{ color: "var(--lime)", textDecoration: "underline", fontWeight: 700 }}>browse files</span>
          </p>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "4px 12px",
              borderRadius: 6,
              background: "#000000",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              fontSize: "0.76rem",
              color: "rgba(255, 255, 255, 0.6)",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span>MP4</span> • <span>MAX 200MB</span> • <span>PROCESSED PRIVATELY</span>
          </div>
        </div>
      ) : (
        /* Video Loaded with In-Browser Monitor Preview */
        <div
          style={{
            borderRadius: "var(--radius-md)",
            border: "2px solid rgba(255, 255, 255, 0.3)",
            background: "#000000",
            overflow: "hidden",
            boxShadow: "5px 5px 0px #000, 0 0 30px rgba(0,0,0,0.8)",
          }}
        >
          {/* Top Bar of the CRT Frame */}
          <div
            style={{
              padding: "8px 16px",
              background: "#111420",
              borderBottom: "2px solid rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--lime)", boxShadow: "0 0 8px var(--lime)" }} />
              <span style={{ fontSize: "0.78rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--lime)" }}>
                INPUT MONITOR // READY
              </span>
            </div>
            <span style={{ fontSize: "0.75rem", color: "rgba(255, 255, 255, 0.5)", fontFamily: "var(--font-mono)" }}>
              {videoResolution ?? "CALCULATING..."}
            </span>
          </div>

          {/* Embedded Video Player */}
          {videoPreviewUrl && (
            <div style={{ background: "#000", position: "relative", maxHeight: 300, display: "flex", justifyContent: "center" }}>
              <video
                ref={videoRef}
                src={videoPreviewUrl}
                controls
                onLoadedMetadata={handleLoadedMetadata}
                style={{
                  width: "100%",
                  maxHeight: 300,
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>
          )}

          {/* Video Metadata and Actions */}
          <div
            style={{
              padding: "14px 18px",
              background: "rgba(18, 22, 34, 0.95)",
              borderTop: "2px solid rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  color: "#fff",
                  fontFamily: "var(--font-display)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  maxWidth: 340,
                }}
                title={file.name}
              >
                {file.name}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: "0.76rem",
                  color: "rgba(255, 255, 255, 0.6)",
                  fontFamily: "var(--font-mono)",
                  marginTop: 4,
                }}
              >
                <span>SIZE: {formatSize(file.size)}</span>
                {videoDuration && (
                  <>
                    <span>•</span>
                    <span>DURATION: {videoDuration}</span>
                  </>
                )}
              </div>
            </div>

            {!disabled && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => inputRef.current?.click()}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  <RefreshCw size={13} />
                  <span>Switch</span>
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    onFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  style={{
                    background: "rgba(255, 51, 68, 0.15)",
                    border: "1.5px solid var(--red)",
                    color: "var(--red)",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Trash2 size={13} />
                  <span>Ditch</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
