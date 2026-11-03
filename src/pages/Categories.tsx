import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ChevronRight, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { apiService } from "../services/apiService";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Pagination } from "../components/common/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

interface CategorySummary {
  name: string;
  productCount: number;
}

interface CategoryProduct {
  _id: string;
  name: string;
  displayName?: string;
  sku?: string;
  quantity: number;
  soldQuantity: number;
  salesRevenue: number;
  salesProfit: number;
}

const pageSize = 10;

export function Categories() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategorySummary[]>([]);
  const [categoryMeta, setCategoryMeta] = useState<any>(null);
  const [categoryPage, setCategoryPage] = useState(1);
  const [categorySearch, setCategorySearch] = useState("");
  const [categorySort, setCategorySort] = useState("name");
  const [categoryOrder, setCategoryOrder] = useState("asc");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryError, setCategoryError] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [productMeta, setProductMeta] = useState<any>(null);
  const [productPage, setProductPage] = useState(1);
  const [productSearch, setProductSearch] = useState("");
  const [productSort, setProductSort] = useState("name");
  const [productOrder, setProductOrder] = useState("asc");
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState("");

  useEffect(() => {
    let active = true;
    setCategoryLoading(true);
    setCategoryError("");
    apiService
      .getCategories(categorySearch, categoryPage, pageSize, categorySort, categoryOrder)
      .then((response) => {
        if (!active) return;
        setCategories(Array.isArray(response?.data) ? response.data : []);
        setCategoryMeta(response.meta);
      })
      .catch((error: any) => {
        if (!active) return;
        setCategoryError(error.response?.data?.message || error.message);
        setCategories([]);
        setCategoryMeta(null);
      })
      .finally(() => {
        if (active) setCategoryLoading(false);
      });
    return () => {
      active = false;
    };
  }, [categorySearch, categoryPage, categorySort, categoryOrder, refreshKey]);

  useEffect(() => {
    if (!selectedCategory) return;
    let active = true;
    setProductLoading(true);
    setProductError("");
    apiService
      .getCategoryProducts(
        selectedCategory,
        productSearch,
        productPage,
        pageSize,
        productSort,
        productOrder,
      )
      .then((response) => {
        if (!active) return;
        setProducts(Array.isArray(response?.data) ? response.data : []);
        setProductMeta(response.meta);
      })
      .catch((error: any) => {
        if (!active) return;
        setProductError(error.response?.data?.message || error.message);
        setProducts([]);
        setProductMeta(null);
      })
      .finally(() => {
        if (active) setProductLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedCategory, productSearch, productPage, productSort, productOrder]);

  const createCategory = async () => {
    const name = newCategory.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const saved = await apiService.createCategory(name);
      toast.success("Category saved", { description: saved.name });
      setNewCategory("");
      setCategorySearch("");
      setCategoryPage(1);
      setRefreshKey((key) => key + 1);
    } catch (error: any) {
      toast.error("Could not save category", {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setCreating(false);
    }
  };

  const openCategory = (name: string) => {
    setProductPage(1);
    setProductSearch("");
    setProductSort("name");
    setProductOrder("asc");
    setSelectedCategory(name);
  };

  if (selectedCategory) {
    const total = productMeta?.total || 0;
    return (
      <div className="mx-auto max-w-[1500px] space-y-6 p-4 text-slate-900 md:p-8">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="outline" size="icon" onClick={() => setSelectedCategory(null)} title="Back to categories">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Category</p>
              <h1 className="text-2xl font-black text-slate-900">{selectedCategory}</h1>
              <p className="mt-1 text-sm text-slate-500">{productMeta?.total ?? "..."} products</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-56">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={productSearch}
                onChange={(event) => {
                  setProductSearch(event.target.value);
                  setProductPage(1);
                }}
                placeholder="Search products..."
                className="pl-9"
              />
            </div>
            <select
              value={productSort}
              onChange={(event) => {
                setProductSort(event.target.value);
                setProductPage(1);
              }}
              className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
              aria-label="Sort category products"
            >
              <option value="name">Product name</option>
              <option value="stock">Current stock</option>
              <option value="sold">Units sold</option>
              <option value="revenue">Sales revenue</option>
              <option value="profit">Profit</option>
            </select>
            <Button
              variant="outline"
              onClick={() => setProductOrder((order) => order === "asc" ? "desc" : "asc")}
              title={productOrder === "asc" ? "Ascending" : "Descending"}
            >
              {productOrder === "asc" ? <ArrowUp className="mr-2 h-4 w-4" /> : <ArrowDown className="mr-2 h-4 w-4" />}
              {productOrder === "asc" ? "Ascending" : "Descending"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setProductSort("sold"); setProductOrder("desc"); setProductPage(1); }}>
            Best-selling
          </Button>
          <Button variant="outline" onClick={() => { setProductSort("sold"); setProductOrder("asc"); setProductPage(1); }}>
            Least-selling
          </Button>
          <Button variant="outline" onClick={() => { setProductSort("profit"); setProductOrder("desc"); setProductPage(1); }}>
            Most profitable
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Units sold</TableHead>
                  <TableHead className="text-right">Sales revenue</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400">Loading products...</TableCell></TableRow>
                ) : productError ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-rose-600">{productError}</TableCell></TableRow>
                ) : products.length ? products.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell className="font-semibold text-slate-800">{product.displayName || product.name}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{product.sku || "-"}</TableCell>
                    <TableCell className="text-right">{Number(product.quantity || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{Number(product.soldQuantity || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">৳{Number(product.salesRevenue || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-semibold">৳{Number(product.salesProfit || 0).toLocaleString()}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-400">No products in this category.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            currentPage={productPage}
            totalPages={Math.max(1, Math.ceil(total / pageSize))}
            onPageChange={setProductPage}
            totalItems={total}
            pageSize={pageSize}
            label="products"
          />
        </div>
      </div>
    );
  }

  const totalCategories = categoryMeta?.total || 0;
  const totalProductsOnPage = categories.reduce(
    (sum, category) => sum + (Number(category.productCount) || 0),
    0,
  );

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 text-slate-900 md:p-8">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase text-slate-900">Categories</h1>
          <p className="mt-1 text-sm text-slate-500">{totalCategories} categories · {totalProductsOnPage} products on this page</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={categorySearch}
              onChange={(event) => {
                setCategorySearch(event.target.value);
                setCategoryPage(1);
              }}
              placeholder="Search categories..."
              className="pl-9"
            />
          </div>
          <select
            value={categorySort}
            onChange={(event) => {
              setCategorySort(event.target.value);
              setCategoryPage(1);
            }}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            aria-label="Sort categories"
          >
            <option value="name">Category name</option>
            <option value="productCount">Product count</option>
          </select>
          <Button variant="outline" size="icon" onClick={() => setCategoryOrder((order) => order === "asc" ? "desc" : "asc")} title="Toggle sort direction">
            {categoryOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <form
        className="flex max-w-xl gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void createCategory();
        }}
      >
        <Input
          value={newCategory}
          onChange={(event) => setNewCategory(event.target.value)}
          placeholder="New category name"
          aria-label="New category name"
        />
        <Button type="submit" disabled={!newCategory.trim() || creating}>
          <Plus className="mr-2 h-4 w-4" />
          {creating ? "Saving..." : "Add category"}
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Products</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryLoading ? (
                <TableRow><TableCell colSpan={3} className="h-32 text-center text-slate-400">Loading categories...</TableCell></TableRow>
              ) : categoryError ? (
                <TableRow><TableCell colSpan={3} className="h-32 text-center text-rose-600">{categoryError}</TableCell></TableRow>
              ) : categories.length ? categories.map((category) => (
                <TableRow key={category.name}>
                  <TableCell>
                    <button className="font-semibold text-slate-800 hover:text-indigo-700" onClick={() => openCategory(category.name)}>
                      {category.name}
                    </button>
                  </TableCell>
                  <TableCell className="text-right font-medium">{category.productCount}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openCategory(category.name)} title={`View ${category.name}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={3} className="h-32 text-center text-slate-400">No categories found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <Pagination
          currentPage={categoryPage}
          totalPages={Math.max(1, Math.ceil(totalCategories / pageSize))}
          onPageChange={setCategoryPage}
          totalItems={totalCategories}
          pageSize={pageSize}
          label="categories"
        />
      </div>
    </div>
  );
}