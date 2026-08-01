"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toaster";

export default function WishlistPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    api.get("/store/wishlist")
      .then((data) => setItems(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  async function removeItem(productId) {
    try {
      await api.delete(`/store/wishlist/${productId}`);
      setItems((prev) => prev.filter((w) => w.productId !== productId));
      toast.info("Removed from wishlist");
    } catch (err) {
      toast.error(err.message || "Failed to remove");
    }
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined animate-spin text-4xl text-muted-foreground">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Wishlist</h1>
      {items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="heart" size={48} className="mx-auto mb-4" />
          <p>Your wishlist is empty.</p>
          <Link href="/store/products" className="mt-4 inline-block text-primary font-medium hover:underline">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => {
            const product = item.product || item;
            return (
              <div key={item.id || item.productId} className="p-4 rounded-xl border border-outline-variant">
                <Link href={`/store/products/${product.id || item.productId}`} className="block">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-3">
                    {product.images?.[0]?.url && (
                      <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2">{product.name}</h3>
                  <p className="text-primary font-bold mt-1">{formatMoney(product.price)}</p>
                </Link>
                <button
                  onClick={() => removeItem(product.id || item.productId)}
                  className="mt-2 text-sm text-destructive hover:underline flex items-center gap-1"
                >
                  <Icon name="trash" size={14} />
                  Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
