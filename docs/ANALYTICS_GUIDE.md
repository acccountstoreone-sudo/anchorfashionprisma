# Enterprise Analytics & Business Intelligence Guide

## Overview

This document outlines the usage of the Anchor Fashion Analytics and BI platform, covering event tracking, dashboard snapshots, and AI-powered forecasting.

## Event Tracking

To track user behavior, use the `trackEvent` server action from `actions/analytics.actions.ts`.

```typescript
import { trackEvent } from "@/actions/analytics.actions";

await trackEvent({
  event_category: "checkout",
  event_action: "completed",
  payload: { orderId: "123", amount: 150.0 },
});
```

## BI Dashboards

The BI platform automatically generates daily, weekly, and monthly snapshots of key metrics.
Dashboards are accessible via `/executive`, `/sales`, `/revenue`, and `/inventory`.

## AI Predictions (Gemini Integration)

The system leverages Google's Gemini 1.5 Pro to provide predictive insights for demand forecasting and customer lifetime value. Models pull historical data from Supabase and generate insights in real-time.
