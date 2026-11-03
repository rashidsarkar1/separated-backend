import { TakaIcon } from "../components/common/TakaIcon";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import {
  Package,
  ArrowLeft,
  Users,
  TrendingUp,
  Receipt,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  Store,
  Search,
  ShoppingCart,
  Clock,
  Calendar,
  ChevronRight,
  Tag,
  BarChart3,
  Layers,
  Plus,
  Minus,
  Crown,
  Medal,
  Award,
  ArrowUpRight,
  ExternalLink,
  Eye,
  RefreshCw,
  Images,
  Camera,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { useAppSelector, useAppDispatch } from "../store/hooks";
import { fetchInventory, updateStock } from "../store/slices/inventorySlice";
import { fetchDealers } from "../store/slices/dealerSlice";
import { Pagination } from "../components/common/Pagination";
import { formatVolume } from "../utils/salesUnits";
import { apiService } from "../services/apiService";
import { DealerReceiptUploader } from "../components/common/DealerReceiptUploader";
import { DealerReceipt, getReceiptsByProduct } from "../utils/receiptStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

interface ProductDetailsProps {
  productId: string | null;
  onBack: () => void;
  onNavigateToEdit: (productId: string) => void;
  onSelectProduct: (productId: string) => void;
  onNavigateToSell?: () => void;
  onNavigateToCustomer?: (customerId: string) => void;
  onViewOrderDetail?: (order: any) => void;
  onNavigateToReceipts?: (productId: string) => void;
}

export function ProductDetails({
  productId,
  onBack,
  onNavigateToEdit,
  onSelectProduct,
  onNavigateToSell,
  onNavigateToCustomer,
  onViewOrderDetail,
  onNavigateToReceipts,
}: ProductDetailsProps) {
  const dispatch = useAppDispatch();
  const { products } = useAppSelector((state) => state.inventory);
  const { dealers } = useAppSelector((state) => state.dealers);

  const [productSearch, setProductSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [stockAdjustment, setStockAdjustment] = useState("");
  const [isAdjustingStock, setIsAdjustingStock] = useState(false);
  const [leaderboardPage, setLeaderboardPage] = useState(1);
  const leaderboardPageSize = 10;
  const [txPage, setTxPage] = useState(1);
  const txPageSize = 30;
  const [intelligenceRange, setIntelligenceRange] = useState("all");
  const [buyerOrder, setBuyerOrder] = useState<"most" | "least">("most");
  const [intelligence, setIntelligence] = useState<any>(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [lastSalePrices, setLastSalePrices] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<DealerReceipt[]>([]);

  useEffect(() => {
    setLeaderboardPage(1);
    setTxPage(1);
  }, [productId]);

  useEffect(() => {
    if (!productId) {
      setIntelligence(null);
      setLastSalePrices([]);
      return;
    }

    let active = true;
    setIntelligenceLoading(true);
    apiService
      .getProductIntelligence(
        productId,
        intelligenceRange,
        leaderboardPage,
        txPage,
        leaderboardPageSize,
        txPageSize,
        buyerOrder,
      )
      .then((response) => {
        if (!active) return;
        const result = response.data || {};
        setIntelligence(result);
        setLastSalePrices(
          (result.history || []).flatMap((order: any) => {
            const item = (order.items || []).find(
              (line: any) => String(line.productId) === String(productId),
            );
            const unitPrice = Number(
              item?.unitPrice ?? item?.price ?? item?.sellPrice ?? 0,
            );
            return item
              ? [
                  {
                    orderId: String(order._id || order.id),
                    date: order.createdAt || order.orderDate || order.date,
                    customerName: order.customerName || "Walk-in Customer",
                    unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
                    quantity: Number(item.quantity) || 0,
                    unit: item.unit || "Unit",
                    receipt: order,
                  },
                ]
              : [];
          }),
        );
      })
      .catch(() => {
        if (active) {
          setIntelligence(null);
          setLastSalePrices([]);
        }
      })
      .finally(() => {
        if (active) setIntelligenceLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    productId,
    intelligenceRange,
    leaderboardPage,
    txPage,
    buyerOrder,
    leaderboardPageSize,
    txPageSize,
  ]);

  useEffect(() => {
    if (products.length === 0) {
      dispatch(fetchInventory(undefined));
    }
    if (dealers.length === 0) {
      dispatch(fetchDealers({ page: 1, limit: 200, range: "all" }));
    }
  }, [dispatch, products.length, dealers.length]);

  const loadReceipts = async () => {
    if (!productId) {
      setReceipts([]);
      return;
    }
    try {
      const rows = await getReceiptsByProduct(productId);
      setReceipts(Array.isArray(rows) ? rows : []);
    } catch {
      setReceipts([]);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [productId]);

  // Current product
  const product = useMemo(() => {
    return products.find((p) => p._id === productId || p.id === productId);
  }, [products, productId]);

  // Dealer info
  const dealer = useMemo(() => {
    if (!product?.dealerId) return null;
    return dealers.find(
      (d) => d._id === product.dealerId || d.id === product.dealerId,
    );
  }, [dealers, product?.dealerId]);

  // Search filter for switching products
  const matchingProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const term = productSearch.toLowerCase();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          (p.displayName && p.displayName.toLowerCase().includes(term)) ||
          (p.sku && p.sku.toLowerCase().includes(term)) ||
          (p.category && p.category.toLowerCase().includes(term)),
      )
      .slice(0, 6);
  }, [products, productSearch]);

  const customerRankings = intelligence?.buyers || [];
  const totalVolumeSold = Number(intelligence?.summary?.totalUnits) || 0;
  const totalGrossRevenue = Number(intelligence?.summary?.totalRevenue) || 0;
  const totalNetProfit = Number(intelligence?.summary?.totalProfit) || 0;
  const totalLeaderboardPages =
    Math.ceil((intelligence?.buyerMeta?.total || 0) / leaderboardPageSize) || 1;
  const totalTxPages =
    Math.ceil((intelligence?.historyMeta?.total || 0) / txPageSize) || 1;
  const paginatedRankings = customerRankings;
  // Inventory stats
  const currentStock = product?.quantity ?? 0;
  const threshold = product?.lowStockThreshold ?? 15;
  const stockCostValue = currentStock * (product?.buyPrice ?? 0);
  const stockRetailValue = currentStock * (product?.sellPrice ?? 0);
  const unitProfit = (product?.sellPrice ?? 0) - (product?.buyPrice ?? 0);
  const piecesPerUnit = Math.max(1, Number(product?.piecesPerUnit) || 1);
  const isMultiPieceUnit =
    piecesPerUnit > 1 && product?.unit?.toLowerCase() !== "piece";
  const pieceBuyPrice = (product?.buyPrice ?? 0) / piecesPerUnit;
  const pieceSellPrice = (product?.sellPrice ?? 0) / piecesPerUnit;
  const pieceProfit = pieceSellPrice - pieceBuyPrice;
  const profitMarginPercent =
    product?.sellPrice && product.sellPrice > 0
      ? ((unitProfit / product.sellPrice) * 100).toFixed(1)
      : "0";

  const stockStatus =
    currentStock === 0
      ? "Out of Stock"
      : currentStock <= threshold
        ? "Low Stock"
        : "In Stock";

  // Handle Quick Stock Adjust
  const handleStockUpdate = async () => {
    const qtyNum = parseInt(stockAdjustment);
    if (isNaN(qtyNum)) {
      toast.error("Please enter a valid stock quantity number");
      return;
    }
    if (!productId) return;

    try {
      setIsAdjustingStock(true);
      await dispatch(updateStock({ id: productId, quantity: qtyNum })).unwrap();
      toast.success("Stock level updated successfully", {
        description: `Current quantity adjusted to ${qtyNum} ${product?.unit || "units"}.`,
      });
      setStockAdjustment("");
    } catch (err: any) {
      toast.error("Failed to update stock", { description: err.message });
    } finally {
      setIsAdjustingStock(false);
    }
  };

  if (!product) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <Package className="w-16 h-16 text-slate-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">
          Select a Product to View Details
        </h2>
        <p className="text-xs text-slate-500">
          Search for a product below or return to the inventory catalog.
        </p>

        {/* Search Input when no product selected */}
        <div className="relative max-w-sm mx-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search products by name, SKU, or display name..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="pl-9 h-11 border-slate-300 bg-white rounded-xl text-sm"
          />
          {matchingProducts.length > 0 && (
            <div className="absolute top-12 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-20 text-left">
              {matchingProducts.map((p) => (
                <button
                  key={p._id || p.id}
                  onClick={() => {
                    onSelectProduct(p._id || p.id);
                    setProductSearch("");
                  }}
                  className="w-full p-3 hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-none text-left"
                >
                  <div>
                    <p className="font-bold text-slate-800 text-xs">{p.name}</p>
                    <p className="text-[10px] text-slate-400">
                      Display: {p.displayName || p.name}
                    </p>
                  </div>
                  <span className="text-indigo-600 font-bold text-xs">
                    ${p.sellPrice}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button onClick={onBack} variant="outline" className="mt-4">
          ← Back to Inventory
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto pb-24">
      {/* Top Navigation & Product Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="rounded-xl h-10 w-10 border-slate-200 text-slate-600 hover:bg-slate-100 shrink-0"
            title="Back to Inventory"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Product Intelligence
              </span>
              <span className="text-slate-300">/</span>
              <span className="text-xs text-slate-500 font-medium">
                {product.category}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              {product.name}
            </h1>
          </div>
        </div>

        {/* Global Product Search & Switch Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search / switch product..."
              value={productSearch}
              onFocus={() => setShowSearchResults(true)}
              onChange={(e) => {
                setProductSearch(e.target.value);
                setShowSearchResults(true);
              }}
              className="pl-9 pr-8 h-10 border-slate-200 bg-white rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20"
            />
            {productSearch && (
              <button
                onClick={() => {
                  setProductSearch("");
                  setShowSearchResults(false);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}

            {showSearchResults && matchingProducts.length > 0 && (
              <div className="absolute top-11 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-30">
                <div className="p-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  Select Product
                </div>
                {matchingProducts.map((p) => (
                  <button
                    key={p._id || p.id}
                    onClick={() => {
                      onSelectProduct(p._id || p.id);
                      setProductSearch("");
                      setShowSearchResults(false);
                    }}
                    className="w-full px-3 py-2.5 hover:bg-indigo-50/60 flex items-center justify-between border-b border-slate-100 last:border-none text-left transition-colors"
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-xs leading-snug">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Receipt: {p.displayName || p.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="text-indigo-600 font-bold text-xs">
                        ${p.sellPrice}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {p.quantity ?? 0} {p.unit}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => onNavigateToEdit(productId!)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-10 px-4 rounded-xl gap-1.5 shadow-sm shadow-indigo-100"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Edit All Fields
            </Button>
            {onNavigateToSell && (
              <Button
                onClick={onNavigateToSell}
                variant="outline"
                className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold h-10 px-4 rounded-xl gap-1.5"
              >
                <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />
                Quick Sell
              </Button>
            )}
            {onNavigateToReceipts && (
              <Button
                onClick={() => onNavigateToReceipts(productId!)}
                variant="outline"
                className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-xs font-bold h-10 px-4 rounded-xl gap-1.5"
              >
                <Images className="w-3.5 h-3.5" />
                View All Images
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Product Highlight Banner: Name vs Receipt Display Name */}
      <Card className="border-indigo-100 bg-gradient-to-r from-indigo-50/50 via-white to-slate-50 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Display Name Section */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded">
                  SKU: {product.sku || "N/A"}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                  {product.category || "General"}
                </span>
                <Badge
                  className={cn(
                    "font-bold text-[10px] uppercase border-none px-2.5 py-0.5",
                    stockStatus === "In Stock" &&
                      "bg-emerald-100 text-emerald-800",
                    stockStatus === "Low Stock" &&
                      "bg-amber-100 text-amber-800",
                    stockStatus === "Out of Stock" &&
                      "bg-rose-100 text-rose-800",
                  )}
                >
                  {stockStatus} ({currentStock} {product.unit} Available)
                </Badge>
              </div>

              {/* Receipt Display Name Box */}
              <div className="p-3.5 bg-white border border-indigo-200 rounded-xl shadow-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-700 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                    Receipt / Invoice Display Title
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Customer Facing
                  </span>
                </div>
                <p className="text-lg font-black text-slate-900 tracking-tight">
                  {product.displayName || product.name}
                </p>
                <p className="text-[11px] text-slate-500">
                  {product.displayName && product.displayName !== product.name
                    ? `Configured custom name printed on live invoices & receipts. (Internal: "${product.name}")`
                    : `Currently using default product name on customer receipts.`}
                </p>
              </div>
            </div>

            {/* Quick Restock Card */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-slate-700">
                  Quick Stock Update
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Current: {currentStock}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Set quantity..."
                  value={stockAdjustment}
                  onChange={(e) => setStockAdjustment(e.target.value)}
                  className="h-9 text-xs border-slate-200 rounded-lg"
                />
                <Button
                  size="sm"
                  onClick={handleStockUpdate}
                  disabled={isAdjustingStock || !stockAdjustment}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 px-3 rounded-lg shrink-0"
                >
                  Save
                </Button>
              </div>
              <p className="text-[10px] text-slate-400">
                Alert triggered if stock drops below {threshold} {product.unit}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive Key Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Units Sold */}
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Total Volume Sold
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatVolume(totalVolumeSold)}{" "}
              <span className="text-xs font-bold text-slate-400">
                {product.unit}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Across all confirmed customer orders
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Total Revenue Generated */}
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Gross Revenue
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <TakaIcon className="w-4 h-4 text-sm" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 tracking-tight">
              ৳{totalGrossRevenue.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Total sales turnover from this SKU
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Total Net Profit */}
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Net Profit
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-indigo-700 tracking-tight">
              ${totalNetProfit.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Margin:{" "}
              <span className="font-bold text-slate-700">
                {profitMarginPercent}%
              </span>{" "}
              per unit
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Warehouse Stock Value */}
        <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Stock Valuation
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              ${stockRetailValue.toLocaleString()}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Cost Basis: ${stockCostValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Specifications & "Which Customer Has More Buy" */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Specifications & Supplier Details */}
        <div className="space-y-6">
          {/* Card: Specifications */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Pricing & Specs
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Unit procurement and retail values
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateToEdit(productId!)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 p-0 h-auto"
              >
                Edit
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Wholesale Buy Price / {product.unit}
                </span>
                <span className="text-sm font-bold text-slate-800">
                  ৳{product.buyPrice.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Standard Sell Price / {product.unit}
                </span>
                <span className="text-sm font-bold text-indigo-700">
                  ৳{product.sellPrice.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Gross Profit / {product.unit}
                </span>
                <span
                  className={`text-sm font-bold ${unitProfit < 0 ? "text-rose-600" : "text-emerald-600"}`}
                >
                  {unitProfit < 0 ? "-৳" : "+৳"}
                  {Math.abs(unitProfit).toFixed(2)}
                </span>
              </div>
              {isMultiPieceUnit && (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">
                      Buy Price / Piece
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      ৳
                      {pieceBuyPrice.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">
                      Sell Price / Piece
                    </span>
                    <span className="text-sm font-bold text-indigo-700">
                      ৳
                      {pieceSellPrice.toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">
                      Profit / Piece
                    </span>
                    <span
                      className={`text-sm font-bold ${pieceProfit < 0 ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      {pieceProfit < 0 ? "-৳" : "+৳"}
                      {Math.abs(pieceProfit).toLocaleString(undefined, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Profit Margin
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {profitMarginPercent}%
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Measurement Unit
                </span>
                <span className="text-sm font-bold text-slate-800 uppercase">
                  {product.unit}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100">
                <span className="text-xs text-slate-500 font-medium">
                  Safety Alert Threshold
                </span>
                <span className="text-sm font-bold text-slate-800">
                  {threshold} {product.unit}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-slate-500 font-medium">
                  Inventory Health
                </span>
                <span
                  className={cn(
                    "text-xs font-bold uppercase",
                    stockStatus === "In Stock" && "text-emerald-600",
                    stockStatus === "Low Stock" && "text-amber-600",
                    stockStatus === "Out of Stock" && "text-rose-600",
                  )}
                >
                  {stockStatus}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card: Supplier / Dealer Info */}
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-indigo-600" />
                <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Authorized Supplier
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {dealer ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">
                      {dealer.name}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">
                      Vendor ID: {dealer._id?.slice(-6) || dealer.id}
                    </span>
                  </div>
                  {dealer.contactInfo?.phone && (
                    <div className="text-xs text-slate-600 flex items-center justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-medium">
                        {dealer.contactInfo.phone}
                      </span>
                    </div>
                  )}
                  {dealer.contactInfo?.email && (
                    <div className="text-xs text-slate-600 flex items-center justify-between">
                      <span className="text-slate-400">Email:</span>
                      <span className="font-medium">
                        {dealer.contactInfo.email}
                      </span>
                    </div>
                  )}
                  {dealer.address && (
                    <div className="text-xs text-slate-600 pt-1 border-t border-slate-100">
                      <span className="text-slate-400 block mb-0.5">
                        Warehouse Address:
                      </span>
                      <span className="font-medium text-slate-700">
                        {dealer.address}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No specific dealer assigned to this SKU.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-slate-50/70 border-b border-slate-100 py-4 px-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Dealer Receipt Images
                  </CardTitle>
                </div>
                {onNavigateToReceipts && (
                  <Button
                    variant="ghost"
                    className="h-8 text-[11px] font-bold text-indigo-700"
                    onClick={() => onNavigateToReceipts(productId!)}
                  >
                    View All ({receipts.length})
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {receipts.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                  {receipts.slice(0, 6).map((receipt) => (
                    <button
                      key={receipt.id}
                      type="button"
                      onClick={() => onNavigateToReceipts?.(productId!)}
                      className="aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={receipt.imageData}
                        alt={receipt.note || "Dealer receipt"}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  No dealer receipts saved yet. Add one after each purchase.
                </p>
              )}
              <DealerReceiptUploader
                productId={productId || undefined}
                productName={product.name}
                dealerId={product.dealerId}
                dealerName={dealer?.name}
                onSaved={loadReceipts}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column (2 cols): "WHICH CUSTOMER HAS MORE BUY" Leaderboard */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                    <Crown className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                      Customer Purchase Leaderboard
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {buyerOrder === "most" ? "Most Bought" : "Least Bought"}
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Customers ranked by{" "}
                      {buyerOrder === "most" ? "highest" : "lowest"} volume of{" "}
                      {product.name}.
                    </CardDescription>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select
                    value={intelligenceRange}
                    onValueChange={(range) => {
                      setIntelligenceRange(range);
                      setLeaderboardPage(1);
                      setTxPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 w-36 bg-white text-xs font-semibold">
                      <Calendar className="mr-2 h-3.5 w-3.5 text-slate-400" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All time</SelectItem>
                      <SelectItem value="day">Today</SelectItem>
                      <SelectItem value="week">This week</SelectItem>
                      <SelectItem value="month">This month</SelectItem>
                      <SelectItem value="year">This year</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant={buyerOrder === "most" ? "default" : "ghost"}
                      onClick={() => {
                        setBuyerOrder("most");
                        setLeaderboardPage(1);
                      }}
                      className="h-8 px-3 text-[10px] font-bold uppercase"
                    >
                      Most
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={buyerOrder === "least" ? "default" : "ghost"}
                      onClick={() => {
                        setBuyerOrder("least");
                        setLeaderboardPage(1);
                      }}
                      className="h-8 px-3 text-[10px] font-bold uppercase"
                    >
                      Least
                    </Button>
                  </div>
                  <span className="w-full text-right text-[10px] text-slate-400 font-medium sm:w-auto">
                    {intelligence?.buyerMeta?.total || 0} customer accounts
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/60 border-b border-slate-100">
                      <TableHead className="px-6 py-3.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Rank & Customer
                      </TableHead>
                      <TableHead className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Units Bought
                      </TableHead>
                      <TableHead className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Total Spent
                      </TableHead>
                      <TableHead className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Net Profit
                      </TableHead>
                      <TableHead className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Share of Sales
                      </TableHead>
                      <TableHead className="px-6 py-3.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Last Purchase
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {intelligenceLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-28 text-center text-slate-400 text-xs"
                        >
                          <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" />
                          Loading filtered buyer data...
                        </TableCell>
                      </TableRow>
                    ) : paginatedRankings.length > 0 ? (
                      paginatedRankings.map((c, idx) => {
                        const index =
                          (leaderboardPage - 1) * leaderboardPageSize + idx;
                        const share =
                          totalVolumeSold > 0
                            ? (
                                (c.totalSpent / totalGrossRevenue) *
                                100
                              ).toFixed(1)
                            : "0";

                        return (
                          <TableRow
                            key={c.customerId}
                            className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-none"
                          >
                            {/* Rank and Customer Name */}
                            <TableCell className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0">
                                  {index === 0 ? (
                                    <span
                                      className="bg-amber-100 text-amber-800 w-6 h-6 rounded-full flex items-center justify-center"
                                      title="#1 Top Buyer"
                                    >
                                      🥇
                                    </span>
                                  ) : index === 1 ? (
                                    <span
                                      className="bg-slate-100 text-slate-700 w-6 h-6 rounded-full flex items-center justify-center"
                                      title="#2 Buyer"
                                    >
                                      🥈
                                    </span>
                                  ) : index === 2 ? (
                                    <span
                                      className="bg-amber-50 text-amber-900 w-6 h-6 rounded-full flex items-center justify-center"
                                      title="#3 Buyer"
                                    >
                                      🥉
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-bold">
                                      #{index + 1}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                    {c.customerId &&
                                    c.customerId !== "walk-in" &&
                                    onNavigateToCustomer ? (
                                      <button
                                        onClick={() =>
                                          onNavigateToCustomer(c.customerId)
                                        }
                                        className="text-left font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                                        title="View Customer Profile"
                                      >
                                        {c.name}
                                        <ExternalLink className="w-3 h-3 text-indigo-400" />
                                      </button>
                                    ) : (
                                      <span>{c.name}</span>
                                    )}
                                    {index === 0 && (
                                      <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded uppercase tracking-wider">
                                        {buyerOrder === "most"
                                          ? "Top Buyer"
                                          : "Lowest Buyer"}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-medium">
                                    {c.orderCount} transaction
                                    {c.orderCount > 1 ? "s" : ""}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            {/* Units Bought */}
                            <TableCell className="px-6 py-4 text-right">
                              <span className="font-black text-slate-900 text-sm">
                                {Object.entries(c.quantitiesByUnit)
                                  .map(
                                    ([unit, quantity]) =>
                                      `${quantity.toLocaleString()} ${unit}`,
                                  )
                                  .join(" + ")}
                              </span>
                            </TableCell>

                            {/* Total Spent */}
                            <TableCell className="px-6 py-4 text-right">
                              <span className="font-black text-slate-900 text-xs">
                                ৳{c.totalSpent.toLocaleString()}
                              </span>
                            </TableCell>

                            {/* Net Profit */}
                            <TableCell className="px-6 py-4 text-right">
                              <span className="font-black text-emerald-600 text-xs">
                                {c.totalProfit < 0 ? "-৳" : "+৳"}
                                {Math.abs(c.totalProfit).toLocaleString()}
                              </span>
                            </TableCell>

                            {/* Share of Sales */}
                            <TableCell className="px-6 py-4 text-right">
                              <span className="font-bold text-slate-700 text-xs">
                                {share}%
                              </span>
                            </TableCell>

                            {/* Last Purchase */}
                            <TableCell className="px-6 py-4 text-right">
                              <span className="text-xs text-slate-500">
                                {format(
                                  new Date(c.lastPurchaseDate),
                                  "MMM dd, yyyy",
                                )}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-44 text-center text-slate-400"
                        >
                          <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="text-xs font-bold uppercase tracking-wider">
                            No customer purchase history yet
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Make a sale using Quick Sell to see customer
                            distribution.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={leaderboardPage}
                totalPages={totalLeaderboardPages}
                onPageChange={setLeaderboardPage}
                totalItems={intelligence?.buyerMeta?.total || 0}
                pageSize={leaderboardPageSize}
                label="buyers"
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Sell Price History
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Sales prices in the selected period for{" "}
                    {product.displayName || product.name}
                  </CardDescription>
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-100">
                  {intelligence?.historyMeta?.total || 0} invoices
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[520px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50">
                    <TableRow className="bg-slate-50/90 border-b border-slate-100">
                      <TableHead className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase">
                        Date
                      </TableHead>
                      <TableHead className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">
                        Customer
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">
                        Sell Price
                      </TableHead>
                      <TableHead className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">
                        Qty
                      </TableHead>
                      <TableHead className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">
                        Receipt
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {intelligenceLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-28 text-center text-slate-400 text-xs"
                        >
                          <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                          Loading sale history...
                        </TableCell>
                      </TableRow>
                    ) : lastSalePrices.length > 0 ? (
                      lastSalePrices.map((sale, index) => {
                        const saleDate = new Date(sale.date);
                        return (
                          <TableRow
                            key={`${sale.orderId}-${index}`}
                            className="border-b border-slate-50 hover:bg-slate-50/70"
                          >
                            <TableCell className="px-5 py-3 text-xs text-slate-600 whitespace-nowrap">
                              {Number.isNaN(saleDate.getTime())
                                ? "N/A"
                                : format(saleDate, "MMM d, yyyy h:mm a")}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-xs font-semibold text-slate-700">
                              <span className="block max-w-40 truncate">
                                {sale.customerName}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                #{sale.orderId.slice(-8).toUpperCase()}
                              </span>
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right font-black text-indigo-700 text-xs whitespace-nowrap">
                              ৳
                              {Number(
                                sale.unitPrice || sale.price || 0,
                              ).toLocaleString()}{" "}
                              / {sale.unit}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right text-xs font-bold text-slate-700 whitespace-nowrap">
                              {Number(sale.quantity).toLocaleString()}{" "}
                              {sale.unit}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-indigo-600 hover:bg-indigo-50"
                                title="View full receipt"
                                aria-label={`View receipt ${sale.orderId}`}
                                onClick={() => {
                                  const order =
                                    sale.receipt ||
                                    sale.order ||
                                    intelligence?.history?.find(
                                      (entry: any) =>
                                        String(entry._id || entry.id) ===
                                        String(sale.orderId),
                                    );
                                  if (order && onViewOrderDetail) {
                                    onViewOrderDetail(order);
                                    return;
                                  }
                                  toast.error("Order details unavailable", {
                                    description:
                                      "This sale could not be opened in Order Detail.",
                                  });
                                }}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-32 text-center text-slate-400 text-xs"
                        >
                          No sales recorded for this product yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={txPage}
                totalPages={totalTxPages}
                onPageChange={setTxPage}
                totalItems={intelligence?.historyMeta?.total || 0}
                pageSize={txPageSize}
                label="sales"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
