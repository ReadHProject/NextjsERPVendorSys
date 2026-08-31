"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { getAdminUrl, isAdminUser, getDashboardUrl } from "@/lib/utils";

export function HeaderActions() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await api.get("/auth/me");
        if (data && data.id) {
          setUser(data);
        }
      } catch (err) {
        if (err.status !== 401) {
          console.error("Auth check failed", err);
        }
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, []);

  async function handleLogout() {
    try {
      await api.post("/auth/logout", {});
    } catch (e) {}
    if (typeof window !== "undefined") {
      localStorage.removeItem("erp_access_token");
      localStorage.removeItem("user");
    }
    toast.success("Logged out successfully");
    window.location.href = "/store";
  }

  const isAdmin = isAdminUser(user);
  const isAccountPage = pathname?.startsWith("/account");

  return (
    <div className="flex items-center gap-1">
      <ThemeToggle />
      {!loading && user ? (
        <div className="flex items-center gap-2">
          {isAdmin && !isAccountPage && (
            <a
              href={getAdminUrl("/admin")}
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors font-medium text-sm"
            >
              <Icon name="layout-dashboard" size={16} />
              Admin Dashboard
            </a>
          )}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-xl">account_circle</span>
              <span className="text-sm font-medium hidden sm:inline">{user.name?.split(' ')[0] || user.email?.split('@')[0] || "Account"}</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
                  {isAdmin ? (
                    <a
                      href={getAdminUrl("/admin")}
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors font-bold text-primary"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Icon name="layout-dashboard" size={16} />
                      Admin Dashboard
                    </a>
                  ) : (
                    <Link
                      href="/account/dashboard"
                      className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors font-semibold text-primary"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Icon name="layout-dashboard" size={16} />
                      My Dashboard
                    </Link>
                  )}
                  <Link
                    href="/account/profile"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon name="user" size={16} />
                    My Profile
                  </Link>
                  <Link
                    href="/account/orders"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon name="package" size={16} />
                    My Orders
                  </Link>
                  <Link
                    href="/account/wishlist"
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon name="heart" size={16} />
                    Wishlist
                  </Link>
                  <hr className="my-1 border-border" />
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors w-full text-left text-destructive"
                  >
                    <Icon name="log-out" size={16} />
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : !loading ? (
        <Link
          href="/login"
          className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors text-sm font-medium"
        >
          <Icon name="user" size={18} />
          <span className="hidden sm:inline">Login / Register</span>
        </Link>
      ) : null}
    </div>
  );
}
