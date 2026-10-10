import { ObservabilityService } from "@/lib/observability";

/**
 * Known sensitive field names that must never appear in logs or client errors
 */
const SENSITIVE_KEYS = [
  "password",
  "password_hash",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "api_key",
  "apikey",
  "service_role",
  "authorization",
  "cookie",
  "credit_card",
  "card_number",
  "cvv",
  "ssn",
  "resend_api_key",
  "stripe_secret_key",
  "supabase_service_role_key",
];

/**
 * Recursively redacts sensitive keys from objects before logging
 */
export function sanitizeLogData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data !== "object") return data;

  if (Array.isArray(data)) {
    return data.map(sanitizeLogData);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    const isSensitive = SENSITIVE_KEYS.some((sensitive) =>
      key.toLowerCase().includes(sensitive)
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeLogData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Standard Application Error Base Class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = "INTERNAL_SERVER_ERROR",
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: string = "VALIDATION_ERROR") {
    super(message, 400, code, true);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Authentication required", code: string = "UNAUTHORIZED") {
    super(message, 401, code, true);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Access forbidden", code: string = "FORBIDDEN") {
    super(message, 403, code, true);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Resource not found", code: string = "NOT_FOUND") {
    super(message, 404, code, true);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code: string = "CONFLICT") {
    super(message, 409, code, true);
  }
}

/**
 * Structured logger entry format
 */
export interface StructuredLog {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "CRITICAL";
  context: string;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
  environment: string;
}

/**
 * Logs technical details server-side safely without leaking secrets
 */
export function logServerError(
  context: string,
  error: unknown,
  metadata?: Record<string, any>
): void {
  const isProd = process.env.NODE_ENV === "production";
  const timestamp = new Date().toISOString();
  const sanitizedMeta = metadata ? sanitizeLogData(metadata) : {};

  let message = "Unknown error occurred";
  let stack: string | undefined;

  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  } else if (typeof error === "string") {
    message = error;
  } else if (error && typeof error === "object") {
    message = (error as any).message || JSON.stringify(error);
  }

  // Redact secrets from stack and message if any were captured
  for (const key of SENSITIVE_KEYS) {
    const regex = new RegExp(`(${key}\\s*[=:]\\s*)[^\\s&,;]+`, "gi");
    message = message.replace(regex, "$1[REDACTED]");
    if (stack) {
      stack = stack.replace(regex, "$1[REDACTED]");
    }
  }

  const logPayload: StructuredLog = {
    timestamp,
    level: "ERROR",
    context,
    message,
    stack: !isProd || process.env.LOG_STACK_TRACES === "true" ? stack : undefined,
    metadata: sanitizedMeta,
    environment: process.env.NODE_ENV || "development",
  };

  // 1. Output structured JSON to console for Docker/Vercel/CloudWatch
  console.error(`[ERROR] [${context}]`, JSON.stringify(logPayload));

  // 2. Forward to Central Observability Service
  try {
    ObservabilityService.log({
      service_id: context,
      level: "ERROR",
      message: message.substring(0, 500),
      metadata: sanitizedMeta,
    }).catch(() => {
      // Avoid recursive crash if logging service fails
    });
  } catch {
    // Non-fatal
  }
}

/**
 * Formats a clean, safe, user-friendly error message for clients.
 * Never leaks SQL, column names, internal stack traces, or credentials.
 */
export function formatUserErrorMessage(error: unknown): string {
  if (error instanceof AppError && error.isOperational) {
    return error.message;
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // Catch common Postgres/Database technical errors
    if (msg.includes("duplicate key") || msg.includes("unique constraint")) {
      return "A record with this information already exists.";
    }
    if (msg.includes("foreign key") || msg.includes("violates foreign key")) {
      return "The referenced item could not be found or is in use.";
    }
    if (msg.includes("violates check constraint")) {
      return "Invalid data submitted. Please check the requirements.";
    }
    if (msg.includes("jwt") || msg.includes("token expired") || msg.includes("invalid token")) {
      return "Your session has expired. Please sign in again.";
    }
    if (msg.includes("rate limit") || msg.includes("too many requests")) {
      return "Too many requests. Please slow down and try again shortly.";
    }
    if (msg.includes("network") || msg.includes("fetch failed") || msg.includes("econnrefused")) {
      return "Network connection issue. Please check your internet connection.";
    }

    // If it's a known user-facing message, allow it through
    if (
      !msg.includes("select") &&
      !msg.includes("insert") &&
      !msg.includes("update") &&
      !msg.includes("delete") &&
      !msg.includes("supabase") &&
      !msg.includes("postgres") &&
      !msg.includes("prisma") &&
      !msg.includes("stack")
    ) {
      return error.message;
    }
  }

  return "An unexpected server error occurred. Please try again later.";
}
