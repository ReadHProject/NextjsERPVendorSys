"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { api } from "@/lib/api";
import StoreLayout from "../store/layout";
import { LoadingAnimation } from "@/components/ui/loading-animation";
const navItems = [
  { href: "/account/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/store", label: "Shop Products", icon: "store" },
  { href: "/account/orders", label: "My Orders", icon: "package" },
  { href: "/account/profile", label: "My Profile", icon: "user" },
  { href: "/account/addresses", label: "Addresses", icon: "map-pin" },
];

export default function AccountLayout({ children }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");
      if (token) {
        localStorage.setItem("erp_access_token", token);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    async function checkAuth() {
      try {
        const data = await api.get("/auth/me");
        if (data && data.id) {
          setUser(data);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Auth check failed in layout", err);
      }
      window.location.href = "/login?from=" + encodeURIComponent(window.location.href);
    }
    checkAuth();
  }, []);

  async function handleLogout() {
    try {
      await api.post("/auth/logout", {});
    } catch (e) {}
    localStorage.removeItem("erp_access_token");
    window.location.href = "/store";
  }

  if (loading) {
    return (
      <StoreLayout>
        <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
          <LoadingAnimation type="spinner" />
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="bg-[#fafafa] min-h-screen pt-6 pb-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-6">
            <aside className="w-full md:w-[280px] shrink-0">
              <div className="sticky top-24 space-y-6">
                
                <div className="p-4 rounded-2xl border border-gray-200 bg-white shadow-sm space-y-1">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href || (pathname === '/account' && item.href === '/account/dashboard');
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-[#fdecf0] text-[#E92B58]"
                            : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <Icon name={item.icon} size={18} />
                        {item.label}
                      </Link>
                    );
                  })}
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors hover:bg-red-50 text-gray-600 hover:text-red-600 w-full text-left"
                  >
                    <Icon name="log-out" size={18} />
                    Logout
                  </button>
                </div>

                {/* Need Help Card */}
                <div className="p-6 rounded-2xl border border-blue-100 bg-blue-50 shadow-sm text-center md:text-left">
                  <h3 className="font-bold text-blue-900 mb-2">Need Help?</h3>
                  <p className="text-sm text-blue-700 mb-5 leading-relaxed">
                    Contact our support team for assistance with your orders.
                  </p>
                  <button className="w-full bg-blue-600 text-white font-bold text-sm py-3 rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-md">
                    <Icon name="phone" size={18} />
                    Contact Support
                  </button>
                </div>

              </div>
            </aside>
            
            <div className="flex-1 min-w-0">
              {children}
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
