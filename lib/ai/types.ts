export interface AIPrompt {
  id: string;
  name: string;
  description?: string;
  category: string;
  model: string;
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: number;
  isActive: boolean;
}

export interface AIGatewayRequest {
  promptName: string;
  variables?: Record<string, string>;
  userId?: string;
  stream?: boolean;
}

export interface AIGatewayResponse {
  text: string;
  logId?: string;
}

export interface AILogEntry {
  promptId?: string;
  promptName: string;
  model: string;
  userId?: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
  costEstimatedUsd: number;
  status: "success" | "error" | "timeout";
  errorMessage?: string;
}

export interface AIGovernanceAction {
  id?: string;
  actionType: string;
  suggestedByModel: string;
  payload: Record<string, any>;
  confidenceScore: number;
  status: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface PersonalizationContext {
  userId: string;
  explicitPreferences: Record<string, any>;
  implicitPreferences: Record<string, any>;
  riskScore: number;
  lifetimeValuePredicted: number;
}

export interface RecommendationStrategy {
  id?: string;
  name: string;
  strategy: string;
  weight: number;
  config: Record<string, any>;
}
