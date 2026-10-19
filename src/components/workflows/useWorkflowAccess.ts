import { useAuth } from "../../context/AuthContext";

export function useWorkflowAccess() {
  const { activeWorkspace, isSuperAdmin } = useAuth();
  const role = activeWorkspace?.role as string | undefined;
  return { canWrite: isSuperAdmin || role === "owner" || role === "admin" };
}
