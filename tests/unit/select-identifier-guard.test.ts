import { describe, it, expect } from "vitest";
import { isRawIdentifier } from "@/components/ui/select";

describe("Select Component - Raw Identifier & Hash Suppression", () => {
  it("should detect standard UUIDs as raw system identifiers", () => {
    expect(isRawIdentifier("714df504-c808-48b7-b127-0e63d64e2bf9")).toBe(true);
    expect(isRawIdentifier("04695ef6-3006-453b-a860-6b650bb7de24")).toBe(true);
    expect(isRawIdentifier("fc4ab9a5-7623-46ad-ada5-2bbdd95f3655")).toBe(true);
  });

  it("should detect long opaque hashes and CUIDs as raw identifiers", () => {
    // Exactly the user's reported bug string
    expect(isRawIdentifier("hdjasdfjhdavJHM4386e7ygef")).toBe(true);
    expect(isRawIdentifier("cuid_cl9z8y7x6000008l0h7w3b1q2")).toBe(true);
    expect(isRawIdentifier("clx1234567890abcdef123456")).toBe(true);
  });

  it("should NOT treat user-facing names as raw identifiers", () => {
    expect(isRawIdentifier("Men's Formal Panjabi")).toBe(false);
    expect(isRawIdentifier("T-Shirt")).toBe(false);
    expect(isRawIdentifier("Main Central Warehouse")).toBe(false);
    expect(isRawIdentifier("Active")).toBe(false);
    expect(isRawIdentifier("Draft")).toBe(false);
    expect(isRawIdentifier("Archived")).toBe(false);
    expect(isRawIdentifier("XL")).toBe(false);
    expect(isRawIdentifier("All Categories")).toBe(false);
    expect(isRawIdentifier("No Brand")).toBe(false);
    expect(isRawIdentifier("Routine Physical Count Discrepancy")).toBe(false);
  });

  it("should safely handle non-string or empty inputs", () => {
    expect(isRawIdentifier("")).toBe(false);
    expect(isRawIdentifier("   ")).toBe(false);
    expect(isRawIdentifier(null)).toBe(false);
    expect(isRawIdentifier(undefined)).toBe(false);
    expect(isRawIdentifier(12345)).toBe(false);
    expect(isRawIdentifier({})).toBe(false);
  });
});
