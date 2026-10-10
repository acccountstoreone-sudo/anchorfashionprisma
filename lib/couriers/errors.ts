// ============================================================================
// Strongly-Typed Courier Exceptions
// ============================================================================

export class CourierError extends Error {
  readonly courierCode: string;
  readonly isTransient: boolean;

  constructor(courierCode: string, message: string, isTransient = false) {
    super(`[${courierCode.toUpperCase()}] ${message}`);
    this.name = "CourierError";
    this.courierCode = courierCode;
    this.isTransient = isTransient;
  }
}

export class CourierNotConfiguredError extends CourierError {
  constructor(courierCode: string, missingField?: string) {
    super(
      courierCode,
      missingField
        ? `Courier is not configured. Missing required field: ${missingField}`
        : "Courier credentials are not configured",
      false
    );
    this.name = "CourierNotConfiguredError";
  }
}

export class CourierAuthError extends CourierError {
  constructor(courierCode: string, message = "Authentication failed") {
    super(courierCode, message, false);
    this.name = "CourierAuthError";
  }
}

export class CourierValidationError extends CourierError {
  constructor(courierCode: string, message: string) {
    super(courierCode, message, false);
    this.name = "CourierValidationError";
  }
}

export class CourierNetworkError extends CourierError {
  constructor(courierCode: string, message = "Network/Timeout error", isTransient = true) {
    super(courierCode, message, isTransient);
    this.name = "CourierNetworkError";
  }
}

export class CourierRateLimitError extends CourierError {
  constructor(courierCode: string, message = "Rate limit exceeded") {
    super(courierCode, message, true);
    this.name = "CourierRateLimitError";
  }
}
