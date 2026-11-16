import { useCallback, useEffect, useRef, useState } from "react";

const AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
const MAX_SECONDS = 600;

export const voiceRecordingSupported = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";

/** Microphone-only recorder for the voice-message option. Capped at 10 minutes. */
export function useVoiceRecorder(onFinished: (audio: Blob, seconds: number) => void) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const live = useRef<{ stop: () => void; cancel: () => void } | null>(null);
  const done = useRef(onFinished);
  done.current = onFinished;

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const mime = AUDIO_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      const startedAt = Date.now();
      let cancelled = false;
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const timer = window.setInterval(() => {
        const s = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(s);
        if (s >= MAX_SECONDS) rec.stop();
      }, 500);
      rec.onstop = () => {
        window.clearInterval(timer);
        stream.getTracks().forEach((t) => t.stop());
        live.current = null;
        setRecording(false);
        setElapsed(0);
        if (!cancelled && chunks.length) done.current(new Blob(chunks, { type: (mime || "audio/webm").split(";")[0] }), Math.max(1, Math.round((Date.now() - startedAt) / 1000)));
      };
      rec.start(1000);
      live.current = { stop: () => rec.state !== "inactive" && rec.stop(), cancel: () => { cancelled = true; if (rec.state !== "inactive") rec.stop(); } };
      setRecording(true);
    } catch {
      setError("We could not use your microphone. Check the browser's permission and try again.");
    }
  }, []);

  useEffect(() => () => live.current?.cancel(), []);
  return { recording, elapsed, error, start, stop: () => live.current?.stop(), cancel: () => live.current?.cancel() };
}
