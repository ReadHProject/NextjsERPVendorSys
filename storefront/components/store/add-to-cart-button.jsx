"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toaster";

export function AddToCartButton({ product, className = "" }) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  function addToCart() {
    setLoading(true);
    try {
      const stored = localStorage.getItem("cart");
      const items = stored ? JSON.parse(stored) : [];
      const existing = items.find((i) => i.productId === product.id);

      if (existing) {
        existing.quantity += quantity;
      } else {
        items.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.images?.[0]?.url || product.thumbnailUrl || "/placeholder.png",
          quantity,
          stockQuantity: product.stockQuantity,
        });
      }

      localStorage.setItem("cart", JSON.stringify(items));
      window.dispatchEvent(new Event("storage"));
      toast.success(`${product.name} added to cart`);
    } catch {
      toast.error("Failed to add to cart");
    } finally {
      setLoading(false);
    }
  }

  const outOfStock = product.stockQuantity <= 0;

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center border border-outline-variant rounded-lg">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="p-2 hover:bg-muted transition-colors rounded-l-lg"
            disabled={outOfStock}
          >
            <Icon name="minus" size={16} />
          </button>
          <span className="w-12 text-center text-sm font-medium">{quantity}</span>
          <button
            onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
            className="p-2 hover:bg-muted transition-colors rounded-r-lg"
            disabled={outOfStock || quantity >= product.stockQuantity}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
        <span className="text-sm text-muted-foreground">
          {product.stockQuantity} available
        </span>
      </div>
      <button
        onClick={addToCart}
        disabled={outOfStock || loading}
        className="flex items-center justify-center gap-2 h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50"
      >
        <Icon name="shopping-cart" size={18} />
        {outOfStock ? "Out of Stock" : "Add to Cart"}
      </button>
    </div>
  );
}
