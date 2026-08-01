"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toaster";

export function HeaderActions() {
  const router = useRouter();
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
    localStorage.removeItem("erp_access_token");
    setUser(null);
    setMenuOpen(false);
    toast.success("Logged out successfully");
    router.push("/store");
  }

  return (
    <div className="flex items-center gap-1">
      <ThemeToggle />
      {!loading && user ? (
        <div className="flex items-center gap-2">
          <Link
            href="/account/dashboard"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors font-medium text-sm"
          >
            <Icon name="layout-dashboard" size={16} />
            Dashboard
          </Link>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-xl">account_circle</span>
              <span className="text-sm font-medium hidden sm:inline">{user.name?.split(' ')[0]}</span>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-50 py-1">
                  <Link
                    href="/account/dashboard"
                    className="flex sm:hidden items-center gap-2 px-4 py-2 text-sm hover:bg-muted transition-colors font-semibold text-primary"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Icon name="layout-dashboard" size={16} />
                    Dashboard
                  </Link>
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
