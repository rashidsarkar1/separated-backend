import { TakaIcon } from "../components/common/TakaIcon";
import React, { useState, useEffect } from "react";
import {
  Package,
  ArrowLeft,
  Users,
  TrendingUp,
  Clock,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  BarChart3,
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
import { useAppSelector } from "../store/hooks";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { formatVolume } from "../utils/salesUnits";
import { DateRangeSelect } from "../components/common/DateRangeSelect";
import { Pagination } from "../components/common/Pagination";
import { apiService } from "../services/apiService";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

interface Props {
  productId: string | null;
  onBack: () => void;
}

export function ProductDetailAnalyticsPage({ productId, onBack }: Props) {
  const { products } = useAppSelector((state) => state.inventory);
  const { dealers } = useAppSelector((state) => state.dealers);
  const [range, setRange] = useState("all");
  const [page, setPage] = useState(1);
  const [buyerOrder, setBuyerOrder] = useState<"most" | "least">("most");
  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const pageSize = 10;

  useEffect(() => {
    setPage(1);
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      setIntelligence(null);
      return;
    }
    let active = true;
    setLoading(true);
    apiService
      .getProductIntelligence(
        productId,
        range,
        page,
        1,
        pageSize,
        1,
        buyerOrder,
      )
      .then((response) => {
        if (active) setIntelligence(response.data || null);
      })
      .catch(() => {
        if (active) setIntelligence(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, range, page, buyerOrder]);

  const product = products.find(
    (p) => p._id === productId || p.id === productId,
  );
  const dealer = dealers.find(
    (d) => d._id === product?.dealerId || d.id === product?.dealerId,
  );

  const distribution = (intelligence?.buyers || []).map((buyer: any) => ({
    name: buyer.name,
    totalQuantity: buyer.totalUnits,
    quantitiesByUnit: buyer.quantitiesByUnit,
    totalRevenue: buyer.totalSpent,
    totalProfit: buyer.totalProfit,
    lastPurchase: buyer.lastPurchaseDate,
    transactions: buyer.orderCount,
  }));
  const totalVolume = Number(intelligence?.summary?.totalUnits) || 0;
  const totalRevenue = Number(intelligence?.summary?.totalRevenue) || 0;
  const totalProfit = Number(intelligence?.summary?.totalProfit) || 0;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">
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
            Product Deep-Dive: {product?.name}
          </h2>
          <p className="text-sm text-slate-500 font-medium italic">
            Full market distribution and profitability matrix.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-slate-900 border-b border-slate-800">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">
                Authorized Supplier
              </p>
              <CardTitle className="text-white uppercase italic text-lg">
                {dealer?.name || "Standard Wholesale"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-end border-b border-slate-50 pb-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Buy Point
                  </p>
                  <p className="text-xl font-black text-slate-700 italic">
                    ${product?.buyPrice}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                    Market Point
                  </p>
                  <p className="text-xl font-black text-indigo-600 italic">
                    ${product?.sellPrice}
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Internal Metrics
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-xs font-black text-slate-800 italic leading-none">
                      {product?.quantity}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase italic mt-1">
                      On Reserve
                    </p>
                  </div>
                  <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                    <p className="text-xs font-black text-emerald-700 italic leading-none">
                      ${(product?.sellPrice - product?.buyPrice).toFixed(2)}
                    </p>
                    <p className="text-[9px] font-bold text-emerald-600 uppercase italic mt-1">
                      Margin/Unit
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4">
            <Card className="bg-indigo-600 text-white border-none shadow-lg shadow-indigo-200 rounded-2xl">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1 italic">
                      Total Volume Sold
                    </p>
                    <p className="text-3xl font-black italic">
                      {formatVolume(totalVolume)} {product?.unit || "Unit"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-600 text-white border-none shadow-lg shadow-emerald-200 rounded-2xl">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <TakaIcon className="w-5 h-5 text-lg" />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1 italic">
                      Cumulative Profit
                    </p>
                    <p className="text-3xl font-black italic">
                      {totalProfit < 0 ? "-৳" : "৳"}
                      {Math.abs(totalProfit).toLocaleString(undefined, {
                        minimumFractionDigits: Number.isInteger(totalProfit)
                          ? 0
                          : 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="lg:col-span-2">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden h-full">
            <CardHeader className="bg-white border-b border-slate-100 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-lg font-black text-slate-800 uppercase italic flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    Client Distribution Matrix
                  </CardTitle>
                  <CardDescription className="italic font-medium text-slate-500">
                    Breakdown of sales and profitability per distribution
                    account.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <DateRangeSelect
                    value={range}
                    onChange={(nextRange) => {
                      setRange(nextRange);
                      setPage(1);
                    }}
                    className="h-9 w-36 bg-white"
                  />
                  <Button
                    variant={buyerOrder === "most" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBuyerOrder("most");
                      setPage(1);
                    }}
                  >
                    Most
                  </Button>
                  <Button
                    variant={buyerOrder === "least" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setBuyerOrder("least");
                      setPage(1);
                    }}
                  >
                    Least
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/50 border-b border-slate-100">
                      <TableHead className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Account Identity
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Volume
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Gross Rev
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Net Profit
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Last Activity
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-32 text-center text-slate-400"
                        >
                          Loading filtered customer data…
                        </TableCell>
                      </TableRow>
                    ) : distribution.length > 0 ? (
                      distribution.map((item: any, idx: number) => (
                        <TableRow
                          key={idx}
                          className="hover:bg-slate-50/30 transition-colors"
                        >
                          <TableCell className="px-6 py-4">
                            <p className="font-black text-slate-800 uppercase italic text-xs tracking-tight">
                              {item.name}
                            </p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase italic">
                              TX Count: {item.transactions}
                            </p>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right font-black text-slate-700 italic text-xs">
                            {formatVolume(item.totalQuantity)}{" "}
                            {product?.unit || "Unit"}
                            {Object.entries(item.quantitiesByUnit).length >
                              0 && (
                              <p className="mt-1 text-[9px] font-medium not-italic text-slate-400">
                                {Object.entries(item.quantitiesByUnit)
                                  .map(
                                    ([unit, quantity]) =>
                                      `${Number(quantity).toLocaleString()} ${unit}`,
                                  )
                                  .join(" + ")}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right font-black text-slate-900 text-xs">
                            ৳{item.totalRevenue.toLocaleString()}
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <span
                              className={`font-black italic text-xs ${item.totalProfit < 0 ? "text-rose-600" : "text-emerald-600"}`}
                            >
                              {item.totalProfit < 0 ? "-৳" : "৳"}
                              {Math.abs(item.totalProfit).toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: Number.isInteger(
                                    item.totalProfit,
                                  )
                                    ? 0
                                    : 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-4 text-right">
                            <p className="text-[10px] font-bold text-slate-500 uppercase italic">
                              {format(
                                new Date(item.lastPurchase),
                                "MMM dd, yyyy",
                              )}
                            </p>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-40 text-center text-slate-400 italic font-medium uppercase text-[10px] tracking-widest"
                        >
                          No market distribution records found for this SKU
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={page}
                totalPages={
                  Math.ceil((intelligence?.buyerMeta?.total || 0) / pageSize) ||
                  1
                }
                onPageChange={setPage}
                totalItems={intelligence?.buyerMeta?.total || 0}
                pageSize={pageSize}
                label="customers"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
