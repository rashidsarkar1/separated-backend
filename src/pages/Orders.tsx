/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { format } from "date-fns";
import {
  Copy,
  Download,
  Eye,
  Plus,
  Receipt as ReceiptIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Edit,
} from "lucide-react";
import { OrderStatus } from "../types";
import { cn } from "../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { apiService } from "../services/apiService";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchTransactions } from "../store/slices/transactionSlice";
import { toast } from "sonner";
import { Pagination } from "../components/common/Pagination";
import { DateRangeSelect } from "../components/common/DateRangeSelect";

export function Orders({
  onNavigateToSell,
  onViewOrderDetail,
  onEditOrder,
  onSelectCustomer,
}: {
  onNavigateToSell: () => void;
  onViewOrderDetail?: (order: any) => void;
  onEditOrder?: (order: any) => void;
  onSelectCustomer?: (customerId: string) => void;
}) {
  const dispatch = useAppDispatch();
  const {
    transactions: orders,
    loading,
    error,
    meta,
  } = useAppSelector((state) => state.transactions);
  const { customers: initialCustomers } = useAppSelector(
    (state) => state.customers,
  );

  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [range, setRange] = React.useState("all");

  React.useEffect(() => {
    dispatch(fetchTransactions({ search, page, limit: 10, range }));
  }, [dispatch, search, page, range]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard", {
      description: "Order ID has been duplicated.",
    });
  };

  const itemsPerPage = 10;
  const totalPages = meta ? Math.ceil(meta.total / itemsPerPage) : 1;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 uppercase italic">
            Sales History
          </h2>
          <p className="text-[10px] md:text-sm text-slate-500 font-medium font-mono">
            LIVE FEED: System Active & Synced
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by Order ID..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-10 h-10 bg-white border-slate-200 rounded-xl text-xs"
            />
          </div>
          <DateRangeSelect
            value={range}
            onChange={(nextRange) => {
              setRange(nextRange);
              setPage(1);
            }}
            className="h-10 w-full sm:w-36 bg-white"
          />
          <Button
            className="w-full sm:w-auto shrink-0 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 text-[10px] md:text-xs font-black uppercase tracking-widest h-10"
            onClick={onNavigateToSell}
          >
            <Plus className="w-3.5 h-3.5" />
            Create Direct Sale
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 p-4 md:p-6">
          <CardTitle className="text-slate-800 text-base md:text-lg font-black uppercase italic">
            Recent Sales Transactions
          </CardTitle>
          <CardDescription className="text-[10px] md:text-sm text-slate-500 font-medium italic font-mono">
            B2B orders placed by your retail network.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-hide">
            <Table className="min-w-[900px]">
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-100">
                  <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Order ID
                  </TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Customer Name
                  </TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Transaction Date
                  </TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">
                    Total Amount
                  </TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">
                    Paid (পেইড)
                  </TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">
                    Due (বকেয়া)
                  </TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-[140px] px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-40 text-center text-slate-400 italic"
                    >
                      Syncing record stream...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-40 text-center text-rose-600"
                    >
                      Unable to load sales from the server: {error}
                    </TableCell>
                  </TableRow>
                ) : orders.length > 0 ? (
                  orders.map((order) => {
                    const customer = initialCustomers.find(
                      (c) =>
                        c.id === order.customerId || c._id === order.customerId,
                    );
                    const customerDisplayName =
                      customer?.name ||
                      order.customerName ||
                      "Walk-in Customer";
                    const totalAmt = order.totalAmount || 0;
                    const amtPaid =
                      order.amountPaid !== undefined
                        ? order.amountPaid
                        : totalAmt;
                    const dueAmt =
                      order.dueAmount !== undefined
                        ? order.dueAmount
                        : Math.max(0, totalAmt - amtPaid);

                    return (
                      <TableRow
                        key={order._id || order.id}
                        className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 group"
                      >
                        <TableCell className="px-6 py-4 font-mono text-[11px] font-bold text-slate-900">
                          #
                          {((order._id || order.id)?.toString() || "N/A")
                            .slice(-8)
                            .toUpperCase()}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {order.customerId &&
                          order.customerId !== "unknown" &&
                          onSelectCustomer ? (
                            <button
                              onClick={() => onSelectCustomer(order.customerId)}
                              className="text-left font-bold text-slate-800 hover:text-indigo-600 hover:underline transition-colors"
                            >
                              {customerDisplayName}
                              <div className="text-[10px] text-slate-400 font-normal">
                                View Customer Ledger →
                              </div>
                            </button>
                          ) : (
                            <div>
                              <div className="font-bold text-slate-800">
                                {customerDisplayName}
                              </div>
                              <div className="text-[10px] text-slate-400 font-normal">
                                Walk-in Customer
                              </div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-xs text-slate-500 font-medium">
                          {(() => {
                            const date = new Date(
                              order.createdAt || order.orderDate || order.date,
                            );
                            return !isNaN(date.getTime())
                              ? format(date, "MMM d, yyyy h:mm a")
                              : "N/A";
                          })()}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-slate-900">
                            ৳{totalAmt.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right font-bold text-xs text-slate-700">
                          ৳{amtPaid.toLocaleString()}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          {dueAmt > 0 ? (
                            <span className="text-xs font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                              ৳{dueAmt.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-400">
                              ৳0
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-center">
                          {dueAmt > 0 ? (
                            <Badge className="bg-amber-100 text-amber-800 border-none text-[10px] font-bold px-2 py-0.5 rounded shadow-none uppercase">
                              Due (বকেয়া)
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px] font-bold px-2 py-0.5 rounded shadow-none uppercase">
                              Paid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-bold text-xs uppercase"
                              onClick={() => onViewOrderDetail?.(order)}
                              title="View order and breakdown"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                            {onEditOrder && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50/50 font-bold text-xs uppercase"
                                onClick={() => onEditOrder(order)}
                                title="Modify order receipt items and prices"
                              >
                                <Edit className="w-3.5 h-3.5 mr-1" />
                                Modify
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-40 text-center text-slate-400 italic"
                    >
                      No sales transactions logged yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages || 1}
            onPageChange={setPage}
            totalItems={meta?.total}
            pageSize={itemsPerPage}
            label="invoices"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    [OrderStatus.PENDING]: "bg-amber-100 text-amber-700",
    [OrderStatus.RECEIVED]: "bg-indigo-100 text-indigo-700",
    [OrderStatus.SHIPPED]: "bg-blue-100 text-blue-700",
    [OrderStatus.CANCELLED]: "bg-rose-100 text-rose-700",
    [OrderStatus.COMPLETED]: "bg-emerald-100 text-emerald-700",
  };

  return (
    <Badge
      className={cn(
        "border-none capitalize text-[10px] font-bold px-2 py-0.5 rounded shadow-none",
        styles[status] || "bg-slate-100 text-slate-600",
      )}
    >
      {status}
    </Badge>
  );
}
