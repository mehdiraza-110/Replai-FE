import { Eye } from "lucide-react";
import { Button } from "@heroui/react";
import { useNavigate } from "react-router-dom";
import { useViewAs } from "../../hooks/useViewAs";
import { clearViewAs } from "../../utils/viewAs";

/** Non-dismissable notice shown while a super admin is acting inside another workspace. */
export function ViewAsBanner() {
  const viewAs = useViewAs();
  const navigate = useNavigate();

  if (!viewAs) return null;

  function handleExit() {
    clearViewAs();
    navigate("/admin/workspaces");
  }

  return (
    <div
      className="relative z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-warning px-4 py-2 text-warning-foreground sm:px-5 lg:ml-[212px]"
      role="status"
    >
      <p className="flex min-w-0 items-center gap-2 text-[13px] font-semibold leading-5">
        <Eye aria-hidden className="size-4 shrink-0" />
        <span className="min-w-0 break-words">
          Viewing {viewAs.name} as super admin. Changes you make here affect this workspace.
        </span>
      </p>
      <Button className="h-[28px] rounded-full px-3 text-[12px] font-semibold" size="sm" variant="secondary" onClick={handleExit}>
        Exit
      </Button>
    </div>
  );
}
