import React, { useState, useEffect } from "react";
import {
  Store,
  Package,
  ArrowLeft,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  History,
  ShoppingCart,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { useAppSelector } from "../store/hooks";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Pagination } from "../components/common/Pagination";
import { DateRangeSelect } from "../components/common/DateRangeSelect";
import { apiService } from "../services/apiService";

interface Props {
  dealerId: string | null;
  onBack: () => void;
}

export function DealerSupplyHistoryPage({ dealerId, onBack }: Props) {
  const { dealers } = useAppSelector((state) => state.dealers);
  const [dealerProducts, setDealerProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [page, setPage] = useState(1);
  const [range, setRange] = useState("all");
  const [productSearchInput, setProductSearchInput] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [meta, setMeta] = useState<{
    page: number;
    limit: number;
    total: number;
  }>({ page: 1, limit: 10, total: 0 });
  const pageSize = 10;
  // In a real app, you'd fetch "PURCHASE" transactions or just products linked to this dealer
  const dealer = dealers.find((d) => d._id === dealerId || d.id === dealerId);

  useEffect(() => {
    const timer = window.setTimeout(
      () => setProductSearch(productSearchInput.trim()),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [productSearchInput]);

  useEffect(() => {
    let active = true;
    if (!dealerId) {
      setDealerProducts([]);
      setMeta({ page: 1, limit: pageSize, total: 0 });
      setLoadingProducts(false);
      return;
    }
    setLoadingProducts(true);
    apiService
      .getInventory(
        productSearch,
        "all",
        sortBy,
        order,
        page,
        pageSize,
        range,
        dealerId,
      )
      .then((response) => {
        if (!active) return;
        setDealerProducts(response.data || []);
        setMeta(response.meta || { page, limit: pageSize, total: 0 });
      })
      .catch(() => {
        if (active) {
          setDealerProducts([]);
          setMeta({ page, limit: pageSize, total: 0 });
        }
      })
      .finally(() => {
        if (active) setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [dealerId, page, range, productSearch, sortBy, order]);

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto text-slate-900">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full bg-white border border-slate-200"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic">
            Supply Node Logs: {dealer?.name}
          </h2>
          <p className="text-sm text-slate-500 font-medium italic">
            History of procurement, SKUs, and inventory replenishment.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-slate-900 text-white border-none">
            <CardHeader className="border-b border-white/5">
              <Store className="w-8 h-8 text-indigo-500 mb-2" />
              <CardTitle className="text-xl font-black italic uppercase italic">
                {dealer?.name}
              </CardTitle>
              <CardDescription className="text-slate-400 font-medium italic">
                {dealer?.address}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">
                  Corporate Contact
                </p>
                <p className="font-bold text-sm">
                  {dealer?.contactInfo?.email || "N/A"}
                </p>
                <p className="text-xs font-medium text-slate-400 mt-1">
                  {dealer?.contactInfo?.phone || "N/A"}
                </p>
              </div>
              <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">
                  Procurement Performance
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-black italic">{meta.total}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest pb-0.5">
                    Active SKU Pipelines
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-indigo-600 border-none shadow-lg shadow-indigo-200 text-white rounded-2xl">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center font-black text-xl">
                  ৳
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">
                    Stock Value (Current Page)
                  </p>
                  <p className="text-3xl font-black italic">
                    ৳
                    {dealerProducts
                      .reduce((sum, p) => sum + p.buyPrice * p.quantity, 0)
                      .toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden h-full">
            <CardHeader className="bg-white border-b border-slate-100 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-slate-800 uppercase italic flex items-center gap-2">
                    <History className="w-5 h-5 text-indigo-600" />
                    Managed Catalog (SKUs provided by Dealer)
                  </CardTitle>
                  <CardDescription className="italic font-medium text-slate-500">
                    Current portfolio and stock status for products procured
                    from this node.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Input
                    value={productSearchInput}
                    onChange={(event) => {
                      setProductSearchInput(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search products..."
                    className="h-9 w-full sm:w-48"
                  />
                  <select
                    value={sortBy}
                    onChange={(event) => {
                      setSortBy(event.target.value);
                      setPage(1);
                    }}
                    className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs"
                    aria-label="Sort dealer products"
                  >
                    <option value="createdAt">Newest</option>
                    <option value="name">Name</option>
                    <option value="quantity">Stock</option>
                  </select>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setOrder((current) => current === "asc" ? "desc" : "asc")}
                    title={order === "asc" ? "Ascending" : "Descending"}
                  >
                    {order === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </Button>
                  <DateRangeSelect
                    value={range}
                    onChange={(nextRange) => {
                      setRange(nextRange);
                      setPage(1);
                    }}
                    className="h-9 w-full sm:w-36 bg-white"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 border-b border-slate-100">
                      <TableHead className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Identity Hash / SKU
                      </TableHead>
                      <TableHead className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Product Info
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Buy Rate
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Market Rate
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        OnReserve
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingProducts ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-32 text-center text-slate-400"
                        >
                          Loading supplier catalog…
                        </TableCell>
                      </TableRow>
                    ) : dealerProducts.length > 0 ? (
                      dealerProducts.map((prod, idx) => (
                        <TableRow
                          key={prod._id || prod.id}
                          className="hover:bg-slate-50/30 transition-colors"
                        >
                          <TableCell className="px-6 py-4 font-mono text-[10px] text-slate-400">
                            #
                            {(prod._id || prod.id)
                              ?.toString()
                              .slice(-8)
                              .toUpperCase()}
                            <div className="text-[10px] font-black text-indigo-500 tracking-tighter uppercase">
                              {prod.sku}
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-4">
                            <p className="font-black text-slate-800 uppercase italic text-xs tracking-tight">
                              {prod.name}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase italic">
                              {prod.category}
                            </p>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right font-black text-slate-700 italic text-xs">
                            ${prod.buyPrice}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right font-black text-indigo-600 italic text-xs">
                            ${prod.sellPrice}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <Badge
                              className={cn(
                                "font-black text-[10px] uppercase tracking-widest px-2 py-0.5 rounded shadow-none italic border-none",
                                prod.quantity <= (prod.lowStockThreshold || 15)
                                  ? "bg-amber-100 text-amber-600"
                                  : "bg-emerald-100 text-emerald-600",
                              )}
                            >
                              {prod.quantity} {prod.unit}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-40 text-center text-slate-400 italic font-medium uppercase text-[10px] tracking-widest"
                        >
                          No SKUs registered to this dealer node.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={page}
                totalPages={Math.max(1, Math.ceil(meta.total / pageSize))}
                onPageChange={setPage}
                totalItems={meta.total}
                pageSize={pageSize}
                label="supplier products"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
