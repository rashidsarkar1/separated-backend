/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  Save,
  Package,
  User,
  Receipt,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  Coins,
  RefreshCw,
  TrendingUp,
  Tag,
  ArrowRight,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { apiService } from "../services/apiService";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchProducts } from "../store/slices/inventorySlice";
import { fetchTransactions } from "../store/slices/transactionSlice";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { resolveSaleUnit } from "../utils/salesUnits";

interface ModifyOrderReceiptProps {
  orderId?: string | null;
  initialOrder?: any;
  onBack: () => void;
  onOrderUpdated?: (updatedOrder: any) => void;
  onSelectCustomer?: (customerId: string) => void;
}

export function ModifyOrderReceipt({
  orderId: propOrderId,
  initialOrder,
  onBack,
  onOrderUpdated,
  onSelectCustomer,
}: ModifyOrderReceiptProps) {
  const dispatch = useAppDispatch();
  const { products } = useAppSelector((state) => state.inventory);

  const [order, setOrder] = useState<any>(initialOrder || null);
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(!initialOrder && !!propOrderId);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [items, setItems] = useState<any[]>([]);
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [removedItemsLog, setRemovedItemsLog] = useState<
    { name: string; quantity: number }[]
  >([]);

  // Product search state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const rawOrderId = propOrderId || initialOrder?._id || initialOrder?.id;

  // Load initial products list if not loaded
  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  // Load order data if missing
  useEffect(() => {
    async function loadData() {
      if (!rawOrderId) return;
      try {
        setLoading(true);
        const data = await apiService.getTransactionById(rawOrderId);
        setOrder(data);
      } catch (err: any) {
        toast.error("Failed to load sales order", { description: err.message });
      } finally {
        setLoading(false);
      }
    }

    if (!order && rawOrderId) {
      loadData();
    }
  }, [rawOrderId, order]);

  // Sync order items to editable state
  useEffect(() => {
    if (order) {
      setItems(
        (order.items || []).map((it: any) => {
          const productId =
            it.productId?._id || it.productId?.id || it.productId;
          const product =
            products.find((p) => (p._id || p.id) === productId) || it.productId;
          const resolved = resolveSaleUnit(it, product);
          return {
            productId,
            productName:
              it.productName ||
              it.productId?.name ||
              product?.name ||
              "Product",
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || 0,
            costPrice: resolved.costPrice,
            unit: resolved.unit,
            isPiece: resolved.isPiece,
            piecesPerUnit: resolved.piecesPerUnit,
          };
        }),
      );
      const paid =
        order.amountPaid !== undefined
          ? order.amountPaid
          : order.totalAmount || 0;
      setAmountPaidInput(paid.toString());

      // Fetch customer details to get due balance
      const cId =
        order.customerId?._id || order.customerId?.id || order.customerId;
      if (cId && cId !== "unknown" && cId !== "walk-in") {
        apiService
          .getCustomerById(cId)
          .then((cust) => {
            if (cust) setCustomer(cust);
          })
          .catch(() => {});
      }
    }
  }, [order, products]);

  // Available categories for search
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [products]);

  // Filtered products for search
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === "ALL" || p.category === selectedCategory;
      if (!matchesCategory) return false;
      if (!q) return true;
      const name = (p.name || "").toLowerCase();
      const displayName = (p.displayName || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const category = (p.category || "").toLowerCase();
      return (
        name.includes(q) ||
        displayName.includes(q) ||
        sku.includes(q) ||
        category.includes(q)
      );
    });
  }, [products, searchQuery, selectedCategory]);

  // Add product to receipt
  const handleAddProduct = (prod: any) => {
    const prodId = prod._id || prod.id;
    const existingIdx = items.findIndex((it) => it.productId === prodId);

    if (existingIdx !== -1) {
      const updated = [...items];
      updated[existingIdx].quantity += 1;
      setItems(updated);
      toast.success(
        `Incremented quantity for ${prod.displayName || prod.name} (Now: ${updated[existingIdx].quantity})`,
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          productId: prodId,
          productName: prod.displayName || prod.name,
          quantity: 1,
          unitPrice: prod.sellPrice || 0,
          costPrice: prod.buyPrice || 0,
          unit: prod.unit || "Unit",
          isPiece: false,
          piecesPerUnit: Math.max(1, Number(prod.piecesPerUnit) || 1),
        },
      ]);
      toast.success(`Added ${prod.displayName || prod.name} to receipt`);
    }
  };

  // Modify item quantity
  const handleUpdateQuantity = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...items];
    updated[index].quantity = newQty;
    setItems(updated);
  };

  // Modify item unit price
  const handleUpdatePrice = (index: number, newPrice: number) => {
    if (newPrice < 0 || isNaN(newPrice)) return;
    const updated = [...items];
    updated[index].unitPrice = newPrice;
    setItems(updated);
  };

  const handleUpdateUnit = (index: number, unit: string) => {
    const updated = [...items];
    const item = updated[index];
    const product = products.find((p) => (p._id || p.id) === item.productId);
    if (!product) return;
    const isPiece =
      unit.toLowerCase() === "piece" && product.unit?.toLowerCase() !== "piece";
    const piecesPerUnit = Math.max(1, Number(product.piecesPerUnit) || 1);
    updated[index] = {
      ...item,
      unit,
      isPiece,
      piecesPerUnit,
      unitPrice: product.sellPrice / (isPiece ? piecesPerUnit : 1),
      costPrice: product.buyPrice / (isPiece ? piecesPerUnit : 1),
    };
    setItems(updated);
  };

  // Remove item from receipt (customer rejected it)
  const handleRemoveItem = (index: number) => {
    const removed = items[index];
    setRemovedItemsLog((prev) => [
      ...prev,
      { name: removed.productName, quantity: removed.quantity },
    ]);
    setItems(items.filter((_, i) => i !== index));
    toast.info(
      `Removed ${removed.productName} from receipt. Stock will return to warehouse on save.`,
    );
  };

  // Computed financial figures
  const computedTotal = useMemo(() => {
    return items.reduce(
      (sum, it) => sum + (it.quantity || 0) * (it.unitPrice || 0),
      0,
    );
  }, [items]);

  const computedCostTotal = useMemo(() => {
    return items.reduce(
      (sum, it) => sum + (it.quantity || 0) * (it.costPrice || 0),
      0,
    );
  }, [items]);

  const computedProfit = useMemo(() => {
    return computedTotal - computedCostTotal;
  }, [computedTotal, computedCostTotal]);

  const paidNumber = parseFloat(amountPaidInput) || 0;
  const computedDue = Math.max(0, computedTotal - paidNumber);
  const computedAdvance = Math.max(0, paidNumber - computedTotal);

  const originalTotal = order?.totalAmount || 0;
  const originalPaid =
    order?.amountPaid !== undefined ? order.amountPaid : originalTotal;
  const originalDue =
    order?.dueAmount !== undefined
      ? order.dueAmount
      : Math.max(0, originalTotal - originalPaid);
  const totalDifference = computedTotal - originalTotal;

  // Handle Save
  const handleSave = async () => {
    if (items.length === 0) {
      toast.error(
        "Order cannot be empty. Please include at least one product.",
      );
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        items: items.map((it) => ({
          productId: it.productId,
          productName: it.productName,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          costPrice: it.costPrice,
          unit: it.unit,
          isPiece: it.isPiece,
          piecesPerUnit: it.piecesPerUnit,
        })),
        amountPaid: paidNumber,
        totalAmount: computedTotal,
      };

      const updated = await apiService.updateTransaction(rawOrderId, payload);
      toast.success("Receipt Modified Successfully!", {
        description: `Total: ৳${computedTotal.toLocaleString()} | Paid: ৳${paidNumber.toLocaleString()} | Due: ৳${computedDue.toLocaleString()}`,
      });

      // Refresh stores
      dispatch(fetchProducts());
      dispatch(fetchTransactions(undefined));

      if (onOrderUpdated) {
        onOrderUpdated(updated);
      } else {
        onBack();
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Failed to modify order receipt",
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
        <p className="font-bold text-slate-700">Loading Order Receipt...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center space-y-4 max-w-md mx-auto">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-800">
          Sales Order Not Found
        </h3>
        <p className="text-xs text-slate-500">
          The requested invoice ID could not be loaded.
        </p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          ← Back
        </Button>
      </div>
    );
  }

  const orderInvoiceNo = ((order._id || order.id)?.toString() || "N/A")
    .slice(-8)
    .toUpperCase();
  const orderDate = new Date(order.createdAt || order.orderDate || order.date);
  const formattedDate = !isNaN(orderDate.getTime())
    ? format(orderDate, "PPP p")
    : "N/A";
  const custId =
    order.customerId?._id || order.customerId?.id || order.customerId;
  const isRegisteredCustomer =
    custId && custId !== "unknown" && custId !== "walk-in";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto pb-28 text-slate-900">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="rounded-xl h-10 w-10 border-slate-200 text-slate-600 hover:bg-slate-100 shrink-0"
            title="Cancel & Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">
                Modify Order Receipt
              </h1>
              <Badge className="bg-indigo-600 text-white font-mono text-xs px-2.5 py-0.5 shadow-none">
                #{orderInvoiceNo}
              </Badge>
              {originalDue > 0 ? (
                <Badge className="bg-rose-100 text-rose-700 font-bold text-[10px] uppercase">
                  Previous Due: ৳{originalDue.toLocaleString()}
                </Badge>
              ) : (
                <Badge className="bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase">
                  Previous: Paid in Full
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Add or remove products, edit quantities or rates, and update
              customer payment settlement.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onBack}
            className="border-slate-200 text-slate-600 font-bold text-xs uppercase"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || items.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-6 shadow-md shadow-indigo-100 gap-2"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Reconciling..." : "Save & Reconcile Order"}
          </Button>
        </div>
      </div>

      {/* Alert if customer rejects items */}
      {removedItemsLog.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between text-amber-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">
                Customer Rejected Product Adjustment Registered
              </p>
              <p className="text-amber-700">
                {removedItemsLog
                  .map((r) => `${r.quantity}x ${r.name}`)
                  .join(", ")}{" "}
                will be restored to your warehouse inventory automatically upon
                saving.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRemovedItemsLog([])}
            className="text-amber-700 hover:text-amber-900 text-xs font-bold"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Main Grid: Left = Search & Line Items | Right = Ledger & Financial Reconcilation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* SECTION 1: SEARCH & ADD PRODUCTS TO THIS RECEIPT */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Search className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      Add Product to Receipt
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Search catalog by name, display name, or SKU to add more
                      items to this order.
                    </CardDescription>
                  </div>
                </div>

                {/* Category pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1">
                  {categories.slice(0, 5).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg transition-all shrink-0",
                        selectedCategory === cat
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Search Input */}
              <div className="relative mt-3">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  placeholder="Type product name, SKU, or receipt display name to search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-9 h-11 border-slate-200 bg-white rounded-xl text-sm font-medium focus:border-indigo-500 shadow-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </CardHeader>

            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-2 px-1">
                <span>
                  Showing{" "}
                  <strong className="text-slate-800">
                    {filteredProducts.length}
                  </strong>{" "}
                  available products
                </span>
                {searchQuery && (
                  <span className="text-indigo-600 font-bold">
                    Filtered by: "{searchQuery}"
                  </span>
                )}
              </div>

              {/* Product Grid / List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {filteredProducts.slice(0, 12).map((prod) => {
                  const prodId = prod._id || prod.id;
                  const inReceipt = items.find((it) => it.productId === prodId);
                  const isOutOfStock = (prod.quantity ?? 0) <= 0;

                  return (
                    <div
                      key={prodId}
                      className={cn(
                        "p-3 rounded-xl border transition-all flex items-center justify-between gap-3 text-left bg-white",
                        inReceipt
                          ? "border-indigo-200 bg-indigo-50/20 shadow-sm"
                          : "border-slate-100 hover:border-slate-200 hover:bg-slate-50/70",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-xs text-slate-900 truncate">
                            {prod.displayName || prod.name}
                          </p>
                          {inReceipt && (
                            <Badge className="bg-indigo-100 text-indigo-700 text-[9px] font-black px-1.5 py-0 rounded">
                              Qty: {inReceipt.quantity}
                            </Badge>
                          )}
                        </div>

                        {prod.displayName && prod.displayName !== prod.name && (
                          <p className="text-[10px] text-slate-400 truncate">
                            Catalog: {prod.name}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-1 text-[11px]">
                          <span className="font-black text-indigo-700">
                            ৳{prod.sellPrice}
                          </span>
                          <span className="text-slate-300">|</span>
                          <span
                            className={cn(
                              "text-[10px] font-medium",
                              isOutOfStock
                                ? "text-rose-500 font-bold"
                                : "text-slate-500",
                            )}
                          >
                            Stock: {prod.quantity ?? 0} {prod.unit || "units"}
                          </span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddProduct(prod)}
                        className={cn(
                          "h-8 px-3 text-xs font-bold uppercase shrink-0 rounded-lg",
                          inReceipt
                            ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                            : "bg-slate-900 text-white hover:bg-slate-800",
                        )}
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        {inReceipt ? "Add More" : "Add"}
                      </Button>
                    </div>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-400">
                    <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-bold uppercase">
                      No matching products found
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try searching with a different SKU or product keyword.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* SECTION 2: CURRENT RECEIPT LINE ITEMS */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 p-5 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600" />
                  Receipt Line Items ({items.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Edit unit selling prices, adjust quantities, or remove
                  rejected items.
                </CardDescription>
              </div>
              <span className="text-xs font-mono font-bold text-slate-600">
                Total: ৳{computedTotal.toLocaleString()}
              </span>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                      <TableHead className="px-5 py-3.5 text-left">
                        Product Item / Unit
                      </TableHead>
                      <TableHead className="px-4 py-3.5 text-right w-24">
                        Cost Basis
                      </TableHead>
                      <TableHead className="px-4 py-3.5 text-right w-36">
                        Unit Price (৳)
                      </TableHead>
                      <TableHead className="px-4 py-3.5 text-center w-36">
                        Quantity
                      </TableHead>
                      <TableHead className="px-5 py-3.5 text-right w-32">
                        Line Total
                      </TableHead>
                      <TableHead className="px-4 py-3.5 text-center w-16">
                        Remove
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length > 0 ? (
                      items.map((it, idx) => {
                        const lineTotal =
                          (it.quantity || 1) * (it.unitPrice || 0);
                        const lineCost =
                          (it.quantity || 1) * (it.costPrice || 0);
                        const lineProfit = lineTotal - lineCost;
                        const product = products.find(
                          (p) => (p._id || p.id) === it.productId,
                        );
                        const baseUnit = product?.unit || it.unit || "Unit";
                        const piecesPerUnit = Math.max(
                          1,
                          Number(it.piecesPerUnit) ||
                            Number(product?.piecesPerUnit) ||
                            1,
                        );

                        return (
                          <TableRow
                            key={idx}
                            className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                          >
                            {/* Product Info */}
                            <TableCell className="px-5 py-4">
                              <div className="font-bold text-slate-900 text-xs">
                                {it.productName}
                              </div>
                              <Select
                                value={it.unit || baseUnit}
                                onValueChange={(unit) =>
                                  handleUpdateUnit(idx, unit)
                                }
                              >
                                <SelectTrigger className="mt-2 h-8 w-36 bg-white text-xs font-semibold">
                                  <SelectValue placeholder="Choose unit" />
                                </SelectTrigger>
                                <SelectContent className="bg-white">
                                  <SelectItem value={baseUnit}>
                                    {baseUnit}
                                  </SelectItem>
                                  {piecesPerUnit > 1 &&
                                    baseUnit.toLowerCase() !== "piece" && (
                                      <SelectItem value="Piece">
                                        Piece
                                      </SelectItem>
                                    )}
                                </SelectContent>
                              </Select>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Profit:{" "}
                                <span
                                  className={`font-bold ${lineProfit < 0 ? "text-rose-600" : "text-emerald-600"}`}
                                >
                                  {lineProfit < 0 ? "-৳" : "+৳"}
                                  {Math.abs(lineProfit).toLocaleString()}
                                </span>
                              </div>
                            </TableCell>

                            {/* Cost basis */}
                            <TableCell className="px-4 py-4 text-right text-xs font-mono text-slate-500">
                              ৳{(it.costPrice || 0).toLocaleString()} /{" "}
                              {it.unit || baseUnit}
                            </TableCell>

                            {/* Editable Unit Price */}
                            <TableCell className="px-4 py-4 text-right">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                                  ৳
                                </span>
                                <Input
                                  type="number"
                                  min="0"
                                  value={it.unitPrice}
                                  onChange={(e) =>
                                    handleUpdatePrice(
                                      idx,
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="h-8 pl-6 pr-2 text-right font-bold text-xs border-slate-200 bg-white rounded-lg w-28 ml-auto"
                                />
                                <p className="mt-1 text-[9px] text-slate-400">
                                  per {it.unit || baseUnit}
                                </p>
                              </div>
                            </TableCell>

                            {/* Quantity Controls */}
                            <TableCell className="px-4 py-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  disabled={it.quantity <= 1}
                                  onClick={() =>
                                    handleUpdateQuantity(idx, it.quantity - 1)
                                  }
                                  className="h-7 w-7 rounded-lg border-slate-200 text-slate-600"
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={it.quantity}
                                  onChange={(e) =>
                                    handleUpdateQuantity(
                                      idx,
                                      parseInt(e.target.value) || 1,
                                    )
                                  }
                                  className="h-7 w-14 text-center font-black text-xs border-slate-200 rounded-lg p-0"
                                />
                                <span className="text-[10px] font-bold text-slate-500">
                                  {it.unit || baseUnit}
                                </span>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  onClick={() =>
                                    handleUpdateQuantity(idx, it.quantity + 1)
                                  }
                                  className="h-7 w-7 rounded-lg border-slate-200 text-slate-600"
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </TableCell>

                            {/* Line Total */}
                            <TableCell className="px-5 py-4 text-right font-black text-xs text-slate-900">
                              ৳{lineTotal.toLocaleString()}
                            </TableCell>

                            {/* Remove button */}
                            <TableCell className="px-4 py-4 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveItem(idx)}
                                className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                                title="Customer rejects item (removes from receipt & returns stock)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-40 text-center text-slate-400"
                        >
                          <Package className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                          <p className="font-bold text-xs uppercase">
                            All products removed from receipt
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Use the search box above to add items back to this
                            order.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 col): Financial Settlement & Ledger Reconcilation */}
        <div className="space-y-6">
          {/* Card 1: Customer Account & Ledger Info */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-5 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Customer Ledger
                </CardTitle>
              </div>
              {isRegisteredCustomer && onSelectCustomer && (
                <button
                  onClick={() => onSelectCustomer(custId)}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  Profile
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Customer Name
                </p>
                <p className="text-base font-black text-slate-900">
                  {order.customerName || customer?.name || "Walk-in Customer"}
                </p>
                {customer?.phone && (
                  <p className="text-xs font-medium text-slate-500">
                    {customer.phone}
                  </p>
                )}
              </div>

              {customer && (
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Previous Due
                    </span>
                    <span
                      className={cn(
                        "font-black",
                        (customer.dueBalance || 0) > 0
                          ? "text-rose-600"
                          : "text-slate-700",
                      )}
                    >
                      ৳{(customer.dueBalance || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">
                      Advance Balance
                    </span>
                    <span
                      className={cn(
                        "font-black",
                        (customer.advanceBalance || 0) > 0
                          ? "text-emerald-700"
                          : "text-slate-700",
                      )}
                    >
                      ৳{(customer.advanceBalance || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="text-[11px] text-slate-400 pt-1">
                Original Transaction: {formattedDate}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Financial Summary & Live Due/Advance Impact */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 p-5">
              <CardTitle className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-600" />
                Financial Settlement
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Live calculation of dues or advance credits based on modified
                receipt.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Order Amount Comparison */}
              <div className="space-y-2 py-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-medium">
                    Original Order Total:
                  </span>
                  <span className="font-bold text-slate-700 line-through">
                    ৳{originalTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-800 font-bold">
                    New Modified Total:
                  </span>
                  <span className="font-black text-indigo-700 text-sm">
                    ৳{computedTotal.toLocaleString()}
                  </span>
                </div>
                {totalDifference !== 0 && (
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400">Order Difference:</span>
                    <span
                      className={cn(
                        "font-bold",
                        totalDifference > 0
                          ? "text-emerald-600"
                          : "text-rose-600",
                      )}
                    >
                      {totalDifference > 0
                        ? `+৳${totalDifference.toLocaleString()}`
                        : `-৳${Math.abs(totalDifference).toLocaleString()}`}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100">
                  <span className="text-slate-500 font-medium">
                    Estimated Profit:
                  </span>
                  <span className="font-black text-emerald-600">
                    +৳{computedProfit.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Amount Paid Input */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wide">
                    Amount Paid (টাকা পেয়েছি)
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setAmountPaidInput(computedTotal.toString())
                      }
                      className="text-[10px] font-bold text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded"
                    >
                      Pay Full
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmountPaidInput("0")}
                      className="text-[10px] font-bold text-slate-500 hover:underline bg-slate-100 px-2 py-0.5 rounded"
                    >
                      Zero
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    ৳
                  </span>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={amountPaidInput}
                    onChange={(e) => setAmountPaidInput(e.target.value)}
                    className="pl-8 text-right font-black text-lg h-12 border-slate-300 rounded-xl bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>

              {/* Live Due / Advance Outcome Card */}
              <div
                className={cn(
                  "p-4 rounded-xl border space-y-1 text-xs",
                  computedDue > 0
                    ? "bg-rose-50/60 border-rose-200 text-rose-900"
                    : computedAdvance > 0
                      ? "bg-emerald-50/60 border-emerald-200 text-emerald-900"
                      : "bg-slate-50 border-slate-200 text-slate-700",
                )}
              >
                <div className="flex justify-between items-center font-black">
                  <span className="uppercase tracking-wider">
                    {computedDue > 0
                      ? "Remaining Due (বকেয়া):"
                      : computedAdvance > 0
                        ? "Overpaid / Advance (অগ্রিম জমা):"
                        : "Settlement Status:"}
                  </span>
                  <span className="text-base font-black">
                    {computedDue > 0
                      ? `৳${computedDue.toLocaleString()}`
                      : computedAdvance > 0
                        ? `৳${computedAdvance.toLocaleString()}`
                        : "Fully Paid (৳0 Due)"}
                  </span>
                </div>
                <p className="text-[11px] leading-tight opacity-80 pt-1">
                  {computedDue > 0
                    ? `৳${computedDue.toLocaleString()} will be automatically updated into ${order.customerName || "customer"}'s due ledger.`
                    : computedAdvance > 0
                      ? `৳${computedAdvance.toLocaleString()} excess payment will be credited to customer's advance deposit balance.`
                      : "Order total is fully cleared. No balance due will be accrued."}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving || items.length === 0}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-indigo-100 gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSaving
                    ? "Reconciling Inventory & Ledger..."
                    : "Save & Reconcile Order"}
                </Button>

                <Button
                  variant="outline"
                  onClick={onBack}
                  className="w-full h-10 border-slate-200 text-slate-600 font-bold text-xs uppercase rounded-xl"
                >
                  Cancel & Exit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
