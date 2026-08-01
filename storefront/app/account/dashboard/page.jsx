"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { getAdminUrl } from "@/lib/utils";

function getRoleMeta(roles = []) {
  if (roles.includes("SUPER_ADMIN") || roles.includes("ADMIN") || roles.includes("SUB_ADMIN")) {
    return {
      label: "Administrator",
      discount: "Admin Pricing",
      credit: "Full System Access",
      badgeBg: "bg-purple-100 text-purple-700",
      isAdmin: true,
    };
  }
  if (roles.includes("DISTRIBUTOR")) {
    return { label: "Distributor", discount: "35-45% OFF", credit: "45 Days", badgeBg: "bg-indigo-100 text-indigo-700" };
  }
  if (roles.includes("WHOLESALER")) {
    return { label: "Wholesaler", discount: "30-40% OFF", credit: "30 Days", badgeBg: "bg-violet-100 text-violet-700" };
  }
  if (roles.includes("DEALER")) {
    return { label: "Dealer", discount: "20-30% OFF", credit: "15 Days", badgeBg: "bg-blue-100 text-blue-700" };
  }
  if (roles.includes("RETAILER")) {
    return { label: "Retailer", discount: "10-20% OFF", credit: "7 Days", badgeBg: "bg-emerald-100 text-emerald-700" };
  }
  if (roles.includes("PARLOUR")) {
    return { label: "Beauty Parlour", discount: "15-25% OFF", credit: "15 Days", badgeBg: "bg-pink-100 text-pink-700" };
  }
  if (roles.includes("SALESMAN")) {
    return { label: "Sales Representative", discount: "Sales Partner", credit: "Internal", badgeBg: "bg-amber-100 text-amber-700" };
  }
  return { label: "Customer", discount: "Standard Member", credit: "Prepaid / COD", badgeBg: "bg-gray-100 text-gray-700" };
}

export default function DashboardPage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const data = await api.get("/auth/me");
        if (data && data.id) {
          setUser(data);
        }
      } catch (e) {}
    }
    fetchUser();
  }, []);

  const roleMeta = getRoleMeta(user?.roles || []);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0] || 'Guest'}!
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your account today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`${roleMeta.badgeBg} px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 self-start sm:self-auto shadow-sm`}>
            <Icon name="star" size={16} />
            {roleMeta.label} Tier
          </div>
          {roleMeta.isAdmin && (
            <a
              href={getAdminUrl("/admin")}
              className="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm transition-colors"
            >
              <Icon name="layout-dashboard" size={16} />
              Admin App
            </a>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 font-medium text-sm">Total Orders</span>
            <Icon name="package" size={18} className="text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">0</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 font-medium text-sm">Pending Orders</span>
            <Icon name="clock" size={18} className="text-orange-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">0</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 font-medium text-sm">This Month</span>
            <Icon name="trending-up" size={18} className="text-green-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">₹0</div>
          <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
            <Icon name="trending-up" size={12} /> Tier Active
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 font-medium text-sm">Role Status</span>
            <Icon name="shield" size={18} className="text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-gray-900 truncate">{roleMeta.label}</div>
          <div className="text-xs text-gray-400 mt-1">Role Managed via Admin</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pricing Benefits */}
        <div className="lg:col-span-1 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] rounded-2xl p-6 text-white shadow-md flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6">
            <Icon name="tag" size={20} />
            <h3 className="font-bold text-lg">Your Pricing Benefits</h3>
          </div>
          
          <div className="space-y-3 mb-8">
            <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
              <span className="text-white/80 text-sm font-medium">Discount Tier</span>
              <span className="font-bold text-lg">{roleMeta.discount}</span>
            </div>
            <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between backdrop-blur-sm">
              <span className="text-white/80 text-sm font-medium">Credit Terms</span>
              <span className="font-bold text-lg">{roleMeta.credit}</span>
            </div>
          </div>
          
          <div className="mt-auto">
            <Link href="/store" className="block w-full bg-white text-[#7c3aed] font-bold text-center py-3 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
              Browse Catalog
            </Link>
          </div>
        </div>

        {/* Quick Actions & Recent Orders Wrapper */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Quick Actions Grid */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              <Link href="/store" className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <Icon name="shopping-bag" size={20} />
                </div>
                <span className="text-xs font-semibold text-gray-600 group-hover:text-blue-600">Shop</span>
              </Link>
              <Link href="/account/orders" className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                  <Icon name="package" size={20} />
                </div>
                <span className="text-xs font-semibold text-gray-600 group-hover:text-purple-600">Orders</span>
              </Link>
              <Link href="/store/cart" className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-[#fdecf0] group-hover:text-[#E92B58] transition-colors">
                  <Icon name="shopping-cart" size={20} />
                </div>
                <span className="text-xs font-semibold text-gray-600 group-hover:text-[#E92B58]">Cart</span>
              </Link>
              <Link href="/account/orders" className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <Icon name="file-text" size={20} />
                </div>
                <span className="text-xs font-semibold text-gray-600 group-hover:text-emerald-600">Invoices</span>
              </Link>
              <Link href="/account/profile" className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-gray-100 group-hover:text-gray-900 transition-colors">
                  <Icon name="settings" size={20} />
                </div>
                <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900">Settings</span>
              </Link>
              <Link href="/account/wishlist" className="flex flex-col items-center gap-2 group">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                  <Icon name="heart" size={20} />
                </div>
                <span className="text-xs font-semibold text-gray-600 group-hover:text-red-600">Wishlist</span>
              </Link>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex-1">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-bold text-lg text-gray-900">Recent Orders</h3>
              <Link href="/account/orders" className="text-sm font-bold text-[#E92B58] hover:underline">
                View All
              </Link>
            </div>
            
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-300">
                <Icon name="package" size={32} />
              </div>
              <p className="text-gray-500 font-medium">No orders yet. Start shopping!</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
