"use client";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useEffect, useState } from "react";

export function CartIndicator() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const stored = localStorage.getItem("cart");
    if (stored) {
      try {
        const items = JSON.parse(stored);
        setCount(items.reduce((sum, item) => sum + item.quantity, 0));
      } catch { setCount(0); }
    }

    function handleStorage() {
      const stored = localStorage.getItem("cart");
      if (stored) {
        try {
          const items = JSON.parse(stored);
          setCount(items.reduce((sum, item) => sum + item.quantity, 0));
        } catch { setCount(0); }
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <Link href="/store/cart" className="relative p-2 rounded-md hover:bg-muted transition-colors">
      <Icon name="shopping-cart" size={22} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
