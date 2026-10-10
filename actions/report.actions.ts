"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ReportRepository } from "@/repositories/report.repository";
import {
  CustomReportConfigSchema,
  CustomReportConfigInput,
  ReportQueryRequestSchema,
  ReportQueryRequestInput,
} from "@/schemas/report.schema";
import { CustomReportConfig, ReportQueryResult } from "@/types/report.types";

const reportRepository = new ReportRepository();

export async function getSavedReportsAction(): Promise<{
  success: boolean;
  data?: CustomReportConfig[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const reports = await reportRepository.getSavedReports(user?.id);
    return { success: true, data: reports };
  } catch (err: any) {
    console.error("[getSavedReportsAction] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to load saved reports",
    };
  }
}

export async function getSavedReportByIdAction(
  id: string
): Promise<{
  success: boolean;
  data?: CustomReportConfig | null;
  error?: string;
}> {
  try {
    if (!id) return { success: false, error: "Report ID is required" };
    const report = await reportRepository.getReportById(id);
    return { success: true, data: report };
  } catch (err: any) {
    console.error("[getSavedReportByIdAction] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to load report",
    };
  }
}

export async function saveReportAction(
  input: CustomReportConfigInput
): Promise<{
  success: boolean;
  data?: CustomReportConfig;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Validate config with Zod
    const validated = CustomReportConfigSchema.parse(input);

    const saved = await reportRepository.saveReport(validated, user?.id);

    revalidatePath("/admin/reports/builder");
    revalidatePath("/admin/reports");
    return { success: true, data: saved };
  } catch (err: any) {
    console.error("[saveReportAction] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to save report configuration",
    };
  }
}

export async function deleteReportAction(
  id: string
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    if (!id) return { success: false, error: "Report ID is required" };

    await reportRepository.deleteReport(id);

    revalidatePath("/admin/reports/builder");
    revalidatePath("/admin/reports");
    return { success: true };
  } catch (err: any) {
    console.error("[deleteReportAction] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to delete report configuration",
    };
  }
}

export async function runReportQueryAction(
  params: ReportQueryRequestInput
): Promise<{
  success: boolean;
  data?: ReportQueryResult;
  error?: string;
}> {
  try {
    // Validate request parameters against safe whitelists
    const validated = ReportQueryRequestSchema.parse(params);

    const result = await reportRepository.executeReportQuery(validated);
    return { success: true, data: result };
  } catch (err: any) {
    console.error("[runReportQueryAction] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to execute report query",
    };
  }
}
