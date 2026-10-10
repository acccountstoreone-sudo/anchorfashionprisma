"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";

interface GeminiInsightBoxProps {
  context: "executive" | "sales" | "inventory" | "marketing" | "finance";
  dataPayload?: any; // The data we want the AI to analyze
}

export function GeminiInsightBox({
  context,
  dataPayload,
}: GeminiInsightBoxProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsight() {
      setLoading(true);
      try {
        // In a real app, this would be a POST to /api/ai/insights
        // with the context and data payload.
        // Mocking the AI response for now based on context:
        await new Promise((resolve) => setTimeout(resolve, 1500)); // Simulate API delay

        let mockInsight = "";
        switch (context) {
          case "executive":
            mockInsight =
              "Overall business health is excellent. Revenue is up 12.5% compared to the previous period, largely driven by a surge in Outerwear sales. However, customer churn has slightly increased, suggesting a need for targeted retention campaigns.";
            break;
          case "sales":
            mockInsight =
              "Sales peaked on the weekend. The recent 'Summer Blowout' campaign effectively increased Average Order Value by 5%. Consider extending similar promotions to underperforming categories like Accessories.";
            break;
          case "inventory":
            mockInsight =
              "Dead stock value has increased by $15k in the Dhaka Central warehouse. Recommend implementing a clearance sale for SKUs inactive for > 90 days. Stock turnover ratio remains healthy at 4.5.";
            break;
          default:
            mockInsight =
              "No specific insights available at this time. AI models are currently analyzing the latest data batches.";
        }

        setInsight(mockInsight);
      } catch (error) {
        console.error("Failed to fetch AI insight", error);
        setInsight("Unable to generate AI insights at this moment.");
      } finally {
        setLoading(false);
      }
    }

    fetchInsight();
  }, [context, dataPayload]);

  return (
    <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-sm dark:border-indigo-900 dark:from-indigo-950/20 dark:to-purple-950/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-base font-medium text-indigo-700 dark:text-indigo-400">
          <Sparkles className="mr-2 h-4 w-4" />
          Gemini AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Analyzing {context} data...</span>
          </div>
        ) : (
          <p className="text-sm leading-relaxed">{insight}</p>
        )}
      </CardContent>
    </Card>
  );
}
