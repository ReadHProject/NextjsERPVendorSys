"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Phone, KeyRound, Mail, Lock, ArrowLeft, Copy, Check } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "@/components/ui/toaster";
import { getStorefrontUrl } from "@/lib/utils";

const ADMIN_ROLES = ["SUPER_ADMIN", "SUPERADMIN", "ADMIN", "SUB_ADMIN", "STAFF", "WAREHOUSE_MANAGER", "SALESMAN", "SUPPLIER", "VENDOR"];

function isAdminUser(user) {
  if (!user) return false;
  const roles = user.roles || [];
  const permissions = user.permissions || [];
  return (
    roles.some((r) => ADMIN_ROLES.includes(r?.toUpperCase())) ||
    permissions.includes("*")
  );
}

export function UserLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mode, setMode] = useState("otp"); // "otp" | "password"

  // OTP State
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState("");
  const [copied, setCopied] = useState(false);

  // Password State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Status State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post("/auth/send-otp", { mobile, role: "CUSTOMER" });
      setOtpSent(true);
      if (data?.otp) setDevOtp(data.otp);
      toast.success("OTP sent successfully");
    } catch (err) {
      setError(err.message || "Failed to send OTP");
      toast.error(err.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post("/auth/verify-otp", { mobile, code: otp });
      if (data.accessToken) {
        localStorage.setItem("erp_access_token", data.accessToken);
      }
      toast.success("Welcome back!");
      handleRedirect(data);
    } catch (err) {
      setError(err.message || "Invalid or expired OTP");
      toast.error(err.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api.post("/auth/login", { email, password });
      if (data.accessToken) {
        localStorage.setItem("erp_access_token", data.accessToken);
      }
      toast.success("Welcome back!");
      handleRedirect(data);
    } catch (err) {
      setError(err.message || "Invalid email or password");
      toast.error(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = (data) => {
    const token = data?.accessToken || (typeof window !== "undefined" ? localStorage.getItem("erp_access_token") : null);
    const from = searchParams.get("from");
    if (from) {
      if (from.startsWith("http")) {
        const url = new URL(from);
        if (token) url.searchParams.set("token", token);
        window.location.href = url.toString();
      } else {
        router.push(from);
      }
      return;
    }
    if (isAdminUser(data.user)) {
      router.push("/admin");
    } else {
      const targetPath = token ? `/account/dashboard?token=${encodeURIComponent(token)}` : "/account/dashboard";
      window.location.href = getStorefrontUrl(targetPath);
    }
  };

  const copyDevOtp = () => {
    if (devOtp) {
      navigator.clipboard.writeText(devOtp);
      setCopied(true);
      setOtp(devOtp);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50/60 px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-stone-100 shadow-xl shadow-stone-200/50 transition-all">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mx-auto mb-4 text-rose-500 shadow-xs border border-rose-100/50">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Welcome Back</h1>
          <p className="text-stone-500 text-sm mt-1">Sign in to access your account</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-sm text-center font-medium">
            {error}
          </div>
        )}

        {/* OTP Flow */}
        {mode === "otp" && (
          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="tel"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="e.g. 9123456789"
                      maxLength={10}
                      required
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || mobile.length < 10}
                  className="w-full h-12 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-md shadow-rose-500/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? "Sending OTP..." : "Send OTP"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {devOtp && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/70 text-amber-800 text-sm flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-xs uppercase tracking-wider text-amber-600">On-Screen OTP</span>
                      <span className="text-base font-bold font-mono tracking-widest text-amber-900">{devOtp}</span>
                    </div>
                    <button
                      type="button"
                      onClick={copyDevOtp}
                      className="px-3 py-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-900 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                    Enter OTP
                  </label>
                  <div className="relative">
                    <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="XXXXXX"
                      maxLength={6}
                      required
                      className="w-full h-12 pl-11 pr-4 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm font-mono tracking-widest placeholder:tracking-normal placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all text-center"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full h-12 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-md shadow-rose-500/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(""); setDevOtp(""); setError(""); }}
                    className="text-stone-500 hover:text-stone-800 text-xs font-semibold hover:underline"
                  >
                    Change Phone Number
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => { setMode("password"); setError(""); }}
                className="text-rose-500 hover:text-rose-600 text-xs font-semibold hover:underline"
              >
                Sign in with Email & Password instead
              </button>
            </div>
          </div>
        )}

        {/* Password Flow */}
        {mode === "password" && (
          <form onSubmit={handlePasswordLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-stone-200 bg-white text-stone-900 text-sm placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-[0.99] text-white font-semibold text-sm transition-all shadow-md shadow-rose-500/20 disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setMode("otp"); setError(""); }}
                className="text-rose-500 hover:text-rose-600 text-xs font-semibold hover:underline"
              >
                Sign in with Phone OTP instead
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-stone-100 flex items-center justify-between text-xs">
          <a
            href={getStorefrontUrl("/store")}
            className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Store
          </a>
          <a
            href="/staff/login"
            className="text-stone-500 hover:text-rose-500 font-semibold transition-colors"
          >
            Staff / Admin Login →
          </a>
        </div>
      </div>
    </div>
  );
}
