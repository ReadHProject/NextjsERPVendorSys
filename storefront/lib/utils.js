import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatMoney(value, currency = "INR") {
  const n = typeof value === "number" ? value : value == null ? 0 : Number(value.toString());
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(Number.isFinite(n) ? n : 0);
}

export function formatDate(d) {
  if (!d) return "\u2014";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function slugify(s) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export function getAdminUrl(path = "") {
  if (typeof window === "undefined") {
    return (process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001") + path;
  }
  if (process.env.NEXT_PUBLIC_ADMIN_URL) {
    return `${process.env.NEXT_PUBLIC_ADMIN_URL}${path}`;
  }
  const origin = window.location.origin;
  if (origin.includes(":3000")) {
    return `${origin.replace(":3000", ":3001")}${path}`;
  }
  return `${origin}/admin${path}`;
}
