"use client";

import React, { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Mail,
  Phone,
  Building2,
  Calendar,
  Sparkles,
  ExternalLink,
  UserCheck,
  Pencil,
  Loader2,
  Send,
  MessageSquare,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { CRMLead, CRMNote, CommunicationLog } from "@/types/crm.types";
import {
  convertLeadAction,
  getLeadNotesAction,
  addLeadNoteAction,
  getLeadCommunicationLogsAction,
} from "@/actions/crm.actions";

interface LeadDetailsSheetProps {
  lead: CRMLead | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (lead: CRMLead) => void;
  onLeadUpdated: (lead: CRMLead) => void;
}

export function LeadDetailsSheet({
  lead,
  open,
  onOpenChange,
  onEdit,
  onLeadUpdated,
}: LeadDetailsSheetProps) {
  const [converting, setConverting] = useState(false);
  const [notes, setNotes] = useState<CRMNote[]>([]);
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    if (open && lead?.id) {
      loadHistory(lead.id);
    } else {
      setNotes([]);
      setLogs([]);
    }
  }, [open, lead?.id]);

  const loadHistory = async (leadId: string) => {
    setLoadingHistory(true);
    try {
      const [notesRes, logsRes] = await Promise.all([
        getLeadNotesAction(leadId),
        getLeadCommunicationLogsAction(leadId),
      ]);
      if (notesRes.data) setNotes(notesRes.data);
      if (logsRes.data) setLogs(logsRes.data);
    } catch (err: any) {
      console.error("Failed to load lead history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleConvert = async () => {
    if (!lead?.id) return;
    setConverting(true);
    try {
      const res = await convertLeadAction(lead.id);
      if (res?.error) {
        toast.error(res.error || "Failed to convert lead");
        return;
      }
      toast.success("Lead converted to customer successfully!");
      if (res?.data) {
        onLeadUpdated(res.data);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to convert lead");
    } finally {
      setConverting(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead?.id || !newNote.trim()) return;
    setSubmittingNote(true);
    try {
      const res = await addLeadNoteAction(lead.id, newNote.trim());
      if (res.error) {
        toast.error(res.error || "Failed to save note");
        return;
      }
      toast.success("Note added");
      setNewNote("");
      if (res.data) {
        setNotes((prev) => [res.data!, ...prev]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to add note");
    } finally {
      setSubmittingNote(false);
    }
  };

  if (!lead) return null;

  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(" ") || "Unnamed Prospect";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return <Badge variant="default">NEW</Badge>;
      case "contacted":
        return <Badge variant="secondary">CONTACTED</Badge>;
      case "qualified":
        return <Badge variant="outline" className="border-blue-500 text-blue-600 dark:text-blue-400">QUALIFIED</Badge>;
      case "converted":
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">CONVERTED</Badge>;
      case "lost":
        return <Badge variant="destructive">LOST</Badge>;
      default:
        return <Badge variant="outline">{status.toUpperCase()}</Badge>;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            {getStatusBadge(lead.status)}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(lead)}
              className="h-8 gap-1 text-xs"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit Lead
            </Button>
          </div>
          <SheetTitle className="text-2xl font-bold mt-2">{fullName}</SheetTitle>
          {lead.company_name && (
            <SheetDescription className="flex items-center gap-1.5 text-sm text-foreground/80 font-medium">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              {lead.company_name}
            </SheetDescription>
          )}
        </SheetHeader>

        {/* Quick Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-4">
          {lead.email ? (
            <Button variant="default" className="w-full gap-2" asChild>
              <a href={`mailto:${lead.email}`}>
                <Mail className="h-4 w-4" />
                Email Lead
              </a>
            </Button>
          ) : (
            <Button variant="default" disabled className="w-full gap-2">
              <Mail className="h-4 w-4" />
              No Email
            </Button>
          )}

          {lead.phone ? (
            <Button variant="outline" className="w-full gap-2" asChild>
              <a href={`tel:${lead.phone}`}>
                <Phone className="h-4 w-4" />
                Call Lead
              </a>
            </Button>
          ) : (
            <Button variant="outline" disabled className="w-full gap-2">
              <Phone className="h-4 w-4" />
              No Phone
            </Button>
          )}
        </div>

        {/* Conversion Action */}
        {lead.status !== "converted" && (
          <div className="mt-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-300">Ready to close?</p>
              <p className="text-xs text-muted-foreground">Convert to official customer account</p>
            </div>
            <Button
              size="sm"
              onClick={handleConvert}
              disabled={converting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-8 text-xs font-medium"
            >
              {converting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" />
              )}
              Convert
            </Button>
          </div>
        )}

        <Separator className="my-5" />

        {/* Core Profile Fields */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Lead Information
          </h4>
          <div className="grid grid-cols-1 gap-2.5 text-sm">
            <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> Email
              </span>
              <span className="font-mono text-xs select-all">{lead.email}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> Phone
              </span>
              <span className="font-mono text-xs select-all">{lead.phone || "Not provided"}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Lead Source
              </span>
              <span className="font-medium text-xs capitalize">{lead.source || "Direct"}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Lead Score
              </span>
              <Badge variant="secondary" className="font-mono text-xs">{lead.score || 0} pts</Badge>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-md bg-muted/40">
              <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Registered
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(lead.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>

        <Separator className="my-5" />

        {/* Lead Notes & Communication Log */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Notes & Communications ({notes.length + logs.length})
            </h4>
          </div>

          {/* Quick Add Note Form */}
          <form onSubmit={handleAddNote} className="flex gap-2">
            <Input
              placeholder="Add an internal note or update..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="text-xs h-9 bg-card"
              disabled={submittingNote}
            />
            <Button
              type="submit"
              size="sm"
              disabled={submittingNote || !newNote.trim()}
              className="h-9 px-3"
            >
              {submittingNote ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
          </form>

          {/* Activity / Notes Stream */}
          <div className="space-y-2 pt-2">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading history...
              </div>
            ) : notes.length === 0 && logs.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-lg text-muted-foreground text-xs">
                No notes or logs recorded yet. Add the first note above!
              </div>
            ) : (
              <>
                {notes.map((n) => (
                  <div key={n.id} className="p-3 rounded-lg border bg-card text-xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                      <span className="font-semibold text-foreground">Staff Note</span>
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed whitespace-pre-wrap">
                      {n.content}
                    </p>
                  </div>
                ))}
                {logs.map((log) => (
                  <div key={log.id} className="p-3 rounded-lg border border-primary/20 bg-primary/5 text-xs space-y-1">
                    <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                      <span className="font-semibold text-primary">{log.type} ({log.direction})</span>
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                    {log.subject && <p className="font-medium text-foreground">{log.subject}</p>}
                    {log.content && <p className="text-muted-foreground text-xs">{log.content}</p>}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
