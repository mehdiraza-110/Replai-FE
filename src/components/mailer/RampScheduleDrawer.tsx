import { useEffect, useState } from "react";
import { Button, Drawer, Spinner, Tabs } from "@heroui/react";
import { OctagonX, RotateCcw, Sparkles, TriangleAlert, X } from "lucide-react";
import { warmupService } from "../../services/api";
import type { AiRampSchedule, Domain, WarmupSafetyTier, WarmupTarget } from "../../types";

type Mode = "manual" | "ai";

const DEFAULT_SAFETY_TIERS: WarmupSafetyTier[] = [
  { key: "wrong", label: "Something goes wrong", description: "Bounce or complaint rate creeps above threshold.", action: "decrement", amount: 5 },
  { key: "very-wrong", label: "Something goes very wrong", description: "Bounce or complaint rate spikes sharply.", action: "decrement", amount: 10 },
  { key: "extremely-wrong", label: "Something goes extremely wrong", description: "Blacklist hit or sustained high complaint rate.", action: "stop", amount: 0 },
];

export function RampScheduleDrawer({
  isOpen,
  onClose,
  onApply,
  domains,
  totalMailboxes,
}: {
  isOpen: boolean;
  onClose: () => void;
  onApply: (summary: string) => void;
  domains: Domain[];
  totalMailboxes: number;
}) {
  const [mode, setMode] = useState<Mode>("manual");
  const [applyTarget, setApplyTarget] = useState("all");
  const [startLimit, setStartLimit] = useState(5);
  const [incrementPerStage, setIncrementPerStage] = useState(5);
  const [stageDurationDays, setStageDurationDays] = useState(7);
  const [steadyStateLimit, setSteadyStateLimit] = useState(40);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiSchedule, setAiSchedule] = useState<AiRampSchedule | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [safetyTiers, setSafetyTiers] = useState<WarmupSafetyTier[]>(DEFAULT_SAFETY_TIERS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setAiSchedule(null);
    setAiError(null);
    setSubmitError(null);
  }, [isOpen]);

  function updateSafetyTier(key: string, patch: Partial<WarmupSafetyTier>) {
    setSafetyTiers((tiers) => tiers.map((tier) => (tier.key === key ? { ...tier, ...patch } : tier)));
  }

  function buildTarget(): WarmupTarget {
    return applyTarget === "all" ? { all: true } : { domain: applyTarget };
  }

  async function generateWithAi() {
    setIsGenerating(true);
    setAiSchedule(null);
    setAiError(null);
    try {
      const schedule = await warmupService.generateAiSchedule(applyTarget === "all" ? {} : { domain: applyTarget });
      setAiSchedule(schedule);
    } catch (requestError) {
      setAiError(requestError instanceof Error ? requestError.message : "Unable to generate AI ramp schedule");
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleApplyManual() {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const tierSummary = safetyTiers
        .map((tier) => (tier.action === "stop" ? `${tier.label} → stop` : `${tier.label} → −${tier.amount}/day`))
        .join("; ");
      const result = await warmupService.createStrategy({
        name: `Custom Ramp (${new Date().toLocaleDateString()})`,
        description: `Starts at ${startLimit}/day, +${incrementPerStage}/day every ${stageDurationDays} days, steady state ${steadyStateLimit}/day.`,
        startDailyLimit: startLimit,
        steadyStateDailyLimit: steadyStateLimit,
        incrementPerStage,
        stageDurationDays,
        safetyTiers,
        applyTo: buildTarget(),
      });
      onApply(`Custom ramp applied to ${result.assignedCount} mailbox${result.assignedCount === 1 ? "" : "es"}: ${startLimit} → ${steadyStateLimit}/day, +${incrementPerStage}/day every ${stageDurationDays} days. Safety: ${tierSummary}.`);
    } catch (requestError) {
      setSubmitError(requestError instanceof Error ? requestError.message : "Unable to apply ramp schedule");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleApproveAi() {
    if (!aiSchedule) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const label = applyTarget === "all" ? "all mailboxes" : applyTarget;
      const result = await warmupService.createStrategy({
        name: `AI-Tuned Ramp (${label})`,
        description: aiSchedule.rationale || undefined,
        startDailyLimit: aiSchedule.startDailyLimit,
        steadyStateDailyLimit: aiSchedule.steadyStateDailyLimit,
        incrementPerStage: aiSchedule.incrementPerStage,
        stageDurationDays: aiSchedule.stageDurationDays,
        safetyTiers,
        isAiGenerated: true,
        aiRationale: aiSchedule.rationale,
        applyTo: buildTarget(),
      });
      onApply(`AI-generated ramp schedule applied to ${result.assignedCount} mailbox${result.assignedCount === 1 ? "" : "es"}.`);
    } catch (requestError) {
      setSubmitError(requestError instanceof Error ? requestError.message : "Unable to apply AI ramp schedule");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer.Root isOpen={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <Drawer.Backdrop>
        <Drawer.Content placement="right">
          <Drawer.Dialog className="flex h-full max-w-[92vw] flex-col" style={{ width: "65vw", minWidth: "560px" }}>
            <Drawer.Header className="flex items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
              <Drawer.Heading className="text-[14px] font-semibold text-foreground">Ramp Schedule</Drawer.Heading>
              <Drawer.CloseTrigger className="grid size-8 place-items-center rounded-full text-muted transition hover:bg-surface-secondary hover:text-foreground">
                <X className="size-4" />
              </Drawer.CloseTrigger>
            </Drawer.Header>

            <Drawer.Body className="flex-1 overflow-y-auto p-0">
              <div className="border-b border-border/70 px-5 pt-3">
                <Tabs selectedKey={mode} onSelectionChange={(key) => setMode(String(key) as Mode)}>
                  <Tabs.ListContainer>
                    <Tabs.List aria-label="Ramp schedule mode">
                      <Tabs.Tab id="manual"><span className="whitespace-nowrap">Set Manually</span><Tabs.Indicator /></Tabs.Tab>
                      <Tabs.Tab id="ai"><span className="whitespace-nowrap">Generate with AI</span><Tabs.Indicator /></Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>
                </Tabs>
              </div>

              <div className="space-y-5 p-5">
                <label className="grid gap-1.5 text-sm font-medium text-foreground">
                  Apply to
                  <select
                    className="agent-field h-10 w-full px-3 text-sm text-foreground outline-none"
                    onChange={(event) => setApplyTarget(event.target.value)}
                    value={applyTarget}
                  >
                    <option value="all">All mailboxes ({totalMailboxes})</option>
                    {domains.map((domain) => (
                      <option key={domain.domain} value={domain.domain}>
                        {domain.domain} ({domain.mailboxCount ?? 0} mailboxes)
                      </option>
                    ))}
                  </select>
                </label>

                {mode === "manual" ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <NumberField label="Start daily limit" onChange={setStartLimit} suffix="/day" value={startLimit} />
                      <NumberField label="Steady-state daily limit" onChange={setSteadyStateLimit} suffix="/day" value={steadyStateLimit} />
                      <NumberField label="Increment per stage" onChange={setIncrementPerStage} suffix="/day" value={incrementPerStage} />
                      <NumberField label="Stage duration" onChange={setStageDurationDays} suffix=" days" value={stageDurationDays} />
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-surface-secondary/60 p-3">
                      <p className="text-[11px] font-semibold text-muted">Preview</p>
                      <p className="mt-1 text-[13px] text-foreground">
                        Starts at <strong>{startLimit}/day</strong>, increases by <strong>{incrementPerStage}/day</strong> every <strong>{stageDurationDays} days</strong>, until it reaches a steady state of <strong>{steadyStateLimit}/day</strong>.
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-foreground">If deliverability degrades</p>
                      <p className="mt-0.5 text-[12px] text-muted">Applies throughout the ramp and at steady state — each tier can either pull the daily limit back or stop sending entirely until reviewed. Checked once daily against this domain's real bounce/complaint rate.</p>
                      <div className="mt-3 space-y-2.5">
                        {safetyTiers.map((tier) => (
                          <SafetyTierRow key={tier.key} onChange={(patch) => updateSafetyTier(tier.key, patch)} tier={tier} />
                        ))}
                      </div>
                    </div>

                    {submitError ? <p className="text-[12px] font-medium text-danger">{submitError}</p> : null}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-surface-secondary/60 p-4">
                      <div>
                        <p className="text-[13px] font-semibold text-foreground">AI-tuned ramp</p>
                        <p className="mt-0.5 text-[11px] text-muted">Based on this domain's real bounce/complaint history from the last 14 days, capped at sane ceilings.</p>
                      </div>
                      <Button isDisabled={isGenerating} onPress={generateWithAi} size="sm">
                        {isGenerating ? <Spinner color="current" size="sm" /> : <Sparkles className="size-4" />}
                        {aiSchedule ? "Regenerate" : "Generate"}
                      </Button>
                    </div>

                    {isGenerating ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-muted">
                        <Spinner color="accent" size="lg" />
                        <p className="text-[12px]">Analyzing domain history…</p>
                      </div>
                    ) : aiError ? (
                      <div className="rounded-2xl border border-danger/20 bg-danger/10 p-4 text-center text-[12px] text-danger">{aiError}</div>
                    ) : aiSchedule ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                          {aiSchedule.weeklySchedule.map((stage) => (
                            <div className="rounded-2xl border border-border/70 bg-surface-secondary/60 p-3" key={stage.label}>
                              <p className="text-[11px] font-semibold text-muted">{stage.label}</p>
                              <p className="mt-1 text-[13px] font-semibold text-foreground">{stage.range}</p>
                            </div>
                          ))}
                        </div>
                        {aiSchedule.rationale ? (
                          <p className="rounded-2xl border border-border/70 bg-surface-secondary/60 p-3 text-[12px] leading-5 text-muted">{aiSchedule.rationale}</p>
                        ) : null}
                        {submitError ? <p className="text-[12px] font-medium text-danger">{submitError}</p> : null}
                      </>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-[12px] text-muted">
                        Click Generate to have AI propose a ramp schedule for review.
                      </div>
                    )}
                  </>
                )}
              </div>
            </Drawer.Body>

            <Drawer.Footer className="justify-between border-t border-border/70 px-5 py-4">
              <Button isDisabled={isSubmitting} onPress={onClose} size="sm" variant="secondary">
                <RotateCcw className="size-4" />
                Cancel
              </Button>
              {mode === "manual" ? (
                <Button isDisabled={isSubmitting} onPress={handleApplyManual} size="sm">
                  {isSubmitting ? <Spinner color="current" size="sm" /> : null}
                  Apply Schedule
                </Button>
              ) : (
                <Button isDisabled={!aiSchedule || isSubmitting} onPress={handleApproveAi} size="sm">
                  {isSubmitting ? <Spinner color="current" size="sm" /> : null}
                  Approve &amp; Apply
                </Button>
              )}
            </Drawer.Footer>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </Drawer.Root>
  );
}

function SafetyTierRow({
  tier,
  onChange,
}: {
  tier: WarmupSafetyTier;
  onChange: (patch: Partial<WarmupSafetyTier>) => void;
}) {
  const Icon = tier.key === "extremely-wrong" ? OctagonX : TriangleAlert;

  return (
    <div className="rounded-2xl border border-border/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon className={`mt-0.5 size-4 shrink-0 ${tier.key === "extremely-wrong" ? "text-danger" : "text-warning"}`} />
          <div>
            <p className="text-[13px] font-medium text-foreground">{tier.label}</p>
            <p className="text-[11px] text-muted">{tier.description}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="flex rounded-xl border border-border bg-surface-secondary p-0.5">
            <button
              className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition ${tier.action === "decrement" ? "bg-surface text-foreground shadow-sm" : "text-muted"}`}
              onClick={() => onChange({ action: "decrement" })}
              type="button"
            >
              Decrement
            </button>
            <button
              className={`rounded-[10px] px-3 py-1.5 text-[12px] font-medium transition ${tier.action === "stop" ? "bg-surface text-foreground shadow-sm" : "text-muted"}`}
              onClick={() => onChange({ action: "stop" })}
              type="button"
            >
              Stop
            </button>
          </div>

          {tier.action === "decrement" ? (
            <div className="relative w-[100px]">
              <input
                className="h-9 w-full rounded-xl border border-border bg-surface-secondary pl-3 pr-11 text-sm outline-none transition focus:border-accent"
                min={0}
                onChange={(event) => onChange({ amount: Number(event.target.value) || 0 })}
                type="number"
                value={tier.amount}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">/day</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-foreground">
      {label}
      <div className="relative">
        <input
          className="h-10 w-full rounded-xl border border-border bg-surface-secondary px-3 text-sm outline-none transition focus:border-accent"
          min={0}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          type="number"
          value={value}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-muted">{suffix}</span>
      </div>
    </label>
  );
}
