"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { toast } from "@/components/ui/toaster";

const returnStatusColors = {
  pending: "warning",
  approved: "info",
  rejected: "destructive",
  completed: "success",
};

export default function ReturnsPage() {
  const router = useRouter();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ orderId: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    api.get("/store/returns")
      .then((data) => setReturns(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await api.post("/store/returns", form);
      setReturns((prev) => [result, ...prev]);
      setShowForm(false);
      setForm({ orderId: "", reason: "" });
      toast.success("Return request submitted");
    } catch (err) {
      toast.error(err.message || "Failed to submit return request");
    } finally {
      setSubmitting(false);
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Returns</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all flex items-center gap-2"
        >
          <Icon name="plus" size={16} />
          New Return
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-outline-variant space-y-4 max-w-lg">
          <div>
            <label className="block text-sm font-medium mb-1">Order ID *</label>
            <input
              name="orderId"
              value={form.orderId}
              onChange={handleChange}
              required
              placeholder="Enter your order ID"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason *</label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Describe the reason for your return..."
              className="w-full min-h-[80px] px-3 py-2 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-6 rounded-lg bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="h-10 px-4 rounded-lg border border-outline-variant font-bold text-sm hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {returns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="rotate-ccw" size={48} className="mx-auto mb-4" />
          <p>No return requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map((ret) => (
            <div key={ret.id} className="p-4 rounded-xl border border-outline-variant">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-sm">Return #{ret.id?.slice(0, 8)}</span>
                    <Badge variant={returnStatusColors[ret.status] || "default"}>
                      {ret.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Order: {ret.orderId?.slice(0, 8)} &middot; {formatDate(ret.createdAt)}
                  </p>
                </div>
              </div>
              {ret.reason && (
                <p className="mt-2 text-sm text-muted-foreground">{ret.reason}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
