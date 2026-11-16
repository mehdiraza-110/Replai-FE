import { useCallback, useEffect, useRef, useState } from "react";

export interface RecordingResult { blob: Blob; audioBlob: Blob | null; durationSeconds: number }
type Phase = "idle" | "starting" | "recording";

const VIDEO_TYPES = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm", "video/mp4"];
const AUDIO_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
const pick = (list: string[]) => list.find((t) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t));
const bitrateFor = (height: number) => (height >= 720 ? 1_800_000 : height >= 480 ? 1_000_000 : 600_000);

export const screenRecordingSupported = () => typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia) && typeof MediaRecorder !== "undefined" && Boolean(pick(VIDEO_TYPES));

/** Records the screen (the current tab is preferred) plus the microphone, mixed into one audio track. Stops by itself at `maxSeconds`. */
export function useScreenRecorder({ maxHeight, maxSeconds, onFinished }: { maxHeight: number; maxSeconds: number; onFinished: (result: RecordingResult) => void }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const live = useRef<{ stop: () => void } | null>(null);
  const finished = useRef(onFinished);
  finished.current = onFinished;

  const cleanupRef = useRef<() => void>(() => undefined);

  const start = useCallback(async () => {
    setError(null);
    setPhase("starting");
    const streams: MediaStream[] = [];
    let ctx: AudioContext | null = null;
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: { height: { ideal: maxHeight, max: maxHeight }, frameRate: { ideal: 15, max: 24 } },
        audio: false,
        // Chromium hint: offer this tab first.
        ...({ preferCurrentTab: true } as object),
      } as DisplayMediaStreamOptions);
      streams.push(display);

      let mic: MediaStream | null = null;
      try {
        mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        streams.push(mic);
      } catch { /* record without a voice */ }

      // Mix the microphone into one audio track through WebAudio, so the same track feeds the video and the audio-only copy.
      let audioTrack: MediaStreamTrack | null = null;
      if (mic) {
        ctx = new AudioContext();
        const dest = ctx.createMediaStreamDestination();
        ctx.createMediaStreamSource(mic).connect(dest);
        audioTrack = dest.stream.getAudioTracks()[0] ?? null;
      }

      const height = display.getVideoTracks()[0]?.getSettings().height ?? maxHeight;
      const videoMime = pick(VIDEO_TYPES)!;
      const combined = new MediaStream([...display.getVideoTracks(), ...(audioTrack ? [audioTrack] : [])]);
      const videoRec = new MediaRecorder(combined, { mimeType: videoMime, videoBitsPerSecond: bitrateFor(Math.min(height, maxHeight)), audioBitsPerSecond: 64_000 });
      const audioMime = pick(AUDIO_TYPES);
      const audioRec = audioTrack && audioMime ? new MediaRecorder(new MediaStream([audioTrack]), { mimeType: audioMime, audioBitsPerSecond: 48_000 }) : null;

      const videoChunks: Blob[] = [];
      const audioChunks: Blob[] = [];
      videoRec.ondataavailable = (e) => e.data.size && videoChunks.push(e.data);
      if (audioRec) audioRec.ondataavailable = (e) => e.data.size && audioChunks.push(e.data);

      const startedAt = Date.now();
      let stopped = false;
      const timer = window.setInterval(() => {
        const seconds = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(seconds);
        if (seconds >= maxSeconds) stop();
      }, 500);

      const release = () => {
        window.clearInterval(timer);
        streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
        void ctx?.close().catch(() => undefined);
        live.current = null;
        cleanupRef.current = () => undefined;
        setPhase("idle");
        setElapsed(0);
      };

      const stop = () => {
        if (stopped) return;
        stopped = true;
        if (audioRec && audioRec.state !== "inactive") audioRec.stop();
        if (videoRec.state !== "inactive") videoRec.stop(); else release();
      };

      videoRec.onstop = () => {
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const blob = new Blob(videoChunks, { type: videoMime.split(";")[0] });
        // Give the audio recorder a moment to flush its last chunk.
        window.setTimeout(() => {
          const audioBlob = audioChunks.length ? new Blob(audioChunks, { type: (audioMime || "audio/webm").split(";")[0] }) : null;
          release();
          if (blob.size) finished.current({ blob, audioBlob, durationSeconds });
          else setError("The recording came out empty. Please try again.");
        }, 150);
      };
      // The browser's own "Stop sharing" button ends the track.
      display.getVideoTracks()[0]?.addEventListener("ended", stop);

      videoRec.start(1000);
      audioRec?.start(1000);
      live.current = { stop };
      cleanupRef.current = () => { stopped = true; try { videoRec.state !== "inactive" && videoRec.stop(); } catch { /* already stopped */ } release(); };
      setPhase("recording");
    } catch (e) {
      streams.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      void ctx?.close().catch(() => undefined);
      setPhase("idle");
      const name = (e as DOMException)?.name;
      setError(name === "NotAllowedError" ? "Screen sharing was cancelled." : "We could not start the recording on this browser.");
    }
  }, [maxHeight, maxSeconds]);

  const stop = useCallback(() => live.current?.stop(), []);
  // Leaving the page must never leave the screen being captured.
  useEffect(() => () => cleanupRef.current(), []);

  return { phase, elapsed, error, start, stop };
}
