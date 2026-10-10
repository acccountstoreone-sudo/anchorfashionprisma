import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "৳"): string {
  if (amount === undefined || amount === null) return `${currency}0`;
  const symbol = currency.includes("(") ? currency.match(/\((.*?)\)/)?.[1] || currency : currency;
  return `${symbol}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
export function formatNumber(number: number | string): string {
  if (number === undefined || number === null) return "0";
  return new Intl.NumberFormat("en-US").format(Number(number));
}
