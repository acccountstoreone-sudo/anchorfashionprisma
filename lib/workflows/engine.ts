import { supabase } from "@/lib/supabase";
import { automationRules, WorkflowTrigger } from "./rules";

export interface WorkflowEvent {
  triggerEvent: WorkflowTrigger;
  payload: any;
}

export interface WorkflowExecutionLog {
  workflow_id: string;
  trigger_event: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  error_message?: string;
  execution_details?: any;
}

/**
 * Enterprise Workflow Automation Engine
 * Evaluates triggers and executes corresponding workflows.
 */
export async function executeWorkflows(event: WorkflowEvent) {
  const logs: WorkflowExecutionLog[] = [];

  try {
    // 1. Fetch active workflows matching the trigger
    const { data: workflows, error } = await supabase
      .from("ai_workflows")
      .select("*")
      .eq("trigger_event", event.triggerEvent)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching workflows:", error);
      throw error;
    }

    if (!workflows || workflows.length === 0) {
      console.warn(
        `No active workflows found for trigger: ${event.triggerEvent}`
      );
      return;
    }

    // 2. Map predefined rules for the trigger
    const ruleFns = automationRules[event.triggerEvent] || [];

    // 3. Execute all mapped actions
    for (const workflow of workflows) {
      for (const ruleFn of ruleFns) {
        try {
          const actionResult = await ruleFn(event.payload, workflow.config);

          logs.push({
            workflow_id: workflow.id,
            trigger_event: event.triggerEvent,
            status: "SUCCESS",
            execution_details: actionResult,
          });
        } catch (actionError: any) {
          console.error(`Workflow ${workflow.id} failed:`, actionError);
          logs.push({
            workflow_id: workflow.id,
            trigger_event: event.triggerEvent,
            status: "FAILED",
            error_message: actionError.message,
          });
        }
      }
    }

    // 4. Ideally, save the logs to an audit table here.
    // await supabase.from('workflow_logs').insert(logs);
  } catch (err) {
    console.error("Workflow Engine Error:", err);
    throw err;
  }
}
