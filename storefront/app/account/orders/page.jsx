"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const statusColors = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  shipped: "secondary",
  delivered: "success",
  cancelled: "destructive",
};

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    api.get("/store/orders")
      .then((data) => setOrders(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined animate-spin text-4xl text-muted-foreground">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Order History</h1>
      {orders.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <span className="material-symbols-outlined text-4xl mb-4 block">receipt_long</span>
          <p>No orders yet.</p>
          <Link href="/store/products" className="mt-4 inline-block text-primary font-medium hover:underline">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="p-4 rounded-xl border border-outline-variant">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">Order #{order.orderNumber || order.id?.slice(0, 8)}</span>
                    <Badge variant={statusColors[order.status] || "default"}>
                      {order.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatMoney(order.totalAmount)}</p>
                  <p className="text-sm text-muted-foreground">{order.items?.length || 0} item(s)</p>
                </div>
              </div>
              {order.items && order.items.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-auto pb-1">
                  {order.items.slice(0, 4).map((item, i) => (
                    <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                      {item.product?.images?.[0]?.url && (
                        <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                  {order.items.length > 4 && (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                      +{order.items.length - 4}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
