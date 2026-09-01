import { useEffect, useState } from "react";
import { Button, Card, Modal, useOverlayState } from "@heroui/react";
import { Pause, Pencil, Play, Plus, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { LoadingState } from "../components/ui/LoadingState";
import { StatusPill } from "../components/ui/StatusPill";
import { aiAgentService } from "../services/api";
import type { Agent } from "../types";

export function AIAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const detailsModal = useOverlayState({});
  const deleteModal = useOverlayState({});

  useEffect(() => {
    let isActive = true;

    aiAgentService
      .list()
      .then((items) => {
        if (!isActive) return;
        setAgents(items);
        setError(null);
      })
      .catch((requestError: Error) => {
        if (!isActive) return;
        setError(requestError.message || "Unable to load AI agents");
      })
      .finally(() => {
        if (isActive) setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function toggleStatus(agent: Agent) {
    if (!agent.id) return;

    const nextStatus = agent.status === "Active" ? "Paused" : "Active";
    const previousAgents = agents;
    setAgents((current) => current.map((item) => (item.id === agent.id ? { ...item, status: nextStatus } : item)));

    try {
      await aiAgentService.update(agent.id, { status: nextStatus });
    } catch (requestError) {
      setAgents(previousAgents);
      setError(requestError instanceof Error ? requestError.message : "Unable to update AI agent");
    }
  }

  function openAgent(agent: Agent) {
    setSelectedAgent(agent);
    detailsModal.open();
  }

  function requestDelete(agent: Agent) {
    if (!agent.id) return;

    setDeleteTarget(agent);
    deleteModal.open();
  }

  async function confirmDelete() {
    if (!deleteTarget?.id) return;

    try {
      setIsDeleting(true);
      await aiAgentService.delete(deleteTarget.id);
      setAgents((current) => current.filter((item) => item.id !== deleteTarget.id));
      deleteModal.close();
      setDeleteTarget(null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete AI agent");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[1400px] space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">{agents.length} configured agents</p>
          {error ? <p className="mt-1 text-sm font-medium text-danger">{error}</p> : null}
        </div>
        <Link to="/agents/new">
          <Button><Plus className="size-4" />Create Agent</Button>
        </Link>
      </div>
      <Card className="apple-shadow border border-border/70 bg-surface">
        <Card.Header>
          <Card.Title>AI agent control center</Card.Title>
          <Card.Description>Activation state, assigned inbox, automation, and model settings.</Card.Description>
        </Card.Header>
        <Card.Content className="overflow-x-auto p-0">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="border-y border-border/70 text-xs text-muted">
              <tr>
                {["Agent Name", "Purpose", "Model", "Status", "Inbox", "Auto Reply", "Last Updated", "Actions"].map((header) => (
                  <th className="px-4 py-3 font-medium" key={header}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td className="px-4 py-4" colSpan={8}>
                    <LoadingState />
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-sm font-medium text-muted" colSpan={8}>
                    No AI agents yet. Create one to start configuring reply automation.
                  </td>
                </tr>
              ) : agents.map((agent) => (
                <tr className="border-b border-border/60 last:border-0" key={agent.id ?? agent.name}>
                  <td className="px-4 py-4 font-semibold text-foreground">{agent.name}</td>
                  <td className="px-4 py-4 text-foreground">{agent.purpose}</td>
                  <td className="px-4 py-4 text-muted">{agent.model}</td>
                  <td className="px-4 py-4"><StatusPill tone={agent.status === "Active" ? "success" : "warning"}>{agent.status}</StatusPill></td>
                  <td className="px-4 py-4 text-muted">{agent.inbox}</td>
                  <td className="px-4 py-4"><StatusPill tone={agent.autoReply ? "accent" : "default"}>{agent.autoReply ? "Enabled" : "Disabled"}</StatusPill></td>
                  <td className="px-4 py-4 text-muted">{agent.updated}</td>
                  <td className="px-4 py-4">
                    <div className="flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => openAgent(agent)}>Open</Button>
                      <Link to={`/agents/${agent.id}/edit`}>
                        <Button isDisabled={!agent.id} size="sm" variant="secondary">
                          <Pencil className="size-4" />
                          Edit
                        </Button>
                      </Link>
                      <Button isDisabled={!agent.id} size="sm" variant="secondary" aria-label={agent.status === "Active" ? "Pause" : "Activate"} onClick={() => toggleStatus(agent)}>
                        {agent.status === "Active" ? <Pause className="size-4" /> : <Play className="size-4" />}
                      </Button>
                      <Button isDisabled={!agent.id} size="sm" variant="danger" aria-label="Delete" onClick={() => requestDelete(agent)}><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card.Content>
      </Card>

    </div>
      <AgentDetailsModal agent={selectedAgent} state={detailsModal} />
      <DeleteAgentModal agent={deleteTarget} isDeleting={isDeleting} state={deleteModal} onConfirm={confirmDelete} />
    </>
  );
}

function AgentDetailsModal({ agent, state }: { agent: Agent | null; state: ReturnType<typeof useOverlayState> }) {
  return (
    <Modal state={state}>
      <Modal.Backdrop className="bg-foreground/30 backdrop-blur-[2px]">
        <Modal.Container className="w-[min(720px,calc(100vw-32px))]" placement="center" scroll="inside" size="lg">
          <Modal.Dialog className="overflow-hidden rounded-[20px] border border-border/70 bg-surface shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]">
            <Modal.Header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
              <div>
                <Modal.Heading className="text-base font-semibold leading-6 text-foreground">{agent?.name || "AI Agent"}</Modal.Heading>
                <p className="mt-1 text-[13px] leading-5 text-muted">Agent behavior, model, and automation configuration.</p>
              </div>
              <Modal.CloseTrigger className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground transition hover:bg-default-200" aria-label="Close">
                <X className="size-4" />
              </Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="thin-scrollbar max-h-[72vh] overflow-y-auto px-5 py-5">
              {agent ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailField label="Role" value={agent.role} />
                  <DetailField label="Status" value={agent.status} />
                  <DetailField label="Objective" value={agent.objective} />
                  <DetailField label="Language" value={agent.language} />
                  <DetailField label="Model" value={agent.model} />
                  <DetailField label="Automation" value={agent.automationMode} />
                  <DetailField label="Confidence Gate" value={agent.confidenceThreshold ? `${agent.confidenceThreshold}%` : undefined} />
                  <DetailField label="Low Confidence" value={agent.humanReview ? "Human Review" : "Draft only"} />
                  <DetailField className="md:col-span-2" label="Description" value={agent.description || agent.purpose} />
                  <DetailField className="md:col-span-2" label="Persona" value={agent.persona} />
                  <DetailField className="md:col-span-2" label="Response Rules" value={agent.responseRules} />
                </div>
              ) : null}
            </Modal.Body>

            <Modal.Footer className="flex justify-end gap-2 border-t border-border/70 px-5 py-4">
              {agent?.id ? (
                <Link to={`/agents/${agent.id}/edit`}>
                  <Button size="sm">
                    <Pencil className="size-4" />
                    Edit Agent
                  </Button>
                </Link>
              ) : null}
              <Button size="sm" variant="secondary" onClick={state.close}>Close</Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function DeleteAgentModal({
  agent,
  isDeleting,
  onConfirm,
  state,
}: {
  agent: Agent | null;
  isDeleting: boolean;
  onConfirm: () => void;
  state: ReturnType<typeof useOverlayState>;
}) {
  return (
    <Modal state={state}>
      <Modal.Backdrop className="bg-foreground/30 backdrop-blur-[2px]">
        <Modal.Container className="w-[min(440px,calc(100vw-32px))]" placement="center" scroll="inside" size="md">
          <Modal.Dialog className="overflow-hidden rounded-[20px] border border-border/70 bg-surface shadow-[0_8px_30px_color-mix(in_oklch,var(--foreground)_18%,transparent)]">
            <Modal.Header className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4">
              <div>
                <Modal.Heading className="text-base font-semibold leading-6 text-foreground">Delete AI agent?</Modal.Heading>
                <p className="mt-1 text-[13px] leading-5 text-muted">This removes the agent from active configuration lists.</p>
              </div>
              <Modal.CloseTrigger className="grid size-8 shrink-0 place-items-center rounded-full bg-default-100 text-foreground transition hover:bg-default-200" aria-label="Close">
                <X className="size-4" />
              </Modal.CloseTrigger>
            </Modal.Header>

            <Modal.Body className="px-5 py-5">
              <p className="text-sm leading-6 text-foreground">
                Delete <span className="font-semibold">{agent?.name || "this agent"}</span>? Existing logs stay intact, but the agent will no longer be available for assignment or automation.
              </p>
            </Modal.Body>

            <Modal.Footer className="flex flex-wrap justify-end gap-2 border-t border-border/70 px-5 py-4">
              <Button isDisabled={isDeleting} size="sm" variant="secondary" onClick={state.close}>Cancel</Button>
              <Button isDisabled={isDeleting} size="sm" variant="danger" onClick={onConfirm}>
                <Trash2 className="size-4" />
                {isDeleting ? "Deleting..." : "Delete Agent"}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function DetailField({ className = "", label, value }: { className?: string; label: string; value?: string | number | null }) {
  return (
    <div className={`${className} rounded-xl bg-surface-secondary px-3 py-2`}>
      <p className="text-[11px] font-medium text-muted">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm font-semibold leading-5 text-foreground">{value || "Not set"}</p>
    </div>
  );
}
