import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
// In a real application, ensure this key is 32 bytes and stored securely in environment variables.
function getEncryptionKey(): Buffer {
  const key =
    process.env.COURIER_ENCRYPTION_KEY ||
    process.env.ENCRYPTION_KEY ||
    "anchor_fashion_secure_key_32chr";
  if (key.length === 32) {
    return Buffer.from(key, "utf8");
  }
  return crypto.createHash("sha256").update(key).digest();
}

/**
 * Encrypts a text string.
 * @param text The text to encrypt.
 * @returns The encrypted string in the format iv:authTag:encryptedText
 */
export function encrypt(text: string): string {
  if (!text) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Checks if a string is encrypted in the iv:authTag:encryptedText format
 */
export function isEncryptedValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const parts = value.split(":");
  return (
    parts.length === 3 &&
    parts[0].length === 32 && // 16 bytes IV in hex
    parts[1].length === 32    // 16 bytes auth tag in hex
  );
}

/**
 * Decrypts an encrypted string.
 * @param encryptedText The encrypted text in the format iv:authTag:encryptedText
 * @returns The decrypted text.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  if (!isEncryptedValue(encryptedText)) {
    // If not encrypted format, return as-is (e.g. legacy plain values during migration)
    return encryptedText;
  }

  const parts = encryptedText.split(":");
  const [ivHex, authTagHex, encryptedHex] = parts;

  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Encrypts all sensitive key values in a credentials object.
 */
export function encryptCredentialsObject(
  creds: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(creds)) {
    if (typeof val === "string" && val.trim() !== "") {
      // Don't re-encrypt if already encrypted
      result[key] = isEncryptedValue(val) ? val : encrypt(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Decrypts all values in a credentials object for server-side provider usage.
 */
export function decryptCredentialsObject(
  creds: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(creds)) {
    if (typeof val === "string" && isEncryptedValue(val)) {
      try {
        result[key] = decrypt(val);
      } catch {
        result[key] = val;
      }
    } else {
      result[key] = val;
    }
  }
  return result;
}

/**
 * Masks credentials for secure UI rendering without leaking secrets to the client.
 * Example: "••••••••9X21"
 */
export function maskCredentialsObject(
  creds: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(creds)) {
    if (typeof val === "string" && val.trim() !== "") {
      const decrypted = isEncryptedValue(val) ? decrypt(val) : val;
      if (decrypted.length <= 4) {
        result[key] = "••••••••";
      } else {
        const last4 = decrypted.slice(-4);
        result[key] = `••••••••${last4}`;
      }
    } else {
      result[key] = val;
    }
  }
  return result;
}
