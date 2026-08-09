"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { Icon } from "@/components/ui/icon";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/register", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        role: "customer",
      });
      toast.success("Account created! Please sign in.");
      router.push("/login");
    } catch (err) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/store" className="inline-flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-3xl text-primary">store</span>
            <span className="text-xl font-bold">Nexus Store</span>
          </Link>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-muted-foreground mt-1">Join us to start shopping</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 rounded-xl border border-outline-variant bg-card space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                required
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                required
                minLength={6}
                placeholder="Min 6 characters"
                className="w-full h-10 px-3 pr-10 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                <Icon name={showPassword ? "eye-off" : "eye"} size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password *</label>
            <input
              name="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              placeholder="Re-enter password"
              className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
