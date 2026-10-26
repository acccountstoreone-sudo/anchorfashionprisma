import { Jost, Playfair_Display, Inter } from "next/font/google";

export const jost = Jost({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jost",
  fallback: ["system-ui", "sans-serif"],
});

export const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  fallback: ["Georgia", "serif"],
});

export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  fallback: ["system-ui", "sans-serif"],
});
