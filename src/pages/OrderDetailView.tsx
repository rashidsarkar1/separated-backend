import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Download,
  Copy,
  Printer,
  BadgeCheck,
  Calendar,
  User,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle,
  Package,
  Edit,
  Trash2,
  Plus,
  Coins,
  CheckCircle2,
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
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { OrderStatus } from "../types";
import { apiService } from "../services/apiService";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchProducts } from "../store/slices/inventorySlice";
import { fetchTransactions } from "../store/slices/transactionSlice";
import { resolveSaleUnit } from "../utils/salesUnits";
import { BanglaCashMemo } from "../components/common/BanglaCashMemo";

interface OrderDetailViewProps {
  order: any;
  onBack: () => void;
  onSelectCustomer?: (customerId: string) => void;
  onNavigateToEditOrder?: (order: any) => void;
}

export function OrderDetailView({
  order: initialOrder,
  onBack,
  onSelectCustomer,
  onNavigateToEditOrder,
}: OrderDetailViewProps) {
  const dispatch = useAppDispatch();
  const { products } = useAppSelector((state) => state.inventory);

  const [order, setOrder] = useState<any>(initialOrder);
  const [isCashMemoOpen, setIsCashMemoOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editPaid, setEditPaid] = useState<string>("");
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setOrder(initialOrder);
    const rawId = initialOrder?._id || initialOrder?.id;
    if (rawId && (!initialOrder?.items || initialOrder.items.length === 0)) {
      apiService
        .getTransactionById(rawId)
        .then((full) => {
          if (full) setOrder(full);
        })
        .catch(() => {});
    }
  }, [initialOrder]);

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  if (!order) return null;

  const orderId = ((order._id || order.id)?.toString() || "N/A")
    .slice(-8)
    .toUpperCase();
  const rawId = order._id || order.id;
  const date = new Date(order.createdAt || order.orderDate || order.date);
  const formattedDate = !isNaN(date.getTime()) ? format(date, "PPP p") : "N/A";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  const printCashMemo = () => {
    const cleanup = () => document.body.classList.remove("cash-memo-printing");
    document.body.classList.add("cash-memo-printing");
    window.addEventListener("afterprint", cleanup, { once: true });
    try {
      window.print();
    } finally {
      cleanup();
    }
  };

  const calculateProfit = (item: any) => {
    const productId =
      item.productId?._id || item.productId?.id || item.productId;
    const product = products.find(
      (entry) => (entry._id || entry.id) === productId,
    );
    const { costPrice } = resolveSaleUnit(item, product);
    const price = item.unitPrice || 0;
    const qty = item.quantity || 0;
    return (price - costPrice) * qty;
  };

  const totalAmount = order.totalAmount || 0;
  const totalProfit =
    order.items?.reduce(
      (sum: number, item: any) => sum + calculateProfit(item),
      0,
    ) || 0;
  const amountPaid =
    order.amountPaid !== undefined ? order.amountPaid : totalAmount;
  const dueAmount =
    order.dueAmount !== undefined
      ? order.dueAmount
      : Math.max(0, totalAmount - amountPaid);

  // Edit order setup
  const handleOpenEdit = () => {
    if (onNavigateToEditOrder) {
      onNavigateToEditOrder(order);
      return;
    }
    setEditItems(
      (order.items || []).map((it: any) => ({
        productId: it.productId,
        productName: it.productName || "Product",
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        costPrice: it.costPrice || 0,
      })),
    );
    setEditPaid(amountPaid.toString());
    setIsEditOpen(true);
  };

  const editComputedTotal = editItems.reduce(
    (sum, it) => sum + it.unitPrice * it.quantity,
    0,
  );
  const editComputedCost = editItems.reduce(
    (sum, it) => sum + it.costPrice * it.quantity,
    0,
  );
  const editComputedProfit = editComputedTotal - editComputedCost;
  const editPaidNumber = parseFloat(editPaid) || 0;
  const editComputedDue = Math.max(0, editComputedTotal - editPaidNumber);
  const editComputedAdvance =
    editPaidNumber > editComputedTotal ? editPaidNumber - editComputedTotal : 0;

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...editItems];
    updated[index].quantity = newQty;
    setEditItems(updated);
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    const updated = [...editItems];
    updated[index].unitPrice = newPrice;
    setEditItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (editItems.length <= 1) {
      toast.error("Order must contain at least one product item");
      return;
    }
    const updated = [...editItems];
    const removed = updated.splice(index, 1)[0];
    setEditItems(updated);
    toast.info(`Removed ${removed.productName} from order`);
  };

  const handleAddProduct = () => {
    if (!selectedProductToAdd) return;
    const prod = products.find((p) => (p._id || p.id) === selectedProductToAdd);
    if (!prod) return;

    const existingIdx = editItems.findIndex(
      (it) => it.productId === (prod._id || prod.id),
    );
    if (existingIdx !== -1) {
      const updated = [...editItems];
      updated[existingIdx].quantity += 1;
      setEditItems(updated);
    } else {
      setEditItems([
        ...editItems,
        {
          productId: prod._id || prod.id,
          productName: prod.displayName || prod.name,
          quantity: 1,
          unitPrice: prod.sellPrice || 0,
          costPrice: prod.buyPrice || 0,
        },
      ]);
    }
    setSelectedProductToAdd("");
  };

  const handleSaveOrder = async () => {
    if (editItems.length === 0) {
      toast.error("Order cannot be empty");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        items: editItems,
        amountPaid: editPaidNumber,
        totalAmount: editComputedTotal,
      };

      const updated = await apiService.updateTransaction(rawId, payload);
      setOrder(updated);
      toast.success("Receipt & inventory reconciled successfully");
      setIsEditOpen(false);

      dispatch(fetchProducts());
      dispatch(fetchTransactions(undefined));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update order");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1400px] mx-auto text-slate-900 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
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
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic">
                Order Detail
              </h2>
              <Badge className="bg-emerald-500 text-white border-none shadow-sm text-[10px] uppercase font-black px-2 mb-1">
                Verified
              </Badge>
              {dueAmount > 0 ? (
                <Badge className="bg-rose-100 text-rose-700 border-none font-bold text-[10px] uppercase">
                  ৳{dueAmount.toLocaleString()} Due (বকেয়া)
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px] uppercase">
                  Fully Paid
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-500 font-medium italic">
              Comprehensive transactional audit, cost vs selling prices, and
              inventory displacement logic.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleOpenEdit}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-5 shadow-lg shadow-indigo-100"
          >
            <Edit className="w-3.5 h-3.5" />
            Modify Order Receipt
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsCashMemoOpen(true)}
            className="gap-2 border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            বাংলা ক্যাশ মেমো
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Summary Cards */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden border-t-4 border-t-slate-900 bg-white">
            <CardHeader className="bg-slate-50/50 pb-6">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">
                Reference Identity
              </p>
              <div className="flex items-center justify-between">
                <CardTitle className="text-3xl font-black text-slate-900 italic">
                  #{orderId}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-slate-900 transition-colors"
                  onClick={() => copyToClipboard(rawId)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Customer Account
                  </p>
                  {order.customerId &&
                  order.customerId !== "unknown" &&
                  onSelectCustomer ? (
                    <button
                      onClick={() => onSelectCustomer(order.customerId)}
                      className="font-black text-slate-800 uppercase italic tracking-tight text-left hover:text-indigo-600 hover:underline block"
                    >
                      {order.customerName || "Walk-in Customer"} →
                    </button>
                  ) : (
                    <p className="font-black text-slate-800 uppercase italic tracking-tight">
                      {order.customerName || "Walk-in Customer"}
                    </p>
                  )}
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    {order.customerId === "unknown"
                      ? "Unregistered Client"
                      : `ID: ${order.customerId}`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Transaction Date
                  </p>
                  <p className="font-bold text-slate-800">{formattedDate}</p>
                </div>
              </div>

              {/* Payment Settlement Breakdown */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">
                    Total Order Amount:
                  </span>
                  <span className="font-black text-slate-900">
                    ৳{totalAmount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">
                    Amount Paid (পেইড):
                  </span>
                  <span className="font-black text-emerald-700">
                    ৳{amountPaid.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">
                    Remaining Due (বকেয়া):
                  </span>
                  <span
                    className={cn(
                      "font-black",
                      dueAmount > 0 ? "text-rose-600" : "text-slate-400",
                    )}
                  >
                    ৳{dueAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-indigo-600 text-white border-none shadow-2xl shadow-indigo-200 rounded-3xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 transform translate-x-4 -translate-y-4 group-hover:translate-x-2 transition-transform">
              <TrendingUp className="w-32 h-32" />
            </div>
            <CardContent className="pt-10 pb-8">
              <p className="text-[11px] font-black text-indigo-200 uppercase tracking-[0.2em] mb-2 italic">
                Net Transaction Profit
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black italic">
                  +৳{totalProfit.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-indigo-200 uppercase italic">
                  Gains
                </span>
              </div>
              <div className="mt-8 pt-8 border-t border-white/10 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                    Revenue Point
                  </p>
                  <p className="text-lg font-black italic">
                    ৳{totalAmount.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                    Cost Basis (Buy Price)
                  </p>
                  <p className="text-lg font-black italic">
                    ৳{(totalAmount - totalProfit).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Line Items Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-white border-b border-slate-100 p-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-black text-slate-800 uppercase italic flex items-center gap-2">
                  <Package className="w-5 h-5 text-indigo-600" />
                  Product Displacement Matrix
                </CardTitle>
                <CardDescription className="italic font-medium text-slate-500">
                  Breakdown of items, buy prices, selling prices, and net margin
                  per SKU.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEdit}
                className="border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 font-bold text-xs uppercase gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                Modify Line Items
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto scrollbar-hide">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 border-b border-slate-100">
                      <TableHead className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Product Identity
                      </TableHead>
                      <TableHead className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Quantity
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Buy Price (Cost)
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Sell Price (Unit)
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Net Profit
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        Gross Total
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {order.items?.map((item: any, idx: number) => {
                      const profit = calculateProfit(item);
                      const gross =
                        (item.unitPrice || 0) * (item.quantity || 0);
                      const productId =
                        item.productId?._id ||
                        item.productId?.id ||
                        item.productId;
                      const product = products.find(
                        (entry) => (entry._id || entry.id) === productId,
                      );
                      const { unit: itemUnit, costPrice } = resolveSaleUnit(
                        item,
                        product,
                      );
                      return (
                        <TableRow
                          key={idx}
                          className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 group"
                        >
                          <TableCell className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-black">
                                {idx + 1}
                              </div>
                              <div>
                                <p className="font-black text-slate-800 uppercase italic text-xs tracking-tight">
                                  {item.productName || "Catalog Item"}
                                </p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-tighter">
                                  SKU #
                                  {(item.productId?.toString() || "N/A").slice(
                                    -6,
                                  )}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="px-6 py-5 text-center">
                            <span className="font-black text-slate-700 italic text-xs">
                              {item.quantity} {itemUnit}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-5 text-right font-bold text-slate-500 text-xs">
                            ৳{costPrice.toLocaleString()}
                          </TableCell>
                          <TableCell className="px-6 py-5 text-right font-bold text-slate-800 text-xs">
                            ৳{item.unitPrice?.toLocaleString()}
                          </TableCell>
                          <TableCell className="px-6 py-5 text-right">
                            <span
                              className={`font-black italic text-xs ${profit < 0 ? "text-rose-600" : "text-emerald-600"}`}
                            >
                              {profit < 0 ? "-৳" : "+৳"}
                              {Math.abs(profit).toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="px-6 py-5 text-right">
                            <span className="font-black text-slate-900 text-sm italic">
                              ৳{gross.toLocaleString()}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <div className="p-8 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">
                    Gross Total
                  </p>
                  <p className="text-2xl font-black italic leading-none">
                    ৳{totalAmount.toLocaleString()}
                  </p>
                </div>
                <div className="h-10 w-px bg-white/10 hidden md:block" />
                <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1 italic">
                    Total Efficiency Yield
                  </p>
                  <p className="text-2xl font-black text-emerald-400 italic leading-none">
                    +৳{totalProfit.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <div className="flex-1 md:w-40 bg-white/5 border border-white/10 p-3 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Paid Status
                  </p>
                  <p
                    className={cn(
                      "text-xs font-black uppercase italic",
                      dueAmount > 0 ? "text-amber-400" : "text-emerald-400",
                    )}
                  >
                    {dueAmount > 0
                      ? `৳${dueAmount.toLocaleString()} Due`
                      : "Fully Paid"}
                  </p>
                </div>
                <div className="flex-1 md:w-40 bg-white/5 border border-white/10 p-3 rounded-2xl">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    Paid Amount
                  </p>
                  <p className="text-xs font-black uppercase italic text-slate-200">
                    ৳{amountPaid.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={isCashMemoOpen} onOpenChange={setIsCashMemoOpen}>
        <DialogContent className="cash-memo-preview-dialog max-h-[92vh] max-w-3xl overflow-y-auto bg-white p-4 sm:p-6">
          <DialogHeader className="cash-memo-no-print">
            <DialogTitle>বাংলা ক্যাশ মেমো</DialogTitle>
            <DialogDescription>
              অর্ডারের সংরক্ষিত পণ্য ও মূল্য থেকে মেমো তৈরি হয়েছে।
            </DialogDescription>
          </DialogHeader>
          <BanglaCashMemo
            order={order}
          />
          <DialogFooter className="cash-memo-no-print flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCashMemoOpen(false)}>
              বন্ধ করুন
            </Button>
            <Button onClick={printCashMemo} className="gap-2 bg-black text-white hover:bg-black/90">
              <Printer className="h-4 w-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT ORDER DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-3xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <DialogTitle className="text-xl font-black text-slate-900 uppercase italic flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                <Edit className="w-4 h-4" />
              </div>
              Modify Order Receipt #{orderId}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              If customer rejects or cancels items after receipt was made,
              modify quantities, remove items, or adjust unit prices. Inventory
              and due balances will automatically update.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Add product */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-3">
              <div className="flex-1 w-full">
                <Select
                  value={selectedProductToAdd}
                  onValueChange={setSelectedProductToAdd}
                >
                  <SelectTrigger className="h-10 bg-white border-slate-200 text-xs font-bold">
                    <SelectValue placeholder="Add an additional product to this receipt..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white max-h-60">
                    {products.map((p) => (
                      <SelectItem key={p._id || p.id} value={p._id || p.id}>
                        {p.displayName || p.name} — ৳{p.sellPrice} (Stock:{" "}
                        {p.quantity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                onClick={handleAddProduct}
                disabled={!selectedProductToAdd}
                className="w-full sm:w-auto h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            {/* Line items table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <tr className="bg-slate-100/70 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-center w-28">Quantity</th>
                    <th className="px-4 py-3 text-right w-32">
                      Unit Price (৳)
                    </th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                    <th className="px-4 py-3 text-center w-16">Action</th>
                  </tr>
                </TableHeader>
                <TableBody>
                  {editItems.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3 text-xs font-bold text-slate-800">
                        {item.productName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleUpdateItemQuantity(
                              idx,
                              parseInt(e.target.value) || 1,
                            )
                          }
                          className="h-8 w-20 text-center font-bold text-xs mx-auto"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Input
                          type="number"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleUpdateItemPrice(
                              idx,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="h-8 w-28 text-right font-bold text-xs ml-auto"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-black text-xs text-slate-900">
                        ৳{(item.quantity * item.unitPrice).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(idx)}
                          className="h-7 w-7 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                          title="Customer rejects this item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Financial summary */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    New Order Total
                  </p>
                  <p className="text-xl font-black text-slate-900">
                    ৳{editComputedTotal.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Estimated Profit
                  </p>
                  <p className="text-xl font-black text-emerald-600">
                    +৳{editComputedProfit.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">
                    Items In Order
                  </p>
                  <p className="text-xl font-black text-slate-800">
                    {editItems.length} Products
                  </p>
                </div>
              </div>

              {/* Amount paid input */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Amount Paid / Received (টাকা পেয়েছি)
                    </label>
                    <p className="text-[11px] text-slate-500">
                      Update how much the customer paid for this modified
                      receipt.
                    </p>
                  </div>
                  <div className="w-full sm:w-60">
                    <Input
                      type="number"
                      value={editPaid}
                      onChange={(e) => setEditPaid(e.target.value)}
                      className="h-10 text-right font-black text-base border-slate-300"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-between items-center text-xs font-bold">
                  <span>Balance Impact:</span>
                  {editComputedDue > 0 ? (
                    <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                      Remaining Due (বকেয়া): ৳{editComputedDue.toLocaleString()}{" "}
                      (Added to customer due)
                    </span>
                  ) : editComputedAdvance > 0 ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      Overpaid / Advance (অগ্রিম জমা): ৳
                      {editComputedAdvance.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                      Full Payment Settled (No Due)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsEditOpen(false)}
              className="text-slate-600 font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveOrder}
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-6 shadow-md shadow-indigo-100"
            >
              {isSaving ? "Updating..." : "Save & Sync Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
