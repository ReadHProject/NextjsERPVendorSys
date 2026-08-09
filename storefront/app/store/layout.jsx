"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CartIndicator } from "@/components/store/cart-indicator";
import { HeaderActions } from "@/components/store/header-actions";
import { Icon } from "@/components/ui/icon";
import { Toaster } from "@/components/ui/toaster";

export default function StoreLayout({ children }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/store/products?q=${encodeURIComponent(search.trim())}`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Toaster />
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
          <Link href="/store" className="flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-2xl text-primary">store</span>
            <span className="text-lg font-bold hidden sm:inline">Nexus Store</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-xl hidden md:flex">
            <div className="relative w-full">
              <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </form>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/store/products" className="px-3 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors">
              All Products
            </Link>
          </nav>

          <div className="flex items-center gap-1">
            <CartIndicator />
            <HeaderActions />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md hover:bg-muted transition-colors md:hidden"
            >
              <Icon name={mobileMenuOpen ? "x" : "menu"} size={22} />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border md:hidden">
            <div className="container mx-auto px-4 py-3 space-y-2">
              <form onSubmit={handleSearch} className="flex">
                <div className="relative w-full">
                  <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-10 pl-10 pr-4 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </form>
              <Link href="/store/products" className="block px-3 py-2 rounded-md text-sm font-medium hover:bg-muted" onClick={() => setMobileMenuOpen(false)}>
                All Products
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border bg-muted/50">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-2xl text-primary">store</span>
                <span className="text-lg font-bold">Nexus Store</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your one-stop multi-vendor marketplace for quality products.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Quick Links</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/store" className="hover:text-foreground transition-colors">Home</Link></li>
                <li><Link href="/store/products" className="hover:text-foreground transition-colors">Products</Link></li>
                <li><Link href="/store/cart" className="hover:text-foreground transition-colors">Cart</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Account</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/account" className="hover:text-foreground transition-colors">My Account</Link></li>
                <li><Link href="/account/orders" className="hover:text-foreground transition-colors">Order History</Link></li>
                <li><Link href="/account/wishlist" className="hover:text-foreground transition-colors">Wishlist</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/account/returns" className="hover:text-foreground transition-colors">Returns</Link></li>
                <li><span>Contact: support@nexusstore.com</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-border text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Nexus Store. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
