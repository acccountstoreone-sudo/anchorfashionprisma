"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Bot,
  Send,
  CalendarIcon,
  Wand2,
  Loader2,
  Mail,
  Bell,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  createAndSendCampaignAction,
  createAndScheduleCampaignAction,
  getCampaignsAction,
} from "@/actions/marketing.actions";
import { Campaign } from "@/types/marketing.types";
import { ScheduleCampaignDialog } from "@/features/marketing/components/ScheduleCampaignDialog";

interface CampaignBuilderClientProps {
  backHref?: string;
}

export function CampaignBuilderClient({ backHref = "/manager/marketing" }: CampaignBuilderClientProps) {
  // Form State
  const [campaignName, setCampaignName] = useState("");
  const [targetSegment, setTargetSegment] = useState("all");
  const [channelType, setChannelType] = useState<"email" | "push">("email");
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [pushTitle, setPushTitle] = useState("");
  const [pushMessage, setPushMessage] = useState("");

  // Action State
  const [isSending, setIsSending] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Campaign History
  const [campaignHistory, setCampaignHistory] = useState<Campaign[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Fetch campaign history
  const fetchCampaigns = async () => {
    setLoadingHistory(true);
    try {
      const res = await getCampaignsAction();
      if (res.success && res.data) {
        setCampaignHistory(res.data);
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Validate form
  const validateForm = () => {
    if (!campaignName.trim()) {
      toast.error("Please enter a campaign name");
      return false;
    }

    if (channelType === "email") {
      if (!subject.trim()) {
        toast.error("Please enter an email subject line");
        return false;
      }
      if (!emailBody.trim()) {
        toast.error("Please write the email body content");
        return false;
      }
    } else {
      if (!pushTitle.trim()) {
        toast.error("Please enter a push notification title");
        return false;
      }
      if (!pushMessage.trim()) {
        toast.error("Please enter a push notification message");
        return false;
      }
    }

    return true;
  };

  // Handle Immediate Send
  const handleSendNow = async () => {
    if (!validateForm()) return;

    setIsSending(true);
    try {
      const content = channelType === "email" ? emailBody : pushMessage;
      const sub = channelType === "email" ? subject : pushTitle;

      const res = await createAndSendCampaignAction({
        name: campaignName,
        type: channelType,
        subject: sub,
        content,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to dispatch campaign");
        return;
      }

      toast.success(
        `Campaign dispatched successfully to ${res.sentCount || 1} recipient(s)!`
      );

      // Reset form
      setCampaignName("");
      setSubject("");
      setEmailBody("");
      setPushTitle("");
      setPushMessage("");

      // Refresh history
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message || "Failed to send campaign");
    } finally {
      setIsSending(false);
    }
  };

  // Handle Scheduling
  const handleConfirmSchedule = async (scheduleDate: string) => {
    if (!validateForm()) return;

    setIsScheduling(true);
    try {
      const content = channelType === "email" ? emailBody : pushMessage;
      const sub = channelType === "email" ? subject : pushTitle;

      const res = await createAndScheduleCampaignAction({
        name: campaignName,
        type: channelType,
        subject: sub,
        content,
        scheduleTime: scheduleDate,
      });

      if (!res.success) {
        toast.error(res.error || "Failed to schedule campaign");
        return;
      }

      toast.success("Campaign scheduled successfully!");
      setIsScheduleModalOpen(false);

      // Reset form
      setCampaignName("");
      setSubject("");
      setEmailBody("");
      setPushTitle("");
      setPushMessage("");

      // Refresh history
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message || "Failed to schedule campaign");
    } finally {
      setIsScheduling(false);
    }
  };

  // AI Assistant Suggestion
  const handleGenerateAiCopy = () => {
    setAiGenerating(true);
    setTimeout(() => {
      const nameRef = campaignName.trim() || "Mid-Season Exclusive";

      if (targetSegment === "vip") {
        setSubject(`🌟 Exclusive VIP Preview: ${nameRef} is here!`);
        setEmailBody(
          `<h2>Dear Preferred Member,</h2>\n<p>As one of Anchor Fashion's most valued patrons, you receive <strong>24-hour early access</strong> to the <em>${nameRef}</em>.</p>\n<p>Hand-crafted textiles, tailored silhouettes, and timeless luxury await you.</p>\n<p><a href="/products?vip=true" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Enter VIP Showroom</a></p>`
        );
        setPushTitle(`✨ VIP Early Access Live!`);
        setPushMessage(`Shop the ${nameRef} 24 hours before public release.`);
      } else {
        setSubject(`Discover the New ${nameRef} | Anchor Fashion`);
        setEmailBody(
          `<h2>Elevate Your Wardrobe</h2>\n<p>We are thrilled to unveil our latest collection: <strong>${nameRef}</strong>.</p>\n<p>Featuring lightweight breathable fabrics, contemporary cuts, and sustainable craftmanship.</p>\n<p><a href="/products" style="display:inline-block;padding:12px 24px;background:#0f172a;color:#fff;text-decoration:none;border-radius:6px;">Explore New Arrivals</a></p>`
        );
        setPushTitle(`${nameRef} is Now Live!`);
        setPushMessage(
          `Explore our latest curated seasonal arrivals designed for everyday elegance.`
        );
      }
      setAiGenerating(false);
      toast.success("AI generated campaign copy loaded into builder!");
    }, 600);
  };

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        {backHref && (
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        )}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Builder</h1>
          <p className="mt-1 text-muted-foreground">
            Create, schedule, and send targeted marketing campaigns via Resend Email and Push channels.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Editor */}
        <div className="space-y-6 md:col-span-2">
          {/* Campaign Details Card */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>
                Define your campaign objective and target audience segment.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="campaign-name">
                  Campaign Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="campaign-name"
                  placeholder="e.g. Fall Collection Launch 2026"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="target-segment">Audience Segment</Label>
                  <select
                    id="target-segment"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={targetSegment}
                    onChange={(e) => setTargetSegment(e.target.value)}
                  >
                    <option value="all">All Opted-In Customers</option>
                    <option value="vip">VIP & High-Spenders</option>
                    <option value="abandoned">Abandoned Cart Users (48h)</option>
                    <option value="new">New Customers (Joined last 30d)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Channel</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={channelType === "email" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => setChannelType("email")}
                    >
                      <Mail className="h-4 w-4" />
                      Email
                    </Button>
                    <Button
                      type="button"
                      variant={channelType === "push" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => setChannelType("push")}
                    >
                      <Bell className="h-4 w-4" />
                      Push
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content Composer Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Creative Content</CardTitle>
                <CardDescription>
                  Draft your message and personalize the delivery copy.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAiCopy}
                disabled={aiGenerating}
                className="gap-2 border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300"
              >
                {aiGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                )}
                AI Copy Assistant
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {channelType === "email" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email-subject">
                      Subject Line <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email-subject"
                      placeholder="e.g. Elevate Your Style — New Autumn Capsule Out Now"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="email-body">
                        HTML Message Body <span className="text-destructive">*</span>
                      </Label>
                      <span className="text-xs text-muted-foreground">HTML supported</span>
                    </div>
                    <Textarea
                      id="email-body"
                      placeholder="<h2>Hello Fashion Lover,</h2><p>Experience our latest arrivals...</p>"
                      className="min-h-[200px] font-mono text-sm"
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="push-title">
                      Push Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="push-title"
                      placeholder="e.g. ✨ New Collection Dropped!"
                      value={pushTitle}
                      onChange={(e) => setPushTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="push-message">
                      Push Message <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="push-message"
                      placeholder="e.g. Shop the Autumn capsule with exclusive 15% off using code AUTUMN15."
                      className="min-h-[120px]"
                      value={pushMessage}
                      onChange={(e) => setPushMessage(e.target.value)}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Actions & Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dispatch Controls</CardTitle>
              <CardDescription>
                Trigger delivery immediately or reserve for a planned schedule.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full gap-2"
                onClick={handleSendNow}
                disabled={isSending || isScheduling}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Now via {channelType === "email" ? "Resend" : "WebPush"}
              </Button>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  if (validateForm()) setIsScheduleModalOpen(true);
                }}
                disabled={isSending || isScheduling}
              >
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                Schedule for Later
              </Button>
            </CardContent>
          </Card>

          {/* Quick Preview */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Live Preview ({channelType.toUpperCase()})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {channelType === "email" ? (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="text-xs text-muted-foreground border-b pb-1">
                    <span className="font-semibold text-foreground">Subject:</span>{" "}
                    {subject || "(No subject set)"}
                  </div>
                  <div
                    className="prose prose-xs max-w-none text-xs text-muted-foreground pt-1"
                    dangerouslySetInnerHTML={{
                      __html: emailBody || "<em>Draft content will preview here...</em>",
                    }}
                  />
                </div>
              ) : (
                <div className="rounded-xl border bg-background p-4 shadow-sm space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center text-[10px] text-primary-foreground font-bold">
                      A
                    </div>
                    <span className="text-xs font-semibold text-foreground">Anchor Fashion</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">Now</span>
                  </div>
                  <div className="font-semibold text-xs text-foreground pt-1">
                    {pushTitle || "Notification Title"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {pushMessage || "Your notification body will appear here..."}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Campaign Activity History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Marketing Campaigns</CardTitle>
          <CardDescription>
            Live register of all sent, scheduled, and draft marketing campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Scheduled / Delivered</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingHistory ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span>Loading campaign history...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : campaignHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-28 text-center text-muted-foreground">
                      No campaigns recorded yet. Use the builder above to send or schedule your first campaign.
                    </TableCell>
                  </TableRow>
                ) : (
                  campaignHistory.map((c) => {
                    const isSent =
                      c.status === "sent" || c.status === "completed";
                    const isScheduled = c.status === "scheduled";
                    const isSending =
                      c.status === "sending" || c.status === "running";
                    const isFailed = c.status === "failed";

                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-foreground">
                          <div>{c.name}</div>
                          {c.subject && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {c.subject}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize text-xs">
                            {c.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isSent ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-xs font-normal">
                              Sent
                            </Badge>
                          ) : isScheduled ? (
                            <Badge className="bg-amber-600 hover:bg-amber-700 text-xs font-normal">
                              Scheduled
                            </Badge>
                          ) : isSending ? (
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-xs font-normal animate-pulse">
                              Sending...
                            </Badge>
                          ) : isFailed ? (
                            <Badge variant="destructive" className="text-xs font-normal">
                              Failed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs font-normal capitalize">
                              {c.status}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {c.schedule_time ? (
                            <div className="flex items-center gap-1 text-amber-600 font-medium">
                              <Clock className="h-3 w-3" />
                              {new Date(c.schedule_time).toLocaleString()}
                            </div>
                          ) : isSent ? (
                            <div className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle2 className="h-3 w-3" />
                              Delivered
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(c.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Modal */}
      <ScheduleCampaignDialog
        open={isScheduleModalOpen}
        onOpenChange={setIsScheduleModalOpen}
        campaignName={campaignName}
        onConfirmSchedule={handleConfirmSchedule}
        isScheduling={isScheduling}
      />
    </div>
  );
}
