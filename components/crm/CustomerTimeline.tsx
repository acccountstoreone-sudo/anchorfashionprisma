"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, FileText } from "lucide-react";

export function CustomerTimeline({ timeline }: { timeline: any[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <div className="space-y-4">
            {timeline.map((item, idx) => (
              <div key={idx} className="flex gap-4">
                <div className="mt-1">
                  {item.type === "note" ? (
                    <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                      <FileText className="h-4 w-4" />
                    </div>
                  ) : (
                    <div className="rounded-full bg-green-100 p-2 text-green-600">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {item.type === "note"
                      ? "Internal Note added"
                      : `Communication: ${item.data.type}`}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.type === "note"
                      ? item.data.content
                      : item.data.subject}
                  </p>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.date), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
