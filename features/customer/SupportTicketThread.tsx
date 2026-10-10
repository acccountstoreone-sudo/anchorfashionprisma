"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, User, Headset, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { replyTicketAction } from "@/app/actions/customer.actions";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  sender_type: "CUSTOMER" | "AGENT" | "SYSTEM" | "AI";
  message: string;
  created_at: string;
  is_internal_note?: boolean;
}

interface SupportTicketThreadProps {
  ticketId: string;
  initialDescription?: string;
  ticketCreatedAt: string;
  status: string;
  messages: Message[];
}

export function SupportTicketThread({
  ticketId,
  initialDescription,
  ticketCreatedAt,
  status,
  messages: initialMessages,
}: SupportTicketThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const threadEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    if (!ticketId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`customer-ticket-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "ticket_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Never display internal staff notes to customer
          if (newMsg.is_internal_note) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => {
            threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId]);

  const isClosed = status.toLowerCase() === "closed" || status.toLowerCase() === "resolved";

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || isSubmitting) return;

    const trimmed = replyText.trim();
    setIsSubmitting(true);

    try {
      const res = await replyTicketAction({
        ticketId,
        message: trimmed,
      });

      if (res.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: `temp-${Date.now()}`,
            sender_type: "CUSTOMER",
            message: trimmed,
            created_at: new Date().toISOString(),
          },
        ]);
        setReplyText("");
        toast.success("Reply submitted to support team");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to send reply");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Conversation History</CardTitle>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Started {new Date(ticketCreatedAt).toLocaleDateString()}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-6 min-h-[220px]">
        {/* Original Ticket Description as First Message */}
        {initialDescription && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-sm p-4 bg-primary text-primary-foreground shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-white/20">
                <span className="text-xs font-semibold flex items-center gap-1">
                  <User className="h-3 w-3" /> You (Initial Request)
                </span>
                <span className="text-[10px] text-primary-foreground/75">
                  {new Date(ticketCreatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{initialDescription}</p>
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((msg) => {
          const isCustomer = msg.sender_type === "CUSTOMER";
          const isSystem = msg.sender_type === "SYSTEM";

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <Badge variant="outline" className="text-xs font-normal text-muted-foreground bg-muted/50 px-3 py-1">
                  {msg.message}
                </Badge>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                  isCustomer
                    ? "rounded-tr-sm bg-primary text-primary-foreground"
                    : "rounded-tl-sm bg-muted/80 text-foreground border border-border"
                }`}
              >
                <div
                  className={`flex items-center justify-between gap-4 mb-1.5 pb-1 border-b ${
                    isCustomer ? "border-white/20" : "border-border/60"
                  }`}
                >
                  <span className="text-xs font-semibold flex items-center gap-1.5">
                    {isCustomer ? (
                      <>
                        <User className="h-3 w-3" /> You
                      </>
                    ) : (
                      <>
                        <Headset className="h-3 w-3 text-primary" /> Support Specialist
                      </>
                    )}
                  </span>
                  <span
                    className={`text-[10px] ${
                      isCustomer ? "text-primary-foreground/75" : "text-muted-foreground"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && !initialDescription && (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No replies yet. Our support team has received your ticket and will respond shortly.
          </div>
        )}
        <div ref={threadEndRef} />
      </CardContent>

      {/* Reply Box */}
      {!isClosed ? (
        <CardFooter className="flex-col gap-3 border-t pt-4 bg-muted/20">
          <form onSubmit={handleSendReply} className="w-full space-y-3">
            <Textarea
              placeholder="Type your response to the support team..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-[90px] resize-y bg-background"
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Our support agents respond within 2-4 business hours.
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || !replyText.trim()}
                className="gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Reply
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardFooter>
      ) : (
        <CardFooter className="border-t py-4 bg-muted/30 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4" />
          <span>This support ticket is closed. Please submit a new inquiry if you need additional help.</span>
        </CardFooter>
      )}
    </Card>
  );
}
