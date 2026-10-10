/**
 * Generates a crypto-secure UUID v4
 */
export function generateUuid(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-"); // Replace multiple - with single -
}

/**
 * Appends standard soft delete payload
 */
export function getSoftDeletePayload(userId: string) {
  return {
    deleted_at: new Date().toISOString(),
    deleted_by: userId,
    is_active: false,
  };
}

/**
 * Standard Audit Tracking Payload creation
 */
export function getAuditCreatePayload(userId: string) {
  return {
    created_at: new Date().toISOString(),
    created_by: userId,
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };
}

export function getAuditUpdatePayload(userId: string) {
  return {
    updated_at: new Date().toISOString(),
    updated_by: userId,
  };
}
