/**
 * Typed API client — all calls go through Next.js rewrites → FastAPI.
 * Base URL is always /api so this works in both dev and production.
 */

export type ProcessMode = "transcribe_only" | "custom_bleep" | "auto_bleep" | "meme";
export type WhisperModel = "tiny" | "base" | "small" | "medium" | "large";

export interface ProgressEvent {
  stage: string;
  progress: number;
  status: "processing" | "done" | "error";
  transcript?: string;
  error?: string;
}

export interface TranscribeResult {
  job_id: string;
  transcript: string;
  words: Array<{ text: string; start: number; end: number; confidence: number }>;
}

// ── process (upload + pipeline) ───────────────────────────────────────────────

export async function startProcess(
  file: File,
  mode: ProcessMode,
  model: WhisperModel,
  words: string[]
): Promise<string> {
  const form = new FormData();
  form.append("video", file);
  form.append("mode", mode);
  form.append("model", model);
  form.append("words", words.join(","));

  const res = await fetch("/api/process", { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
  const data = await res.json();
  return data.job_id as string;
}

export function subscribeProgress(
  jobId: string,
  onEvent: (e: ProgressEvent) => void,
  onError: (err: string) => void
): () => void {
  const es = new EventSource(`/api/process/${jobId}/stream`);

  es.onmessage = (event) => {
    try {
      const payload: ProgressEvent = JSON.parse(event.data);
      onEvent(payload);
      if (payload.status === "done" || payload.status === "error") {
        es.close();
      }
    } catch {
      // ignore malformed events
    }
  };

  es.onerror = () => {
    es.close();
    onError("Connection to server lost.");
  };

  // Return cleanup function
  return () => es.close();
}

export function getDownloadUrl(jobId: string): string {
  return `/api/process/${jobId}/download`;
}

// ── transcribe only ───────────────────────────────────────────────────────────

export async function transcribeOnly(
  file: File,
  model: WhisperModel
): Promise<TranscribeResult> {
  const form = new FormData();
  form.append("video", file);
  form.append("model", model);

  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  if (!res.ok) throw new Error(`Transcription failed: ${res.statusText}`);
  return res.json();
}
