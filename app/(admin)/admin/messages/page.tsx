import React from "react";
import { Metadata } from "next";
import {
  getCommunicationLogsAction,
  getCustomersAction,
  getLeadsAction,
} from "@/actions/crm.actions";
import { MessagesClient } from "@/features/crm/components/MessagesClient";

export const metadata: Metadata = {
  title: "Messages & Communications | Admin | Anchor Fashion",
  description: "Review and record call, meeting, and message logs with leads and customers",
};

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const [logsRes, customersRes, leadsRes] = await Promise.all([
    getCommunicationLogsAction(),
    getCustomersAction(),
    getLeadsAction(),
  ]);

  return (
    <MessagesClient
      initialLogs={logsRes.data || []}
      customers={customersRes.data || []}
      leads={leadsRes.data || []}
    />
  );
}
