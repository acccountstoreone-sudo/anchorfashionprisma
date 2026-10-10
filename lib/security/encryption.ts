import crypto from "crypto";

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex"); // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16

/**
 * Enterprise Data Encryption Utility
 */
export const EncryptionService = {
  /**
   * Encrypts sensitive text data (Encryption at Rest / Transit)
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      "aes-256-cbc",
      Buffer.from(ENCRYPTION_KEY, "hex"),
      iv
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  },

  /**
   * Decrypts previously encrypted data
   */
  decrypt(text: string): string | null {
    try {
      const textParts = text.split(":");
      const iv = Buffer.from(textParts.shift()!, "hex");
      const encryptedText = Buffer.from(textParts.join(":"), "hex");
      const decipher = crypto.createDecipheriv(
        "aes-256-cbc",
        Buffer.from(ENCRYPTION_KEY, "hex"),
        iv
      );
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      console.error("Decryption failed", error);
      return null;
    }
  },

  /**
   * Masks PII data like emails (e.g., joh****@gmail.com)
   */
  maskEmail(email: string): string {
    if (!email) return "";
    const [name, domain] = email.split("@");
    if (!domain) return email;
    const maskedName =
      name.length > 3
        ? name.slice(0, 3) + "*".repeat(name.length - 3)
        : name + "***";
    return `${maskedName}@${domain}`;
  },

  /**
   * Masks phone numbers (e.g., ******1234)
   */
  maskPhone(phone: string): string {
    if (!phone) return "";
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 4) return "****";
    return "*".repeat(cleanPhone.length - 4) + cleanPhone.slice(-4);
  },

  /**
   * Masks credit card numbers (e.g., **** **** **** 1234)
   */
  maskCreditCard(cc: string): string {
    if (!cc) return "";
    const cleanCC = cc.replace(/\D/g, "");
    if (cleanCC.length < 4) return "****";
    return "*".repeat(cleanCC.length - 4) + cleanCC.slice(-4);
  },
};
