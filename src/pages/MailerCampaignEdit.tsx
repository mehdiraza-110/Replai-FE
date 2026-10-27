import { useCallback, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { useNavigate, useParams } from "react-router-dom";
import { ErrorBanner } from "../components/admin/AdminModal";
import { LoadingState } from "../components/ui/LoadingState";
import { campaignService } from "../services/api";
import type { CampaignDetail } from "../types";
import { MailerCampaignNew } from "./MailerCampaignNew";

/** Loads a saved campaign and hands it to the campaign wizard in edit mode. */
export function MailerCampaignEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<CampaignDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setCampaign(await campaignService.get(Number(id)));
      setError(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load this campaign");
    }
  }, [id]);

  useEffect(() => {
    setCampaign(null);
    void load();
  }, [load]);

  if (error && !campaign) {
    return (
      <div className="mx-auto max-w-[900px] space-y-4">
        <ErrorBanner message={error} onRetry={() => void load()} />
        <Button onPress={() => navigate("/mailer/campaigns")} size="sm" variant="secondary">Back to Campaigns</Button>
      </div>
    );
  }
  if (!campaign) return <LoadingState />;

  // The wizard keeps its own form state; only the lead counts are refreshed after leads are removed.
  return <MailerCampaignNew initial={campaign} onLeadsChanged={() => void load()} />;
}
