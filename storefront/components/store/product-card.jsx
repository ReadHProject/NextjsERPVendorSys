"use client";
import Link from "next/link";
import Image from "next/image";
import { formatMoney } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }) {
  const primaryImage = product.images?.[0]?.url || product.thumbnailUrl || "/placeholder.png";
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <Link href={`/store/products/${product.id}`} className="group block">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <Image
          src={primaryImage}
          alt={product.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {hasDiscount && (
          <Badge variant="destructive" className="absolute top-2 left-2">
            -{discountPercent}%
          </Badge>
        )}
        {product.stockQuantity <= 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Badge variant="secondary">Out of Stock</Badge>
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1">
        {product.brand?.name && (
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {product.brand.name}
          </p>
        )}
        <h3 className="text-sm font-semibold text-on-surface line-clamp-2 group-hover:text-primary transition-colors">
          {product.name}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-on-surface">
            {formatMoney(product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-muted-foreground line-through">
              {formatMoney(product.compareAtPrice)}
            </span>
          )}
        </div>
        {product.averageRating > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="material-symbols-outlined text-amber-500" style={{ fontSize: 14 }}>star</span>
            <span>{product.averageRating?.toFixed(1)}</span>
            {product.reviewCount > 0 && <span>({product.reviewCount})</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
