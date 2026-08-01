import { api } from "@/lib/api";
import { notFound } from "next/navigation";
import { formatMoney } from "@/lib/utils";
import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { ProductCard } from "@/components/store/product-card";
import Image from "next/image";

export const revalidate = 30;

async function getProduct(id) {
  try {
    return await api.get(`/store/products/${id}`);
  } catch {
    return null;
  }
}

async function getRelatedProducts(productId, categoryId) {
  if (!categoryId) return [];
  try {
    return await api.get(`/store/products?category=${categoryId}&limit=4`);
  } catch {
    return [];
  }
}

export default async function ProductDetailPage({ params }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.categoryId);
  const primaryImage = product.images?.[0]?.url || product.thumbnailUrl || "/placeholder.png";
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <div className="relative aspect-square rounded-xl overflow-hidden border border-outline-variant bg-surface-container-lowest">
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            priority
          />
        </div>

        <div className="space-y-6">
          <div>
            {product.brand?.name && (
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {product.brand.name}
              </p>
            )}
            <h1 className="text-3xl font-bold">{product.name}</h1>
            {product.averageRating > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className={`material-symbols-outlined ${i < Math.round(product.averageRating) ? "text-amber-500" : "text-muted"}`}
                      style={{ fontSize: 18 }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.averageRating?.toFixed(1)} ({product.reviewCount} reviews)
                </span>
              </div>
            )}
          </div>

          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-bold text-primary">{formatMoney(product.price)}</span>
            {hasDiscount && (
              <>
                <span className="text-lg text-muted-foreground line-through">{formatMoney(product.compareAtPrice)}</span>
                <span className="text-sm font-medium text-destructive">
                  Save {formatMoney(product.compareAtPrice - product.price)}
                </span>
              </>
            )}
          </div>

          {product.description && (
            <div className="prose prose-sm max-w-none text-muted-foreground">
              <p>{product.description}</p>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className={`material-symbols-outlined ${product.stockQuantity > 0 ? "text-emerald-500" : "text-destructive"}`}>
                {product.stockQuantity > 0 ? "check_circle" : "cancel"}
              </span>
              <span className={product.stockQuantity > 0 ? "text-emerald-600" : "text-destructive"}>
                {product.stockQuantity > 0 ? "In Stock" : "Out of Stock"}
              </span>
            </div>
            {product.sku && (
              <span className="text-muted-foreground">SKU: {product.sku}</span>
            )}
          </div>

          <AddToCartButton product={product} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Related Products</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {related.filter((p) => p.id !== product.id).slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
