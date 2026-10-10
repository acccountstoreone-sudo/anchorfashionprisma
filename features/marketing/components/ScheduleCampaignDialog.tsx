"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ScheduleCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignName: string;
  onConfirmSchedule: (scheduleDate: string) => Promise<void>;
  isScheduling?: boolean;
}

export function ScheduleCampaignDialog({
  open,
  onOpenChange,
  campaignName,
  onConfirmSchedule,
  isScheduling = false,
}: ScheduleCampaignDialogProps) {
  // Default to tomorrow 10:00 AM
  const defaultDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const defaultIso = defaultDate.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM

  const [scheduledTime, setScheduledTime] = useState<string>(defaultIso);

  const handleSchedule = async () => {
    const selected = new Date(scheduledTime);
    if (isNaN(selected.getTime())) {
      toast.error("Please enter a valid date and time");
      return;
    }

    if (selected <= new Date()) {
      toast.error("Scheduled time must be in the future");
      return;
    }

    await onConfirmSchedule(selected.toISOString());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Schedule Campaign Delivery
          </DialogTitle>
          <DialogDescription>
            Choose when &quot;{campaignName || "this campaign"}&quot; should be dispatched to your target audience.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label htmlFor="schedule-datetime">Execution Date & Time</Label>
            <Input
              id="schedule-datetime"
              type="datetime-local"
              value={scheduledTime}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="h-3.5 w-3.5" />
              Campaign will be automatically processed by background worker.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isScheduling}
          >
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={isScheduling}>
            {isScheduling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scheduling...
              </>
            ) : (
              "Confirm Schedule"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
