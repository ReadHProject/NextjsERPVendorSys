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
  let cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (!cleanPath.startsWith("/admin") && !cleanPath.startsWith("http")) {
    cleanPath = `/admin${cleanPath}`;
  }

  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin.includes(":3000")) {
      return `${origin.replace(":3000", ":3001")}${cleanPath}`;
    }
    const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
    if (adminUrl && !adminUrl.includes("localhost") && !adminUrl.includes("127.0.0.1")) {
      return `${adminUrl.replace(/\/$/, "")}${cleanPath.replace(/^\/admin/, "")}`;
    }
    return `${origin}${cleanPath}`;
  }

  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL;
  if (adminUrl && !adminUrl.includes("localhost") && !adminUrl.includes("127.0.0.1")) {
    return `${adminUrl.replace(/\/$/, "")}${cleanPath.replace(/^\/admin/, "")}`;
  }
  return cleanPath;
}

export function isAdminUser(user) {
  if (!user) return false;
  const roles = user.roles || [];
  const permissions = user.permissions || [];

  const STRICT_ADMIN_ROLES = [
    "SUPER_ADMIN",
    "SUPERADMIN",
    "ADMIN",
    "SUB_ADMIN",
  ];

  const hasAdminRole = roles.some((r) => STRICT_ADMIN_ROLES.includes(r?.toUpperCase()));
  const hasAdminPermission =
    permissions.includes("*") ||
    permissions.some((p) => typeof p === "string" && p.startsWith("admin."));

  return hasAdminRole || hasAdminPermission;
}

export function getDashboardUrl(user) {
  if (isAdminUser(user)) {
    return getAdminUrl("/admin");
  }
  return "/account/dashboard";
}

