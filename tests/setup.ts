// Vitest setup file
import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

// Mock next/font/google for Vitest jsdom tests
vi.mock("next/font/google", () => ({
  Jost: () => ({ className: "font-jost", variable: "--font-jost" }),
  Playfair_Display: () => ({ className: "font-playfair", variable: "--font-playfair" }),
  Inter: () => ({ className: "font-inter", variable: "--font-inter" }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock @neondatabase/auth/next for Vitest client environment
vi.mock("@neondatabase/auth/next", () => ({
  createAuthClient: () => ({
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signIn: vi.fn(),
    signUp: vi.fn(),
    getSession: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}));
