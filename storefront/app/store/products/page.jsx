import { api } from "@/lib/api";
import { ProductCard } from "@/components/store/product-card";
import { ProductFilters } from "./filters";

export const revalidate = 30;

async function getProducts(searchParams) {
  const params = new URLSearchParams();
  if (searchParams.q) params.set("q", searchParams.q);
  if (searchParams.category) params.set("category", searchParams.category);
  if (searchParams.brand) params.set("brand", searchParams.brand);
  if (searchParams.minPrice) params.set("minPrice", searchParams.minPrice);
  if (searchParams.maxPrice) params.set("maxPrice", searchParams.maxPrice);
  if (searchParams.sort) params.set("sort", searchParams.sort);
  params.set("limit", searchParams.limit || "24");

  const qs = params.toString();
  try {
    const [products, categories, brands] = await Promise.all([
      api.get(`/store/products?${qs}`),
      api.get("/store/categories"),
      api.get("/store/brands"),
    ]);
    return { products, categories, brands };
  } catch {
    return { products: [], categories: [], brands: [] };
  }
}

export default async function ProductsPage({ searchParams }) {
  const resolvedParams = await searchParams;
  const { products, categories, brands } = await getProducts(resolvedParams);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <ProductFilters
            categories={categories}
            brands={brands}
            currentParams={resolvedParams}
          />
        </aside>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {resolvedParams.q ? `Results for "${resolvedParams.q}"` : "All Products"}
              </h1>
              <p className="text-muted-foreground mt-1">
                {products.length} product{products.length !== 1 ? "s" : ""} found
              </p>
            </div>
          </div>
          {products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <span className="material-symbols-outlined text-4xl mb-4 block">search_off</span>
              <p>No products found matching your criteria.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
