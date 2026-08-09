"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toaster";

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("cart");
    if (stored) {
      try { setItems(JSON.parse(stored)); } catch { setItems([]); }
    }
    setLoading(false);
  }, []);

  function updateQuantity(index, delta) {
    const updated = [...items];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = Math.min(newQty, updated[index].stockQuantity || 99);
    }
    setItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
  }

  function removeItem(index) {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
    localStorage.setItem("cart", JSON.stringify(updated));
    toast.info("Item removed from cart");
  }

  function clearCart() {
    setItems([]);
    localStorage.removeItem("cart");
    toast.info("Cart cleared");
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 49;
  const total = subtotal + shipping;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-muted-foreground">progress_activity</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <Icon name="shopping-cart" size={48} className="mx-auto mb-4 text-muted-foreground" />
        <h1 className="text-2xl font-bold mb-2">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">Start shopping to add items to your cart</p>
        <Link
          href="/store/products"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Shopping Cart ({items.length} items)</h1>
        <button onClick={clearCart} className="text-sm text-destructive hover:underline">
          Clear Cart
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map((item, index) => (
            <div key={item.productId} className="flex gap-4 p-4 rounded-xl border border-outline-variant">
              <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <Link href={`/store/products/${item.productId}`} className="font-semibold hover:text-primary transition-colors line-clamp-1">
                  {item.name}
                </Link>
                <p className="text-primary font-bold mt-1">{formatMoney(item.price)}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center border border-outline-variant rounded-lg">
                    <button
                      onClick={() => updateQuantity(index, -1)}
                      className="p-1.5 hover:bg-muted transition-colors rounded-l-lg"
                    >
                      <Icon name="minus" size={14} />
                    </button>
                    <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(index, 1)}
                      className="p-1.5 hover:bg-muted transition-colors rounded-r-lg"
                      disabled={item.quantity >= (item.stockQuantity || 99)}
                    >
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                  <button onClick={() => removeItem(index)} className="text-destructive hover:underline text-sm">
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold">{formatMoney(item.price * item.quantity)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 p-6 rounded-xl border border-outline-variant space-y-4">
            <h2 className="font-bold text-lg">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium">{shipping === 0 ? "Free" : formatMoney(shipping)}</span>
              </div>
              {shipping > 0 && (
                <p className="text-xs text-muted-foreground">
                  Free shipping on orders above {formatMoney(500)}
                </p>
              )}
              <hr className="border-border" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
            </div>
            <button
              onClick={() => router.push("/store/checkout")}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all active:scale-95"
            >
              Proceed to Checkout
            </button>
            <Link href="/store/products" className="block text-center text-sm text-primary hover:underline">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
