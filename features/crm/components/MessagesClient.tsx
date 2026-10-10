"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  MessageSquare,
  Mail,
  Phone,
  Video,
  Search,
  Loader2,
  Pencil,
  Trash2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { CommunicationLog } from "@/types/crm.types";
import {
  logCommunicationAction,
  updateCommunicationLogAction,
  deleteCommunicationLogAction,
} from "@/actions/crm.actions";
import { ConfirmDialog } from "@/features/admin/components/shared/ConfirmDialog";

interface MessagesClientProps {
  initialLogs: CommunicationLog[];
  customers?: any[];
  leads?: any[];
}

const getChannelIcon = (channel: string) => {
  switch (channel?.toLowerCase()) {
    case "email":
      return <Mail className="h-4 w-4" />;
    case "phone":
    case "call":
      return <Phone className="h-4 w-4" />;
    case "meeting":
      return <Video className="h-4 w-4" />;
    default:
      return <MessageSquare className="h-4 w-4" />;
  }
};

export function MessagesClient({
  initialLogs,
  customers = [],
  leads = [],
}: MessagesClientProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<CommunicationLog[]>(initialLogs);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");

  // Log Dialog State (Create / Edit)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<CommunicationLog | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>("none");
  const [commType, setCommType] = useState<"EMAIL" | "CALL" | "MEETING" | "SMS">("CALL");
  const [direction, setDirection] = useState<"OUTBOUND" | "INBOUND">("OUTBOUND");
  const [commDate, setCommDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [contentError, setContentError] = useState("");
  const [serverError, setServerError] = useState("");

  // Delete State
  const [logToDelete, setLogToDelete] = useState<CommunicationLog | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  React.useEffect(() => {
    setLogs(initialLogs);
  }, [initialLogs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        !search.trim() ||
        (log.content || "").toLowerCase().includes(search.toLowerCase()) ||
        (log.subject || "").toLowerCase().includes(search.toLowerCase());

      const matchChannel =
        channelFilter === "all" ||
        log.type.toLowerCase() === channelFilter.toLowerCase();

      return matchSearch && matchChannel;
    });
  }, [logs, search, channelFilter]);

  const getContactInfo = (log: CommunicationLog) => {
    if (log.lead_id) {
      const lead = leads.find((l) => l.id === log.lead_id);
      const name = lead
        ? [lead.first_name, lead.last_name].filter(Boolean).join(" ") || lead.email
        : "Lead Contact";
      const detail = lead?.company_name || lead?.email || lead?.phone || "";
      return {
        type: "LEAD" as const,
        name,
        detail,
      };
    }

    if (log.profile_id) {
      const cust = customers.find(
        (c) =>
          c.id === log.profile_id ||
          c.profile_id === log.profile_id ||
          c.customer_profiles?.id === log.profile_id
      );
      const prof = cust?.customer_profiles || cust;
      const name = prof
        ? [prof.first_name, prof.last_name].filter(Boolean).join(" ") || prof.email
        : "Customer";
      const detail = prof?.email || prof?.phone || "";
      return {
        type: "CUSTOMER" as const,
        name,
        detail,
      };
    }

    return {
      type: "GENERAL" as const,
      name: "General / Unassigned",
      detail: "",
    };
  };

  const handleOpenCreate = () => {
    setEditingLog(null);
    setSelectedClient("none");
    setCommType("CALL");
    setDirection("OUTBOUND");
    setCommDate(new Date().toISOString().split("T")[0]);
    setSubject("");
    setContent("");
    setContentError("");
    setServerError("");
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (log: CommunicationLog) => {
    setEditingLog(log);
    let clientVal = "none";
    if (log.lead_id) {
      clientVal = `lead:${log.lead_id}`;
    } else if (log.profile_id) {
      clientVal = `customer:${log.profile_id}`;
    }
    setSelectedClient(clientVal);
    setCommType((log.type as any) || "CALL");
    setDirection((log.direction as any) || "OUTBOUND");
    setCommDate(
      log.created_at
        ? new Date(log.created_at).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0]
    );
    setSubject(log.subject || "");
    setContent(log.content || "");
    setContentError("");
    setServerError("");
    setIsDialogOpen(true);
  };

  const handleOpenDelete = (log: CommunicationLog) => {
    setLogToDelete(log);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!logToDelete) return;
    setDeleting(true);
    try {
      const res = await deleteCommunicationLogAction(logToDelete.id);
      if (res.error) {
        toast.error(res.error || "Failed to delete communication log");
        return;
      }
      toast.success("Communication log deleted successfully");
      setLogs((prev) => prev.filter((l) => l.id !== logToDelete.id));
      setIsDeleteDialogOpen(false);
      setLogToDelete(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete communication log");
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setContentError("Please enter the discussion content or notes");
      toast.error("Please enter the discussion content or notes");
      return;
    }

    setSubmitting(true);
    setServerError("");
    try {
      let lead_id: string | undefined = undefined;
      let profile_id: string | undefined = undefined;

      if (selectedClient.startsWith("lead:")) {
        lead_id = selectedClient.replace("lead:", "");
      } else if (selectedClient.startsWith("customer:")) {
        profile_id = selectedClient.replace("customer:", "");
      }

      if (editingLog) {
        const res = await updateCommunicationLogAction(editingLog.id, {
          type: commType,
          direction,
          subject: subject.trim() || undefined,
          content: content.trim(),
          lead_id,
          profile_id,
          created_at: commDate ? new Date(commDate).toISOString() : undefined,
        });

        if (res.error) {
          setServerError(res.error);
          toast.error(res.error || "Failed to update communication log");
          return;
        }

        toast.success("Communication log updated successfully");
        if (res.data) {
          setLogs((prev) =>
            prev.map((l) => (l.id === editingLog.id ? (res.data as any) : l))
          );
        }
      } else {
        const res = await logCommunicationAction({
          type: commType,
          direction,
          subject: subject.trim() || undefined,
          content: content.trim(),
          lead_id,
          profile_id,
          created_at: commDate ? new Date(commDate).toISOString() : undefined,
        });

        if (res.error) {
          setServerError(res.error);
          toast.error(res.error || "Failed to record communication log");
          return;
        }

        toast.success("Communication logged successfully");
        if (res.data) {
          setLogs((prev) => [res.data as any, ...prev]);
        }
      }

      setIsDialogOpen(false);
      setEditingLog(null);
      setSubject("");
      setContent("");
      setSelectedClient("none");
      router.refresh();
    } catch (err: any) {
      setServerError(err.message || "An unexpected error occurred");
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-8 pt-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages & Communication Logs</h1>
          <p className="mt-1 text-muted-foreground">
            Review and record telephone calls, emails, and meetings across wholesale and retail contacts.
          </p>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Log Communication
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search message notes or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: "all", label: "All Logs" },
            { id: "call", label: "Calls" },
            { id: "email", label: "Emails" },
            { id: "meeting", label: "Meetings" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={channelFilter === tab.id ? "default" : "outline"}
              size="sm"
              onClick={() => setChannelFilter(tab.id)}
              className="text-xs h-8 border-slate-200 dark:border-slate-800"
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100 text-base font-bold">Communication Register</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400 text-xs">
            Showing {filteredLogs.length} of {logs.length} logged touchpoints.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80">
                <TableRow className="border-b border-slate-200 dark:border-slate-800">
                  <TableHead className="w-[120px] text-slate-700 dark:text-slate-300 font-semibold text-xs">Channel</TableHead>
                  <TableHead className="w-[110px] text-slate-700 dark:text-slate-300 font-semibold text-xs">Direction</TableHead>
                  <TableHead className="text-slate-700 dark:text-slate-300 font-semibold text-xs">Summary / Discussion Notes</TableHead>
                  <TableHead className="w-[180px] text-slate-700 dark:text-slate-300 font-semibold text-xs">Contact / Client</TableHead>
                  <TableHead className="w-[130px] text-slate-700 dark:text-slate-300 font-semibold text-xs">Recorded Date</TableHead>
                  <TableHead className="w-[90px] text-right text-slate-700 dark:text-slate-300 font-semibold text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="flex flex-col items-center justify-center gap-1">
                        <MessageSquare className="h-6 w-6 text-muted-foreground/40 mb-1" />
                        <p className="font-semibold text-foreground">No communications found</p>
                        <p className="text-xs">
                          {logs.length === 0
                            ? "Use 'Log Communication' to record interactions."
                            : "No logs match your filter criteria."}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2 capitalize text-xs font-medium">
                          {getChannelIcon(log.type)}
                          <span>{log.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={log.direction === "INBOUND" ? "secondary" : "outline"}
                          className="capitalize text-xs font-normal"
                        >
                          {log.direction.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.subject && (
                          <div className="font-medium text-xs text-foreground mb-0.5">
                            {log.subject}
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {log.content || "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const contact = getContactInfo(log);
                          if (contact.type === "CUSTOMER") {
                            return (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className="w-fit bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 text-[11px] px-1.5 py-0 font-medium"
                                  >
                                    Customer
                                  </Badge>
                                  <span
                                    className="text-xs font-medium text-foreground truncate max-w-[125px]"
                                    title={contact.name}
                                  >
                                    {contact.name}
                                  </span>
                                </div>
                                {contact.detail && (
                                  <span
                                    className="text-[11px] text-muted-foreground truncate max-w-[160px]"
                                    title={contact.detail}
                                  >
                                    {contact.detail}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          if (contact.type === "LEAD") {
                            return (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className="w-fit bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 text-[11px] px-1.5 py-0 font-medium"
                                  >
                                    Lead
                                  </Badge>
                                  <span
                                    className="text-xs font-medium text-foreground truncate max-w-[125px]"
                                    title={contact.name}
                                  >
                                    {contact.name}
                                  </span>
                                </div>
                                {contact.detail && (
                                  <span
                                    className="text-[11px] text-muted-foreground truncate max-w-[160px]"
                                    title={contact.detail}
                                  >
                                    {contact.detail}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return (
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="secondary"
                                className="text-[11px] px-1.5 py-0 text-muted-foreground font-normal"
                              >
                                General
                              </Badge>
                              <span className="text-xs text-muted-foreground">Unassigned</span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {new Date(log.created_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEdit(log)}
                            title="Edit Communication"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleOpenDelete(log)}
                            title="Delete Communication"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Log Communication Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingLog ? (
                <>
                  <Pencil className="h-5 w-5 text-primary" />
                  Edit Communication Log
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Log Client Communication
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {editingLog
                ? "Update conversation details, channel, or discussion notes."
                : "Record details from phone calls, client meetings, or written messages."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveLog} className="space-y-4 py-2">
            {serverError && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{serverError}</span>
              </div>
            )}

            {/* Client Selection */}
            <div className="space-y-1.5">
              <Label>Associated Client / Lead</Label>
              <Select value={selectedClient} onValueChange={(val) => setSelectedClient(val || "none")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select client or lead..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="none">General / Unassigned</SelectItem>
                  {leads.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                        Leads ({leads.length})
                      </div>
                      {leads.map((l) => (
                        <SelectItem key={`lead-${l.id}`} value={`lead:${l.id}`}>
                          [Lead] {[l.first_name, l.last_name].filter(Boolean).join(" ") || l.email} {l.company_name ? `(${l.company_name})` : ""}
                        </SelectItem>
                      ))}
                    </>
                  )}
                  {customers.length > 0 && (
                    <>
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                        Customers ({customers.length})
                      </div>
                      {customers.map((c) => {
                        const prof = c.customer_profiles || c;
                        const name =
                          [prof.first_name, prof.last_name].filter(Boolean).join(" ") ||
                          prof.email ||
                          "Customer";
                        const id = c.profile_id || c.id || prof.id;
                        return (
                          <SelectItem key={`customer-${id}`} value={`customer:${id}`}>
                            [Customer] {name}{" "}
                            {prof.phone ? `(${prof.phone})` : prof.email ? `(${prof.email})` : ""}
                          </SelectItem>
                        );
                      })}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date & Channel */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Communication Date</Label>
                <Input
                  type="date"
                  value={commDate}
                  onChange={(e) => setCommDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Channel</Label>
                <Select value={commType} onValueChange={(val: any) => setCommType(val)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">Phone Call</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                    <SelectItem value="SMS">SMS / WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Direction */}
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select value={direction} onValueChange={(val: any) => setDirection(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTBOUND">Outbound</SelectItem>
                  <SelectItem value="INBOUND">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comm-subject">Subject / Purpose</Label>
              <Input
                id="comm-subject"
                placeholder="e.g., Bulk order terms negotiation"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="comm-notes">
                Discussion Notes <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="comm-notes"
                placeholder="Summary of what was discussed, outcomes, and next action items..."
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (contentError) setContentError("");
                }}
                rows={4}
              />
              {contentError && (
                <p className="text-xs text-destructive font-medium">{contentError}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingLog(null);
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingLog ? "Updating..." : "Recording..."}
                  </>
                ) : editingLog ? (
                  "Update Communication"
                ) : (
                  "Save Communication"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        title="Delete Communication Log"
        description="Are you sure you want to permanently delete this communication log? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        isLoading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setIsDeleteDialogOpen(false);
          setLogToDelete(null);
        }}
      />
    </div>
  );
}
