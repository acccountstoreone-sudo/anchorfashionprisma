"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Send,
  CheckCircle,
  Search,
  User,
  MessageSquare,
  Clock,
  Lock,
  Tag,
  Loader2,
  RefreshCw,
  Phone,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  getSupportTicketsAction,
  getTicketMessagesAction,
  sendAgentMessageAction,
  updateTicketStatusAction,
} from "@/actions/support.actions";
import {
  SupportTicketRecord,
  TicketMessageRecord,
} from "@/repositories/support.repository";
import { createClient } from "@/lib/supabase/client";

export default function LiveChatInterfacePage() {
  const [tickets, setTickets] = useState<SupportTicketRecord[]>([]);
  const [activeTicket, setActiveTicket] = useState<SupportTicketRecord | null>(null);
  const [messages, setMessages] = useState<TicketMessageRecord[]>([]);
  const [messageText, setMessageText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load Tickets
  const loadTickets = async (maintainActiveId?: string) => {
    try {
      const res = await getSupportTicketsAction();
      if (res.data) {
        setTickets(res.data);
        if (res.data.length > 0) {
          const current = maintainActiveId
            ? res.data.find((t) => t.id === maintainActiveId) || res.data[0]
            : activeTicket || res.data[0];
          setActiveTicket(current);
        } else {
          setActiveTicket(null);
        }
      }
    } catch (err: any) {
      console.error("Failed to load tickets", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    loadTickets();
    const interval = setInterval(() => {
      loadTickets(activeTicket?.id);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Load Messages and subscribe to Realtime updates when active ticket changes
  useEffect(() => {
    if (!activeTicket?.id) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setLoadingMessages(true);

    getTicketMessagesAction(activeTicket.id).then((res) => {
      if (isMounted) {
        if (res.data) setMessages(res.data);
        setLoadingMessages(false);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    });

    // Supabase Realtime channel for live customer/agent updates
    const supabase = createClient();
    const channel = supabase
      .channel(`ticket-chat-${activeTicket.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${activeTicket.id}`,
        },
        (payload) => {
          if (!isMounted) return;
          const newMsg = payload.new as TicketMessageRecord;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeTicket?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !messageText.trim() || sending) return;

    setSending(true);
    const content = messageText.trim();
    const isNote = isInternalNote;

    try {
      const res = await sendAgentMessageAction({
        ticketId: activeTicket.id,
        message: content,
        isInternalNote: isNote,
      });

      if (res.error) {
        toast.error(res.error || "Failed to send message");
        return;
      }

      if (res.data) {
        setMessages((prev) => [...prev, res.data!]);
        setMessageText("");
        setIsInternalNote(false);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (!activeTicket) return;
    try {
      const res = await updateTicketStatusAction({
        ticketId: activeTicket.id,
        status,
      });
      if (res.error) {
        toast.error(res.error || "Failed to update status");
        return;
      }
      toast.success(`Ticket marked as ${status}`);
      setActiveTicket((prev) => (prev ? { ...prev, status } : null));
      loadTickets(activeTicket.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const customer = (t.customer?.full_name || "").toLowerCase();
    const subject = (t.subject || "").toLowerCase();
    const cat = (t.category || "").toLowerCase();
    return customer.includes(q) || subject.includes(q) || cat.includes(q);
  });

  const getCustomerName = (t: SupportTicketRecord) => {
    return t.customer?.full_name || "Guest Customer";
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 md:flex-row">
      {/* Sidebar: Real Tickets Conversation List */}
      <Card className="flex h-full w-full flex-col overflow-hidden border-r md:w-80 md:rounded-r-none md:border-r-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b px-4 py-3">
          <div>
            <CardTitle className="text-base font-bold">Support Queue</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {tickets.length} conversation{tickets.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => loadTickets(activeTicket?.id)}
            className="h-8 w-8 text-muted-foreground"
            title="Refresh queue"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>

        <div className="border-b p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 bg-background pl-8 text-xs"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loadingTickets ? (
            <div className="flex items-center justify-center p-8 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading conversations...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
              <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="font-semibold text-foreground">No active conversations</p>
              <p>Inbound customer support messages will appear in this feed.</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredTickets.map((t) => {
                const isActive = activeTicket?.id === t.id;
                const name = getCustomerName(t);
                const hasUnread = (t.unread_count || 0) > 0;

                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTicket(t)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg p-3 text-left transition-colors",
                      isActive
                        ? "bg-primary/10 border-l-4 border-primary"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs font-semibold bg-muted">
                          {name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {hasUnread && (
                        <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-background bg-primary" />
                      )}
                    </div>

                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-xs font-semibold text-foreground">
                          {name}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {new Date(t.updated_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>

                      <p className="truncate text-xs font-medium text-foreground/80 mt-0.5">
                        {t.subject}
                      </p>

                      <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                        {t.last_message || "No messages yet"}
                      </p>

                      <div className="flex items-center gap-1.5 mt-1.5">
                        <Badge
                          variant={t.status === "open" ? "default" : "secondary"}
                          className="text-[9px] px-1.5 py-0 h-4 capitalize"
                        >
                          {t.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          #{t.ticket_number}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      {/* Main Chat Conversation Area */}
      <Card className="flex h-full flex-1 flex-col overflow-hidden md:rounded-l-none">
        {activeTicket ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b bg-card px-6 py-3.5">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="text-xs font-bold">
                    {getCustomerName(activeTicket).substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-sm text-foreground">
                      {getCustomerName(activeTicket)}
                    </h2>
                    <Badge variant="outline" className="text-[10px] font-mono capitalize">
                      {activeTicket.category || "General"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Subject: <span className="text-foreground/90 font-medium">{activeTicket.subject}</span>
                  </p>
                </div>
              </div>

              {/* Status Actions */}
              <div className="flex items-center gap-2">
                {activeTicket.status !== "resolved" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate("resolved")}
                    className="gap-1.5 h-8 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Resolve
                  </Button>
                )}
                {activeTicket.status !== "closed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusUpdate("closed")}
                    className="h-8 text-xs"
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>

            {/* Message Stream */}
            <ScrollArea className="flex-1 p-6">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Loading message thread...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted-foreground space-y-2">
                  <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground/40" />
                  <p className="font-medium text-foreground">No messages in this ticket thread yet.</p>
                  {activeTicket.description && (
                    <div className="max-w-md mx-auto p-3 rounded-lg bg-muted/40 text-left border">
                      <p className="font-semibold text-foreground text-xs mb-1">Initial Ticket Description:</p>
                      <p className="text-muted-foreground leading-relaxed">{activeTicket.description}</p>
                    </div>
                  )}
                  <p className="text-[11px]">Send an agent reply or internal note below.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((m) => {
                    const isAgent = m.sender_type === "AGENT";
                    const isNote = m.is_internal_note;

                    if (isNote) {
                      return (
                        <div key={m.id} className="flex justify-center my-2">
                          <div className="max-w-lg rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                            <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-400">
                              <Lock className="h-3 w-3" /> Staff Internal Note
                              <span className="font-normal text-[10px] text-muted-foreground ml-auto">
                                {new Date(m.created_at).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                            </div>
                            <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex gap-3",
                          isAgent ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        <Avatar className="mt-1 h-7 w-7">
                          <AvatarFallback
                            className={cn(
                              "text-[10px] font-bold",
                              isAgent
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {isAgent ? "ME" : "C"}
                          </AvatarFallback>
                        </Avatar>

                        <div
                          className={cn(
                            "max-w-[75%] rounded-lg p-3 text-xs leading-relaxed space-y-1",
                            isAgent
                              ? "bg-primary text-primary-foreground rounded-tr-none"
                              : "bg-muted text-foreground rounded-tl-none border"
                          )}
                        >
                          <p className="whitespace-pre-wrap">{m.message}</p>
                          <p
                            className={cn(
                              "text-[10px] text-right font-mono",
                              isAgent ? "text-primary-foreground/70" : "text-muted-foreground"
                            )}
                          >
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Input Bar */}
            <div className="border-t bg-card p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isInternalNote}
                    onChange={(e) => setIsInternalNote(e.target.checked)}
                    className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span
                    className={cn(
                      "font-semibold flex items-center gap-1",
                      isInternalNote ? "text-amber-600" : "text-muted-foreground"
                    )}
                  >
                    <Lock className="h-3 w-3" />
                    Internal Staff Note (Invisible to Customer)
                  </span>
                </label>

                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Agent response mode</span>
                </div>
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? "Write a private note for staff team..."
                      : "Type your response to the customer... (Enter to type, Shift+Enter for new line)"
                  }
                  className={cn(
                    "min-h-[46px] max-h-32 resize-none text-xs py-2.5",
                    isInternalNote && "border-amber-500/40 bg-amber-500/5 focus-visible:ring-amber-500"
                  )}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  disabled={sending || !messageText.trim()}
                  className={cn(
                    "h-[46px] px-4 shrink-0",
                    isInternalNote && "bg-amber-600 hover:bg-amber-700 text-white"
                  )}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <h3 className="text-base font-semibold text-foreground">Select a Conversation</h3>
            <p className="text-xs max-w-sm mt-1">
              Choose a support ticket from the queue on the left to read messages, reply to customers, or post internal staff notes.
            </p>
          </div>
        )}
      </Card>

      {/* Right Column: Customer Context Sidebar */}
      {activeTicket && (
        <Card className="hidden h-full w-72 flex-col overflow-hidden lg:flex border-l">
          <CardHeader className="border-b bg-muted/20 py-3">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Customer Context
            </CardTitle>
          </CardHeader>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-5 text-xs">
              <div>
                <h4 className="flex items-center gap-1.5 font-bold text-foreground mb-2">
                  <User className="h-3.5 w-3.5 text-primary" /> Contact Profile
                </h4>
                <div className="p-3 bg-muted/40 rounded-lg space-y-1.5">
                  <p className="font-semibold text-foreground">
                    {getCustomerName(activeTicket)}
                  </p>
                  {activeTicket.customer?.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      <a href={`tel:${activeTicket.customer.phone}`} className="hover:text-primary">
                        {activeTicket.customer.phone}
                      </a>
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Profile ID: {activeTicket.profile_id ? `${activeTicket.profile_id.substring(0, 8)}...` : "Guest"}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="flex items-center gap-1.5 font-bold text-foreground mb-2">
                  <Tag className="h-3.5 w-3.5 text-primary" /> Ticket Details
                </h4>
                <div className="p-3 bg-muted/40 rounded-lg space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ticket No:</span>
                    <span className="font-mono font-bold text-foreground">#{activeTicket.ticket_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category:</span>
                    <span className="capitalize text-foreground font-medium">{activeTicket.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Priority:</span>
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {activeTicket.priority || "Medium"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className="text-[9px] capitalize">
                      {activeTicket.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between pt-1 border-t">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="text-muted-foreground">
                      {new Date(activeTicket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> Live Support SLA
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Support agents are expected to provide first responses within 15 minutes of inbound tickets.
                </p>
              </div>
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}
