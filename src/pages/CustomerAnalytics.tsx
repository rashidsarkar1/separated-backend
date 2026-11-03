import { TakaIcon } from "../components/common/TakaIcon";
import React, { useState, useEffect } from "react";
import {
  Users,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
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
import {
  fetchAnalyticsSummary,
  fetchAnalyticsCustomers,
} from "../store/slices/analyticsSlice";
import { format } from "date-fns";
import { Pagination } from "../components/common/Pagination";

interface CustomerAnalyticsProps {
  onSelectCustomer?: (customerId: string) => void;
}

export function CustomerAnalytics({
  onSelectCustomer,
}: CustomerAnalyticsProps = {}) {
  const dispatch = useAppDispatch();
  const { summary, customers, customersMeta, loading } = useAppSelector(
    (state) => state.analytics,
  );

  const [range, setRange] = useState("month");
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("totalPurchase");
  const [order, setOrder] = useState("desc");
  const limit = 10;

  useEffect(() => {
    dispatch(fetchAnalyticsSummary(range));
    dispatch(fetchAnalyticsCustomers({ range, page, limit, sortBy, order }));
  }, [dispatch, range, page, sortBy, order]);

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
            Customer Analytics
          </h2>
          <p className="text-slate-500 font-medium">
            Deep dive into customer behavioral patterns and profitability.
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
              <SelectItem value="totalPurchase">Total Purchase</SelectItem>
              <SelectItem value="totalProfit">Total Profit</SelectItem>
              <SelectItem value="purchaseCount">Order Count</SelectItem>
              <SelectItem value="lastPurchase">Last Active</SelectItem>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm border-t-4 border-t-indigo-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                  Total Sales
                </p>
                <h3 className="text-3xl font-black text-slate-900 italic">
                  ${summary.totalSales.toLocaleString()}
                </h3>
              </div>
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm border-t-4 border-t-emerald-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                  Gross Profit
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
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                <TakaIcon className="w-6 h-6 text-2xl" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm border-t-4 border-t-amber-600">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                  Active Customers
                </p>
                <h3 className="text-3xl font-black text-slate-900 italic">
                  {summary.totalCustomers}
                </h3>
              </div>
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between pb-6">
          <div>
            <CardTitle className="text-xl font-black text-slate-900 italic uppercase">
              Customer Profitability Matrix
            </CardTitle>
            <CardDescription className="font-medium text-slate-500">
              Ranking of customers by purchase volume and contribution margin.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Customer Identity
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Total Purchase
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Total Profit
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Freq (Orders)
                  </th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Last Activity
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
                            colSpan={5}
                            className="px-6 py-8 bg-slate-50/20"
                          />
                        </tr>
                      ))
                  : customers.map((c, idx) => {
                      const custId =
                        c._id && c._id !== "unknown" ? c._id : null;
                      return (
                        <tr
                          key={c._id || c.id || idx}
                          className="hover:bg-slate-50/50 transition-colors group"
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm">
                                {c.name?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                {custId && onSelectCustomer ? (
                                  <button
                                    onClick={() => onSelectCustomer(custId)}
                                    className="font-black text-indigo-600 hover:text-indigo-800 uppercase italic tracking-tight hover:underline text-left block"
                                  >
                                    {c.name || "Anonymous"}
                                  </button>
                                ) : (
                                  <p className="font-black text-slate-800 uppercase italic tracking-tight">
                                    {c.name || "Anonymous"}
                                  </p>
                                )}
                                <p className="text-[10px] font-bold text-slate-400 tracking-tighter uppercase">
                                  {c._id === "unknown" ? "Unregistered" : c._id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-right font-black text-slate-900 italic">
                            ${c.totalPurchase.toLocaleString()}
                          </td>
                          <td className="px-6 py-5 text-right">
                            <span
                              className={`font-black italic ${c.totalProfit < 0 ? "text-rose-600" : "text-emerald-600"}`}
                            >
                              {c.totalProfit < 0 ? "-৳" : "৳"}
                              {Math.abs(c.totalProfit).toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: Number.isInteger(
                                    c.totalProfit,
                                  )
                                    ? 0
                                    : 2,
                                  maximumFractionDigits: 2,
                                },
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right font-bold text-slate-500">
                            {c.purchaseCount}
                          </td>
                          <td className="px-6 py-5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-tight">
                            {(() => {
                              const date = new Date(c.lastPurchase);
                              return !isNaN(date.getTime())
                                ? format(date, "MMM dd, yyyy")
                                : "N/A";
                            })()}
                          </td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={Math.max(
              1,
              Math.ceil((customersMeta?.total || 0) / limit),
            )}
            onPageChange={setPage}
            totalItems={customersMeta?.total || 0}
            pageSize={limit}
            label="customers"
          />
        </CardContent>
      </Card>
    </div>
  );
}
