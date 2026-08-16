"use client";

import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { setCredentials, logout } from "../store/slices/authSlice";
import { api } from "../lib/api";

function AuthProvider({ children }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    async function hydrate() {
      try {
        if (typeof window !== "undefined") {
          const searchParams = new URLSearchParams(window.location.search);
          const urlToken = searchParams.get("token");
          if (urlToken) {
            localStorage.setItem("erp_access_token", urlToken);
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
          }
        }
        const data = await api.get("/auth/me");
        const token = localStorage.getItem("erp_access_token");
        dispatch(setCredentials({ user: data, accessToken: token || "" }));

        const roles = data.roles || [];
        const permissions = data.permissions || [];
        const ADMIN_ROLES = ["SUPER_ADMIN", "SUPERADMIN", "ADMIN", "SUB_ADMIN", "STAFF", "WAREHOUSE_MANAGER", "SALESMAN", "SUPPLIER", "VENDOR"];
        const isAdmin = roles.some((r) => ADMIN_ROLES.includes(r?.toUpperCase())) || permissions.includes("*");

        if (!isAdmin && typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
          const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";
          window.location.href = `${storefrontUrl}/account/dashboard`;
          return;
        }

        setHydrated(true);
      } catch {
        localStorage.removeItem("erp_access_token");
        dispatch(logout());
        router.replace("/admin/login");
      }
    }
    hydrate();
  }, [dispatch, router]);

  if (!hydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return children;
}

export { AuthProvider };
