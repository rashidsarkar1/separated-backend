import { TakaIcon } from "../components/common/TakaIcon";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  ArrowUpRight,
  ArrowDownRight,
  Package,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { getInventoryInsights } from "../services/aiService";
import { apiService } from "../services/apiService";
import { DateRangeSelect } from "../components/common/DateRangeSelect";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchInventory } from "../store/slices/inventorySlice";
import { fetchTransactions } from "../store/slices/transactionSlice";

export function Dashboard({
  onNavigateToSell,
  onNavigateToReports,
}: {
  onNavigateToSell: () => void;
  onNavigateToReports: () => void;
}) {
  const dispatch = useAppDispatch();
  const { products } = useAppSelector((state) => state.inventory);
  const { transactions: salesOrders } = useAppSelector(
    (state) => state.transactions,
  );

  const [insights, setInsights] = useState<string>("");
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [range, setRange] = useState("all");
  const [salesSummary, setSalesSummary] = useState<{
    totalSales: number;
    totalProfit: number;
    totalCustomers: number;
  } | null>(null);
  const [salesSummaryError, setSalesSummaryError] = useState(false);

  useEffect(() => {
    dispatch(fetchInventory({ status: "all" }));
    dispatch(fetchTransactions({ page: 1, limit: 10, range }));
    apiService
      .getAnalyticsSummary(range)
      .then((summary) => {
        setSalesSummary(summary);
        setSalesSummaryError(false);
      })
      .catch(() => {
        setSalesSummary(null);
        setSalesSummaryError(true);
      });
  }, [dispatch, range]);

  const fetchInsights = async () => {
    setLoadingInsights(true);
    const lowStockStrings = products
      .filter((item) => item.quantity < (item.lowStockThreshold || 15))
      .map(
        (item) => `${item.name}: ${item.quantity} ${item.unit || "units"} left`,
      );
    const recentSalesStrings = salesOrders
      .slice(0, 5)
      .map((order) => `Order ${order._id || order.id}: ৳${order.totalAmount}`);

    const text = await getInventoryInsights({
      lowStockItems: lowStockStrings,
      recentSales: recentSalesStrings,
    });
    setInsights(text || "");
    setLoadingInsights(false);
  };

  useEffect(() => {
    if (products.length > 0 || salesOrders.length > 0) {
      fetchInsights();
    }
  }, [products, salesOrders]);

  const totalSalesValue = salesSummary?.totalSales;
  const totalProfitValue = salesSummary?.totalProfit;
  const chartData = salesOrders
    .slice(0, 7)
    .reverse()
    .map((order) => {
      const date = new Date(order.createdAt || order.orderDate || order.date);
      return {
        name: Number.isNaN(date.getTime()) ? "Unknown" : format(date, "MMM d"),
        sales: Number(order.totalAmount) || 0,
      };
    });
  const lowStockItems = products.filter(
    (item) => item.quantity < (item.lowStockThreshold || 15),
  );
  const lowStockCount = lowStockItems.length;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 uppercase italic">
            Wholesale Distribution Dashboard
          </h2>
          <p className="text-[10px] md:text-sm text-slate-500 font-medium font-mono">
            LIVE FEED: System Active & Synced
          </p>
        </div>
        <div className="flex flex-wrap gap-2 md:gap-3 w-full sm:w-auto">
          <DateRangeSelect
            value={range}
            onChange={setRange}
            className="h-10 w-full sm:w-36 bg-white"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInsights}
            disabled={loadingInsights}
            className="flex-1 sm:flex-none gap-2 border-slate-200 text-[10px] md:text-xs"
          >
            <RefreshCw
              className={cn(
                "w-3 h-3 md:w-3.5 md:h-3.5",
                loadingInsights && "animate-spin",
              )}
            />
            Sync AI Insights
          </Button>
          <Button
            size="sm"
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white gap-2 shadow-lg shadow-indigo-100 uppercase text-[9px] md:text-[10px] font-black tracking-widest"
            onClick={onNavigateToSell}
          >
            <ShoppingCart className="w-3 h-3 md:w-3.5 md:h-3.5" />
            Quick Terminal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Revenue"
          value={
            totalSalesValue === undefined
              ? salesSummaryError
                ? "Unavailable"
                : "Loading..."
              : `৳${totalSalesValue.toLocaleString()}`
          }
          icon={<TakaIcon className="w-5 h-5 text-indigo-600 text-lg" />}
          description="Selected period sales"
        />
        <StatsCard
          title="Net Channel Profit"
          value={
            totalProfitValue === undefined
              ? salesSummaryError
                ? "Unavailable"
                : "Loading..."
              : `৳${totalProfitValue.toLocaleString()}`
          }
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
          description="Selected period profit"
        />
        <StatsCard
          title="Inventory Risk"
          value={lowStockCount.toString()}
          icon={<Package className="w-5 h-5 text-amber-600" />}
          description="High turnover alerts"
          status={lowStockCount > 5 ? "warning" : "success"}
        />
        <StatsCard
          title="SKU Count"
          value={products.length.toString()}
          icon={<Layers className="w-5 h-5 text-slate-600" />}
          description="Active product lines"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-slate-800 font-bold uppercase italic">
                Recent Sales
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium">
                Latest sales transactions from the server.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:bg-indigo-50"
              onClick={onNavigateToReports}
            >
              Detailed Audit
            </Button>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#f1f5f9"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: "bold", fill: "#64748b" }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fontWeight: "bold", fill: "#64748b" }}
                    tickFormatter={(value) => `৳${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                      backgroundColor: "#ffffff",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorSales)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              {chartData.length === 0 && (
                <div className="mt-3 text-center text-sm text-slate-400">
                  No sales transactions found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8 flex flex-col h-full">
          <Card className="bg-slate-900 text-white border-none rounded-2xl shadow-xl italic overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-20 h-20" />
            </div>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 rounded shadow-lg shadow-indigo-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400">
                  Inventory AI 1.0
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {loadingInsights ? (
                <div className="space-y-2 animate-pulse py-4">
                  <div className="h-2 w-full bg-slate-800 rounded" />
                  <div className="h-2 w-3/4 bg-slate-800 rounded" />
                  <div className="h-2 w-5/6 bg-slate-800 rounded" />
                </div>
              ) : (
                <div className="text-xs text-slate-300 leading-relaxed font-medium py-2">
                  {insights ||
                    "Analyzing market velocity and supplier logistics..."}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1 border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col">
            <CardHeader className="bg-white border-b border-slate-100 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-800 text-[10px] font-black uppercase tracking-[0.2em]">
                  Procurement Queue
                </CardTitle>
                <div className="bg-rose-50 p-1 rounded">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 flex-1 overflow-y-auto">
              {lowStockCount > 0 ? (
                <div className="space-y-4">
                  {lowStockItems.slice(0, 5).map((item) => {
                    const itemId = item._id || item.id;
                    const product = products.find(
                      (p) =>
                        p.id === item.productId || p._id === item.productId,
                    );
                    return (
                      <div
                        key={itemId}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 group transition-all hover:border-indigo-100 hover:bg-white shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-md bg-white flex items-center justify-center shrink-0 border border-slate-100 shadow-xs">
                            <Package className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black text-slate-800 uppercase truncate max-w-[120px]">
                              {product?.name || "Unknown Product"}
                            </p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">
                              {product?.category || "N/A"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-rose-600 italic">
                            QTY: {item.quantity}
                          </p>
                          <p className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter">
                            Depleted
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-40 py-8">
                  <CheckCircle2 className="w-8 h-8 mb-2" />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Stock Reconciled
                  </p>
                </div>
              )}
            </CardContent>
            <div className="p-4 bg-slate-50 border-t border-slate-100">
              <Button
                variant="secondary"
                className="w-full text-[10px] font-black h-10 bg-white border-slate-200 uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-md active:scale-95"
                onClick={() =>
                  toast.info("Procurement Initialized", {
                    description:
                      "Automated dealer restock requests dispatched.",
                  })
                }
              >
                RESTOCK ALL CRITICAL
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatsCard({
  title,
  value,
  trend,
  trendType,
  icon,
  description,
  status,
}: any) {
  return (
    <Card
      className={cn(
        "border-2 border-transparent transition-all hover:border-indigo-100 shadow-sm rounded-2xl overflow-hidden",
        status === "warning" && "border-amber-100 bg-amber-50/10",
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-slate-50/30">
        <CardTitle className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          {title}
        </CardTitle>
        <div className="p-2 bg-white rounded-xl shadow-sm border border-slate-100 shrink-0">
          {icon}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="text-3xl font-black text-slate-900 italic underline decoration-slate-100 decoration-8 underline-offset-[-1px]">
          {value}
        </div>
        <div className="flex items-center gap-2 mt-2">
          {trend && (
            <div
              className={cn(
                "flex items-center text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border",
                trendType === "up"
                  ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                  : "text-rose-700 bg-rose-50 border-rose-100",
              )}
            >
              {trendType === "up" ? (
                <ArrowUpRight className="w-2.5 h-2.5 mr-0.5" />
              ) : (
                <ArrowDownRight className="w-2.5 h-2.5 mr-0.5" />
              )}
              {trend}
            </div>
          )}
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Layers(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m2.6 12.14 8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83" />
      <path d="m2.6 16.89 8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83" />
    </svg>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
