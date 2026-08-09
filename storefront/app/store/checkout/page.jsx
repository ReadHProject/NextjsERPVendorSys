"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatMoney } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import { Icon } from "@/components/ui/icon";

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    paymentMethod: "cod",
  });

  useEffect(() => {
    const stored = localStorage.getItem("cart");
    if (stored) {
      try { setItems(JSON.parse(stored)); } catch { setItems([]); }
    }
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const u = JSON.parse(user);
        setForm((f) => ({ ...f, fullName: u.firstName ? `${u.firstName} ${u.lastName || ""}`.trim() : f.fullName, email: u.email || f.email, phone: u.phone || f.phone }));
      } catch {}
    }
    setLoading(false);
  }, []);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 500 ? 0 : 49;
  const total = subtotal + shipping;

  async function handleSubmit(e) {
    e.preventDefault();
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setSubmitting(true);
    try {
      const order = await api.post("/store/orders", {
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: {
          fullName: form.fullName,
          phone: form.phone,
          email: form.email,
          line1: form.addressLine1,
          line2: form.addressLine2,
          city: form.city,
          state: form.state,
          pincode: form.pincode,
        },
        paymentMethod: form.paymentMethod,
      });
      localStorage.removeItem("cart");
      toast.success("Order placed successfully!");
      router.push(`/account/orders`);
    } catch (err) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

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
        <p className="text-muted-foreground">Add some products before checking out.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="p-6 rounded-xl border border-outline-variant space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Icon name="map-pin" size={20} />
                Shipping Address
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input name="fullName" value={form.fullName} onChange={handleChange} required className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone *</label>
                  <input name="phone" value={form.phone} onChange={handleChange} required className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Address Line 1 *</label>
                  <input name="addressLine1" value={form.addressLine1} onChange={handleChange} required className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Address Line 2</label>
                  <input name="addressLine2" value={form.addressLine2} onChange={handleChange} className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">City *</label>
                  <input name="city" value={form.city} onChange={handleChange} required className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">State *</label>
                  <input name="state" value={form.state} onChange={handleChange} required className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Pincode *</label>
                  <input name="pincode" value={form.pincode} onChange={handleChange} required className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl border border-outline-variant space-y-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Icon name="credit-card" size={20} />
                Payment Method
              </h2>
              <div className="space-y-2">
                {[
                  { value: "cod", label: "Cash on Delivery", icon: "cash" },
                  { value: "online", label: "Online Payment", icon: "card" },
                ].map((opt) => (
                  <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.paymentMethod === opt.value ? "border-primary bg-primary/5" : "border-outline-variant hover:bg-muted"}`}>
                    <input type="radio" name="paymentMethod" value={opt.value} checked={form.paymentMethod === opt.value} onChange={handleChange} className="accent-primary" />
                    <Icon name={opt.icon} size={18} />
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 p-6 rounded-xl border border-outline-variant space-y-4">
              <h2 className="font-bold text-lg">Order Summary</h2>
              <div className="space-y-3 max-h-60 overflow-auto">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-3 text-sm">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                      {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-clamp-1">{item.name}</p>
                      <p className="text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <span className="font-medium shrink-0">{formatMoney(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <hr className="border-border" />
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping === 0 ? "Free" : formatMoney(shipping)}</span>
                </div>
                <hr className="border-border" />
                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span>{formatMoney(total)}</span>
                </div>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              >
                {submitting ? "Placing Order..." : "Place Order"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
