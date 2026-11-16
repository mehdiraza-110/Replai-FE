import { useEffect, useState } from "react";
import { CheckCircle2, LifeBuoy, Loader2, Mic, MonitorPlay, PenLine, Square } from "lucide-react";
import { Link } from "react-router-dom";
import { feedbackApi, type WidgetConfig } from "../api/feedback";
import { svPath } from "../nav";
import { Button, Field, Modal } from "../ui";
import { RecordingAnnotator } from "./RecordingAnnotator";
import { formatLength } from "./feedbackStatus";
import { type RecordingResult, screenRecordingSupported, useScreenRecorder } from "./useScreenRecorder";
import { useDraggable } from "./useDraggable";
import { useVoiceRecorder, voiceRecordingSupported } from "./useVoiceRecorder";

type Step = "closed" | "choose" | "screen" | "voice" | "details" | "submitted";

// Used until /feedback/config answers; in a dev build the video option stays on even without storage.
const FALLBACK: WidgetConfig = { maxHeight: 720, maxDurationSeconds: 300, transcription: true, recordingAvailable: true };

/** The floating "Ticket" button on every page: write a message, record a voice message, or record the screen with voice. */
export function FeedbackWidget() {
  const [step, setStep] = useState<Step>("closed");
  const [config, setConfig] = useState<WidgetConfig>(FALLBACK);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [video, setVideo] = useState<RecordingResult | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // "Transcribing…" while the voice is being turned into text
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<number | null>(null);
  const bar = useDraggable();

  useEffect(() => {
    let live = true;
    feedbackApi.config().then((c) => live && setConfig(c)).catch(() => undefined);
    return () => { live = false; };
  }, []);

  // The preview URL is created once per recording and revoked when it goes away.
  useEffect(() => {
    if (!video) { setVideoUrl(null); return; }
    const url = URL.createObjectURL(video.blob);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  const screen = useScreenRecorder({
    maxHeight: config.maxHeight,
    maxSeconds: config.maxDurationSeconds,
    onFinished: (result) => { setVideo(result); setStep("details"); bar.reset(); },
  });
  const voice = useVoiceRecorder(async (audio) => {
    setBusy("Turning your voice into text…");
    setError(null);
    try {
      const { text } = await feedbackApi.transcribe(audio);
      setDescription((d) => [d, text].filter(Boolean).join(d ? "\n\n" : ""));
      if (!text) setError("We could not hear anything. You can type your message instead.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not transcribe that. You can type your message instead.");
    } finally { setBusy(null); setStep("details"); }
  });

  const canVideo = config.recordingAvailable && screenRecordingSupported();
  const canVoice = config.transcription && voiceRecordingSupported();

  function reset() {
    setStep("closed"); setTitle(""); setDescription(""); setVideo(null); setError(null); setProgress(null); setSubmitting(false); setBusy(null);
  }

  async function submit() {
    if (submitting) return;
    if (!title.trim()) return setError("Give your ticket a title.");
    if (!description.trim() && !video) return setError("Describe the problem, or record it.");
    setError(null);
    setSubmitting(true);
    let ticket;
    try {
      // 1. The ticket exists from here on: it is never lost, whatever happens to the extras below.
      ticket = await feedbackApi.create({ issueName: title.trim(), description: description.trim(), pageUrl: window.location.href, durationSeconds: video?.durationSeconds });
    } catch (e) {
      setError(e instanceof Error ? e.message : "We could not send your ticket. Please try again.");
      setSubmitting(false);
      return;
    }
    try {
      if (video) {
        await feedbackApi.uploadRecording(ticket.id, video.blob, setProgress); // 2. stream the video
        if (video.audioBlob) await feedbackApi.uploadTranscript(ticket.id, video.audioBlob).catch(() => undefined); // 3. transcript, failure swallowed
      }
    } catch (e) {
      console.error("Ticket recording upload failed", e);
    }
    await feedbackApi.createAsanaTask(ticket.id).catch((e) => console.error("Ticket Asana task failed", e)); // 4. quiet
    window.dispatchEvent(new Event("feedback-submitted")); // 5. lists refresh
    window.dispatchEvent(new Event("feedback-unread-changed"));
    setTicketNumber(ticket.ticketNumber);
    setSubmitting(false);
    setStep("submitted");
  }

  const recording = step === "screen" && screen.phase === "recording";

  return (
    <>
      {step === "closed" ? (
        <button type="button" className="sv-fb-fab" onClick={() => setStep("choose")} aria-label="Send a ticket to the support team">
          <LifeBuoy className="sv-icon" aria-hidden />
          Ticket
        </button>
      ) : null}

      <Modal open={step === "choose"} title="How would you like to report it?" onClose={reset}>
        <div className="sv-fb-choices">
          <button type="button" className="sv-fb-choice" onClick={() => setStep("details")}>
            <PenLine className="sv-icon" aria-hidden /><span><strong>Write a message</strong><em>A title and a description</em></span>
          </button>
          {canVoice ? (
            <button type="button" className="sv-fb-choice" onClick={() => { setStep("voice"); void voice.start(); }}>
              <Mic className="sv-icon" aria-hidden /><span><strong>Record a voice message</strong><em>We turn it into text you can edit</em></span>
            </button>
          ) : null}
          {canVideo ? (
            <button type="button" className="sv-fb-choice" onClick={() => { setStep("screen"); void screen.start(); }}>
              <MonitorPlay className="sv-icon" aria-hidden /><span><strong>Record your screen and voice</strong><em>Up to {Math.round(config.maxDurationSeconds / 60)} min, {config.maxHeight}p</em></span>
            </button>
          ) : null}
        </div>
        <Link to={svPath("my-tickets")} className="sv-hint" onClick={reset}>See my tickets</Link>
      </Modal>

      {step === "voice" ? (
        <Modal open title="Recording your message" onClose={() => { voice.cancel(); reset(); }} footer={<><Button onClick={() => { voice.cancel(); reset(); }}>Cancel</Button><Button variant="primary" icon={Square} disabled={!voice.recording} onClick={() => voice.stop()}>Done</Button></>}>
          {busy ? <p className="sv-fb-rec"><Loader2 className="sv-icon sv-fb-spin" aria-hidden />{busy}</p> : <p className="sv-fb-rec"><span className="sv-fb-rec-dot" />Recording… {formatLength(voice.elapsed)}</p>}
          {voice.error ? <p className="sv-fb-error" role="alert">{voice.error}</p> : null}
          <p className="sv-hint">Speak clearly and say what you expected to happen. Up to 10 minutes.</p>
        </Modal>
      ) : null}

      {step === "screen" && screen.phase !== "recording" ? (
        <Modal open title="Starting the recording" onClose={() => { reset(); }} footer={<Button onClick={reset}>Cancel</Button>}>
          {screen.error ? <p className="sv-fb-error" role="alert">{screen.error}</p> : <p className="sv-fb-rec"><Loader2 className="sv-icon sv-fb-spin" aria-hidden />Choose what to share in your browser…</p>}
          {screen.error ? <Button onClick={() => void screen.start()}>Try again</Button> : null}
        </Modal>
      ) : null}

      {recording ? (
        <>
          <RecordingAnnotator />
          <div className="sv-fb-bar" style={bar.style} role="region" aria-label="Recording controls">
            <span className="sv-fb-grip" title="Drag to move" {...bar.handle}>⋮⋮</span>
            <span className="sv-fb-rec-dot" />
            <span className="sv-fb-time">{formatLength(screen.elapsed)} / {formatLength(config.maxDurationSeconds)}</span>
            <Button variant="danger" size="sm" icon={Square} onClick={screen.stop}>Stop</Button>
          </div>
        </>
      ) : null}

      <Modal
        open={step === "details"}
        title="Describe the problem"
        onClose={() => { if (!submitting) reset(); }}
        footer={<><Button disabled={submitting} onClick={reset}>Cancel</Button><Button variant="primary" disabled={submitting} onClick={() => void submit()}>{submitting ? (progress !== null ? `Uploading ${progress}%` : "Sending…") : "Submit ticket"}</Button></>}
      >
        <Field label="Title" htmlFor="sv-fb-title"><input id="sv-fb-title" className="sv-input" value={title} maxLength={200} placeholder="What went wrong?" onChange={(e) => setTitle(e.target.value)} disabled={submitting} autoFocus /></Field>
        <Field label={video ? "Description (optional)" : "Description"} htmlFor="sv-fb-desc">
          <textarea id="sv-fb-desc" className="sv-textarea" rows={5} value={description} maxLength={5000} placeholder="What happened, and what did you expect?" onChange={(e) => setDescription(e.target.value)} disabled={submitting} />
        </Field>
        {videoUrl ? <video className="sv-fb-video" src={videoUrl} controls preload="metadata" /> : null}
        {error ? <p className="sv-fb-error" role="alert">{error}</p> : null}
        <p className="sv-hint">We attach the page you are on ({window.location.pathname}).</p>
      </Modal>

      <Modal open={step === "submitted"} title="Ticket submitted" onClose={reset} footer={<><Link to={svPath("my-tickets")} className="sv-btn" onClick={reset}>View my tickets</Link><Button variant="primary" onClick={reset}>Done</Button></>}>
        <p className="sv-fb-rec"><CheckCircle2 className="sv-icon" aria-hidden />Thanks! We received ticket #{ticketNumber}. We will reply here as soon as we have an update.</p>
      </Modal>

    </>
  );
}
