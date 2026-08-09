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

export function isAdminUser(user) {
  if (!user) return false;
  const roles = user.roles || [];
  const permissions = user.permissions || [];

  const ADMIN_ROLES = [
    "SUPER_ADMIN",
    "SUPERADMIN",
    "ADMIN",
    "SUB_ADMIN",
    "STAFF",
    "WAREHOUSE_MANAGER",
    "SALESMAN",
    "SUPPLIER",
    "VENDOR",
  ];

  const hasAdminRole = roles.some((r) => ADMIN_ROLES.includes(r?.toUpperCase()));
  const hasAdminPermission =
    permissions.includes("*") ||
    permissions.some((p) => typeof p === "string" && (p.startsWith("admin.") || p.includes("manage")));

  return hasAdminRole || hasAdminPermission;
}

export function getDashboardUrl(user) {
  if (isAdminUser(user)) {
    return getAdminUrl("/admin");
  }
  return "/account/dashboard";
}

