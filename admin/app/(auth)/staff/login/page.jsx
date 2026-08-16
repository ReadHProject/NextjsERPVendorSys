"use client";

import { Suspense } from "react";
import { StaffLoginForm } from "@/components/staff-login-form";

export default function StaffLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <div className="text-sm text-stone-500 font-medium">Loading Staff Portal...</div>
        </div>
      }
    >
      <StaffLoginForm />
    </Suspense>
  );
}
