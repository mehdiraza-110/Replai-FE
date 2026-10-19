import { createContext, useContext } from "react";
import type { WorkflowMeta } from "../../services/workflowApi";

export const WorkflowMetaContext = createContext<WorkflowMeta | null>(null);
export const useWorkflowMeta = () => useContext(WorkflowMetaContext);
