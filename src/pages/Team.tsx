import { useCallback, useEffect, useState } from "react";
import { Button, Card, useOverlayState } from "@heroui/react";
import { AlertTriangle, RefreshCw, UserPlus, Users } from "lucide-react";
import { AddMemberModal, EditMemberModal, RemoveMemberModal } from "../components/team/MemberModals";
import { MembersTable } from "../components/team/MembersTable";
import { TeamHeader } from "../components/team/TeamHeader";
import { Skeleton } from "../components/ui/Skeleton";
import { teamApi } from "../services/teamApi";
import type { Member, WorkspaceDetail } from "../services/teamApi";

export function Team() {
  const [workspace, setWorkspace] = useState<WorkspaceDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const addModal = useOverlayState({});
  const editModal = useOverlayState({});
  const removeModal = useOverlayState({});

  const load = useCallback(async (showSkeleton = true) => {
    if (showSkeleton) setIsLoading(true);
    setError(null);
    try {
      const [workspaceData, memberData] = await Promise.all([teamApi.getWorkspace(), teamApi.listMembers()]);
      setWorkspace(workspaceData);
      setMembers(memberData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load your team.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !workspace) {
    return (
      <Card className="mx-auto max-w-[640px] border border-border/70 bg-surface">
        <Card.Content className="flex flex-col items-center gap-3 py-10 text-center">
          <AlertTriangle className="size-8 text-danger" />
          <p className="text-sm font-medium text-foreground">{error}</p>
          <Button size="sm" variant="secondary" onClick={() => void load()}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </Card.Content>
      </Card>
    );
  }

  if (!workspace) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-5">
        <Card className="border border-border/70 bg-surface">
          <Card.Content className="space-y-3">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-72" />
            <Skeleton className="h-12 w-full" />
          </Card.Content>
        </Card>
        <Card className="border border-border/70 bg-surface">
          <Card.Content className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => <Skeleton className="h-10 w-full" key={index} />)}
          </Card.Content>
        </Card>
      </div>
    );
  }

  const canManage = workspace.role !== "member";

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <TeamHeader onRenamed={setWorkspace} workspace={workspace} />

      <Card className="apple-shadow overflow-hidden border border-border/70 bg-surface p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Members</h2>
            <p className="text-[13px] text-muted">
              {isLoading ? "Loading..." : `${members.length} ${members.length === 1 ? "person has" : "people have"} access to this workspace.`}
              {!canManage ? " You can view the team but not change it." : ""}
            </p>
          </div>
          {canManage ? (
            <Button size="sm" onClick={addModal.open}>
              <UserPlus className="size-4" />
              Add member
            </Button>
          ) : null}
        </div>

        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
            {error}
            <Button size="sm" variant="secondary" onClick={() => void load(false)}>Retry</Button>
          </div>
        ) : null}

        {!isLoading && members.length === 0 && !error ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Users className="size-8 text-muted" />
            <p className="text-sm font-medium text-foreground">No members yet</p>
            <p className="text-[13px] text-muted">{canManage ? "Add the first teammate to share this workspace." : "Members will appear here once they are added."}</p>
          </div>
        ) : (
          <MembersTable
            isLoading={isLoading}
            members={members}
            onEdit={(member) => {
              setEditTarget(member);
              editModal.open();
            }}
            onRemove={(member) => {
              setRemoveTarget(member);
              removeModal.open();
            }}
            workspace={workspace}
          />
        )}
      </Card>

      {canManage ? (
        <>
          <AddMemberModal onAdded={() => void load(false)} state={addModal} workspace={workspace} />
          <EditMemberModal member={editTarget} onSaved={() => void load(false)} state={editModal} workspace={workspace} />
          <RemoveMemberModal member={removeTarget} onRemoved={() => void load(false)} state={removeModal} />
        </>
      ) : null}
    </div>
  );
}
