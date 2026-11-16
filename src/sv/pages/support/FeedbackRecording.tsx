import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { feedbackApi } from "../../api/feedback";
import { useSvTitle } from "../../layout/chrome";
import { formatLength } from "../../feedback/feedbackStatus";
import { Button, EmptyState, PageHeader, SkeletonCard } from "../../ui";

/** The permanent link put in the Asana task. It signs a fresh short-lived video URL on open, and only the reporter or the team can see it. */
export function FeedbackRecording() {
  useSvTitle([{ label: "Support" }, { label: "Recording" }]);
  const { id = "" } = useParams();
  const [info, setInfo] = useState<Awaited<ReturnType<typeof feedbackApi.recordingUrl>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    feedbackApi.recordingUrl(id).then(setInfo).catch((e) => setError(e instanceof Error ? e.message : "We could not load this recording."));
  }, [id]);

  async function download() {
    const fresh = await feedbackApi.recordingUrl(id, true).catch(() => null);
    if (fresh?.url) window.location.assign(fresh.url);
  }

  return (
    <div className="sv-page">
      <PageHeader title={info?.title ?? "Screen recording"} subtitle={info?.durationSeconds ? `Length ${formatLength(info.durationSeconds)}` : undefined} actions={info?.url ? <Button icon={Download} onClick={() => void download()}>Download</Button> : undefined} />
      {error ? <EmptyState title="Recording not available" body={error} /> : null}
      {!info && !error ? <SkeletonCard lines={6} /> : null}
      {info?.placeholder ? <EmptyState title="Dummy recording" body="This was recorded on a development build without storage, so there is no video to play." /> : null}
      {info?.url ? <video className="sv-fb-video is-large" src={info.url} controls preload="metadata" /> : null}
    </div>
  );
}
