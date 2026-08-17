"use client";

import { Suspense } from "react";
import { UserLoginForm } from "@/components/user-login-form";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stone-50">
          <div className="text-sm text-stone-500 font-medium">Loading...</div>
        </div>
      }
    >
      <UserLoginForm />
    </Suspense>
  );
}

