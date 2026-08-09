"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProductFilters({ categories, brands, currentParams }) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(currentParams.category || "");
  const [selectedBrand, setSelectedBrand] = useState(currentParams.brand || "");

  function applyFilters(category, brand) {
    const params = new URLSearchParams();
    if (currentParams.q) params.set("q", currentParams.q);
    if (category) params.set("category", category);
    if (brand) params.set("brand", brand);
    if (currentParams.sort) params.set("sort", currentParams.sort);
    router.push(`/store/products?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold mb-3">Categories</h3>
        <div className="space-y-1">
          <button
            onClick={() => { setSelectedCategory(""); applyFilters("", selectedBrand); }}
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              !selectedCategory ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
            }`}
          >
            All Categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.slug || cat.id); applyFilters(cat.slug || cat.id, selectedBrand); }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedCategory === (cat.slug || cat.id)
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3">Brands</h3>
        <div className="space-y-1">
          <button
            onClick={() => { setSelectedBrand(""); applyFilters(selectedCategory, ""); }}
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              !selectedBrand ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
            }`}
          >
            All Brands
          </button>
          {brands.map((brand) => (
            <button
              key={brand.id}
              onClick={() => { setSelectedBrand(brand.slug || brand.id); applyFilters(selectedCategory, brand.slug || brand.id); }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                selectedBrand === (brand.slug || brand.id)
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted"
              }`}
            >
              {brand.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
