import { TakaIcon } from "../components/common/TakaIcon";
import React, { useState, useEffect } from "react";
import {
  Package,
  TrendingUp,
  Filter,
  BarChart4,
  Layers,
  ArrowUpRight,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  Clock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { Pagination } from "../components/common/Pagination";
import {
  fetchAnalyticsSummary,
  fetchAnalyticsProducts,
} from "../store/slices/analyticsSlice";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { formatVolume } from "../utils/salesUnits";

interface ProductAnalyticsProps {
  onSelectProduct?: (productId: string) => void;
}

export function ProductAnalytics({
  onSelectProduct,
}: ProductAnalyticsProps = {}) {
  const dispatch = useAppDispatch();
  const { summary, products, productsMeta, loading } = useAppSelector(
    (state) => state.analytics,
  );

  const [range, setRange] = useState("month");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("totalSales");
  const [order, setOrder] = useState("desc");

  useEffect(() => {
    dispatch(fetchAnalyticsSummary(range));
    dispatch(fetchAnalyticsProducts({ range, page, limit: 10, sortBy, order }));
  }, [dispatch, range, page, sortBy, order]);

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
            Product Intelligence
          </h2>
          <p className="text-slate-500 font-medium">
            SKU-level performance tracking and inventory optimization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={sortBy}
            onValueChange={(val) => {
              setSortBy(val);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px] bg-white border-slate-200">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="totalQuantity">Volume Sold</SelectItem>
              <SelectItem value="totalSales">Total Revenue</SelectItem>
              <SelectItem value="totalProfit">Gross Profit</SelectItem>
              <SelectItem value="profitMargin">Profit Margin</SelectItem>
              <SelectItem value="lastSoldAt">Last Sell</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="bg-white border-slate-200"
            onClick={() =>
              setOrder((prev) => (prev === "desc" ? "asc" : "desc"))
            }
          >
            {order === "desc" ? (
              <ArrowDownNarrowWide className="w-4 h-4" />
            ) : (
              <ArrowUpNarrowWide className="w-4 h-4" />
            )}
          </Button>
          <div className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-xl shadow-sm">
            {["day", "week", "month", "year", "all"].map((r) => (
              <Button
                key={r}
                variant={range === r ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setRange(r);
                  setPage(1);
                }}
                className={`text-[10px] font-black uppercase tracking-widest h-8 px-4 rounded-lg ${range === r ? "bg-indigo-600" : "text-slate-400"}`}
              >
                {r === "all" ? "All Time" : r.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-slate-200 shadow-sm border-t-4 border-t-indigo-600">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
              Portfolio Sales
            </p>
            <h3 className="text-3xl font-black text-slate-900 italic">
              ${summary.totalSales.toLocaleString()}
            </h3>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm border-t-4 border-t-emerald-600">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
              Portfolio Profit
            </p>
            <h3
              className={`text-3xl font-black italic ${summary.totalProfit < 0 ? "text-rose-600" : "text-emerald-600"}`}
            >
              {summary.totalProfit < 0 ? "-৳" : "৳"}
              {Math.abs(summary.totalProfit).toLocaleString(undefined, {
                minimumFractionDigits: Number.isInteger(summary.totalProfit)
                  ? 0
                  : 2,
                maximumFractionDigits: 2,
              })}
            </h3>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm border-t-4 border-t-amber-600">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
              Avg Margin
            </p>
            <h3 className="text-3xl font-black text-slate-900 italic">
              {summary.totalSales > 0
                ? ((summary.totalProfit / summary.totalSales) * 100).toFixed(1)
                : 0}
              %
            </h3>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm border-t-4 border-t-slate-900">
          <CardContent className="pt-6">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
              Active SKUs
            </p>
            <h3 className="text-3xl font-black text-slate-900 italic">
              {products.length}
            </h3>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between pb-6">
          <div>
            <CardTitle className="text-xl font-black text-slate-900 italic uppercase">
              SKU Performance Leaderboard
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Inventory movement analyzed by revenue and profitability across
              distribution channels.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Product Catalog Entry
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Volume Sold
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Total Revenue
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Gross Profit
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Profit Margin
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Last Sell
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading
                  ? Array(5)
                      .fill(0)
                      .map((_, i) => (
                        <tr key={`skeleton-${i}`} className="animate-pulse">
                          <td
                            colSpan={6}
                            className="px-6 py-8 bg-slate-50/20"
                          />
                        </tr>
                      ))
                  : products.map((prod, idx) => {
                      const margin =
                        prod.totalSales > 0
                          ? (prod.totalProfit / prod.totalSales) * 100
                          : 0;
                      const unitQuantities = Array.isArray(prod.quantityByUnit)
                        ? prod.quantityByUnit.reduce(
                            (totals: Record<string, number>, entry: any) => {
                              totals[entry.unit || prod.unit || "Unit"] =
                                (totals[entry.unit || prod.unit || "Unit"] ||
                                  0) + (Number(entry.quantity) || 0);
                              return totals;
                            },
                            {},
                          )
                        : prod.quantityByUnit || {};
                      return (
                        <tr
                          key={prod._id || prod.id || idx}
                          onClick={() => onSelectProduct?.(prod._id || prod.id)}
                          className={cn(
                            "hover:bg-indigo-50/40 transition-colors group",
                            onSelectProduct && "cursor-pointer",
                          )}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-black text-sm group-hover:border-indigo-200">
                                <Package className="w-5 h-5 group-hover:text-indigo-600 transition-colors" />
                              </div>
                              <div>
                                <p className="font-black text-slate-800 uppercase italic tracking-tight group-hover:text-indigo-600 transition-colors">
                                  {prod.name}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">
                                    {prod.category || "Standard Portfolio"}
                                  </p>
                                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                  <p className="text-[10px] font-bold text-indigo-400 tracking-tighter uppercase">
                                    ID: {prod._id || prod.id}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right font-black text-slate-900 italic">
                            {formatVolume(prod.totalQuantity)}{" "}
                            {prod.unit || "Unit"}
                            {(() => {
                              const entries = Object.entries(unitQuantities);
                              const shouldShowBreakdown =
                                entries.length > 1 ||
                                (entries.length === 1 &&
                                  entries[0][0].toLowerCase() !==
                                    (prod.unit || "unit").toLowerCase());
                              if (!shouldShowBreakdown) return null;
                              return (
                                <p className="mt-1 text-[9px] font-medium not-italic text-slate-400">
                                  {entries
                                    .map(
                                      ([unit, quantity]) =>
                                        `${Number(quantity).toLocaleString()} ${unit}`,
                                    )
                                    .join(" + ")}
                                </p>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-5 text-right font-black text-slate-700">
                            ৳{prod.totalSales.toLocaleString()}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span
                              className={`font-black italic ${prod.totalProfit < 0 ? "text-rose-600" : "text-emerald-600"}`}
                            >
                              {prod.totalProfit < 0 ? "-৳" : "৳"}
                              {Math.abs(prod.totalProfit).toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: Number.isInteger(
                                    prod.totalProfit,
                                  )
                                    ? 0
                                    : 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <Badge
                              className={
                                margin > 20
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-600"
                              }
                            >
                              {margin.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-[10px] text-slate-500 uppercase tracking-tight">
                            {prod.lastSoldAt
                              ? (() => {
                                  const date = new Date(prod.lastSoldAt);
                                  return !isNaN(date.getTime())
                                    ? format(date, "MMM dd, yyyy")
                                    : "N/A";
                                })()
                              : "N/A"}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil((productsMeta?.total || 0) / 10))}
            onPageChange={setPage}
            totalItems={productsMeta?.total || 0}
            pageSize={10}
            label="products"
          />
        </CardContent>
      </Card>
    </div>
  );
}
