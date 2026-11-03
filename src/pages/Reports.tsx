import React, { useState, useEffect } from "react";
import { BarChart3, Search, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { format } from "date-fns";
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

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchTransactions } from "../store/slices/transactionSlice";

export function Reports() {
  const dispatch = useAppDispatch();
  const {
    transactions: profitLogs,
    loading,
    meta,
  } = useAppSelector((state) => state.transactions);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [range, setRange] = useState("all");
  const pageSize = 10;

  useEffect(() => {
    dispatch(
      fetchTransactions({ search: searchTerm, page, limit: pageSize, range }),
    );
  }, [dispatch, searchTerm, page, range]);

  const filteredLogs = profitLogs;

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Financial Reports
          </h2>
          <p className="text-sm text-slate-500">
            Track and analyze your profit performance.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by Order ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="pl-10 w-[280px] bg-white border-slate-200 rounded-xl"
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
        </div>
      </div>
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white">
          <CardTitle className="text-base font-black uppercase text-slate-800">
            Financial Transaction Ledger
          </CardTitle>
          <CardDescription>
            Invoices filtered by the selected date range.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Date</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-slate-400"
                    >
                      Loading ledger…
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length ? (
                  filteredLogs.map((order: any) => {
                    const date = new Date(
                      order.createdAt || order.orderDate || order.date,
                    );
                    const total = Number(order.totalAmount) || 0;
                    const paid = Number(order.amountPaid ?? total) || 0;
                    const due =
                      Number(order.dueAmount ?? Math.max(0, total - paid)) || 0;
                    return (
                      <TableRow key={order._id || order.id}>
                        <TableCell className="whitespace-nowrap">
                          {Number.isNaN(date.getTime())
                            ? "N/A"
                            : format(date, "MMM d, yyyy h:mm a")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          #
                          {String(order._id || order.id)
                            .slice(-8)
                            .toUpperCase()}
                        </TableCell>
                        <TableCell>
                          {order.customerName || "Walk-in Customer"}
                        </TableCell>
                        <TableCell className="text-right">
                          ৳{total.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ৳{paid.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          ৳{due.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ৳{(Number(order.totalProfit) || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-32 text-center text-slate-400"
                    >
                      No transactions found for this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <Pagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil((meta?.total || 0) / pageSize))}
            onPageChange={setPage}
            totalItems={meta?.total || 0}
            pageSize={pageSize}
            label="invoices"
          />
        </CardContent>
      </Card>
    </div>
  );
}
