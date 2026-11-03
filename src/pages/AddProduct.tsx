import { TakaIcon } from "../components/common/TakaIcon";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  Layers,
  Store,
  Receipt,
  Sparkles,
  Check,
  Search,
  CheckCircle2,
  Barcode,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { addProduct, fetchProducts } from "../store/slices/inventorySlice";
import { fetchDealers } from "../store/slices/dealerSlice";
import { SearchableDealerSelect } from "../components/common/SearchableDealerSelect";
import {
  DealerReceiptUploader,
  PendingDealerReceipt,
} from "../components/common/DealerReceiptUploader";
import { saveDealerReceipt } from "../utils/receiptStore";
import { CategorySelect } from "../components/common/CategorySelect";
import { apiService } from "../services/apiService";

interface AddProductProps {
  onBack: () => void;
  onCreated: (productId: string) => void;
}

export function AddProduct({ onBack, onCreated }: AddProductProps) {
  const dispatch = useAppDispatch();
  const { products } = useAppSelector((state) => state.inventory);
  const { dealers } = useAppSelector((state) => state.dealers);

  const [formData, setFormData] = useState({
    name: "",
    displayName: "",
    category: "",
    unit: "Unit",
    piecesPerUnit: "1",
    buyPrice: "",
    sellPrice: "",
    dealerId: "",
    initialStock: "0",
    lowStockThreshold: "15",
    sku: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [duplicateSearch, setDuplicateSearch] = useState("");
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);
  const [duplicateSearchError, setDuplicateSearchError] = useState("");
  const [pendingReceipts, setPendingReceipts] = useState<
    PendingDealerReceipt[]
  >([]);

  useEffect(() => {
    dispatch(fetchDealers({ page: 1, limit: 200, range: "all" }));
    if (products.length === 0) {
      dispatch(fetchProducts());
    }
  }, [dispatch, products.length]);

  useEffect(() => {
    const search = duplicateSearch.trim();
    if (!search) {
      setDuplicateMatches([]);
      setSearchingDuplicates(false);
      setDuplicateSearchError("");
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearchingDuplicates(true);
      setDuplicateSearchError("");
      try {
        const response = await apiService.getInventory(
          search,
          "all",
          "name",
          "asc",
          1,
          4,
          "all",
        );
        if (active) {
          setDuplicateMatches(Array.isArray(response?.data) ? response.data : []);
        }
      } catch (error: any) {
        if (active) {
          setDuplicateMatches([]);
          setDuplicateSearchError(
            error.response?.data?.message || "Product search failed",
          );
        }
      } finally {
        if (active) setSearchingDuplicates(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [duplicateSearch]);

  // Handle unit selection with smart pieces default
  const handleUnitChange = (val: string) => {
    let pieces = formData.piecesPerUnit;
    const lower = val.toLowerCase();
    if (lower === "dozen") {
      pieces = "12";
    } else if (
      ["box", "packed", "carton"].includes(lower) &&
      (!pieces || pieces === "1")
    ) {
      pieces = "10";
    }
    setFormData((prev) => ({ ...prev, unit: val, piecesPerUnit: pieces }));
  };

  // Auto-generate SKU when name changes if empty
  const generateSku = () => {
    const prefix = formData.name
      ? formData.name
          .slice(0, 3)
          .toUpperCase()
          .replace(/[^A-Z]/g, "PRD")
      : "SKU";
    const random = Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({ ...prev, sku: `SKU-${prefix}-${random}` }));
  };

  const unitTypes = [
    "Unit",
    "Dozen",
    "Packed",
    "Piece",
    "Box",
    "Kilogram",
    "Gram",
    "Liter",
    "Meter",
    "Carton",
  ];

  // Profit calculation preview
  const buyNum = parseFloat(formData.buyPrice) || 0;
  const sellNum = parseFloat(formData.sellPrice) || 0;
  const unitProfit = sellNum - buyNum;
  const marginPercent =
    sellNum > 0 ? ((unitProfit / sellNum) * 100).toFixed(1) : "0";
  const markupPercent =
    buyNum > 0 ? ((unitProfit / buyNum) * 100).toFixed(1) : "0";

  // Secondary Unit (Pieces) calculation
  const piecesCount = Math.max(1, parseInt(formData.piecesPerUnit) || 1);
  const isMultiPieceUnit =
    ["dozen", "box", "packed", "carton"].includes(
      formData.unit.toLowerCase(),
    ) || piecesCount > 1;
  const pieceBuyPrice = buyNum / piecesCount;
  const pieceSellPrice = sellNum / piecesCount;
  const pieceProfit = unitProfit / piecesCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Product Name is required");
      return;
    }
    if (!formData.buyPrice || buyNum < 0) {
      toast.error("Valid Buy Price is required");
      return;
    }
    if (!formData.sellPrice || sellNum < 0) {
      toast.error("Valid Sell Price is required");
      return;
    }
    if (!formData.dealerId) {
      toast.error("Please select an Authorized Dealer / Supplier");
      return;
    }

    setSubmitting(true);
    try {
      const generatedSku =
        formData.sku.trim() ||
        `SKU-${(formData.name.slice(0, 3) || "ITM").toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const created = await dispatch(
        addProduct({
          name: formData.name.trim(),
          displayName: formData.displayName.trim() || formData.name.trim(),
          category: formData.category.trim() || "General",
          unit: formData.unit,
          piecesPerUnit: piecesCount,
          buyPrice: buyNum,
          sellPrice: sellNum,
          quantity: parseInt(formData.initialStock) || 0,
          lowStockThreshold: parseInt(formData.lowStockThreshold) || 15,
          dealerId: formData.dealerId,
          sku: generatedSku,
        }),
      ).unwrap();

      toast.success("Product Created Successfully", {
        description: `${formData.name} is now available in your catalog.`,
      });

      const newId = created._id || created.id;
      const selectedDealer = dealers.find(
        (dealer) => String(dealer._id || dealer.id) === String(formData.dealerId),
      );
      if (newId && pendingReceipts.length > 0) {
        await Promise.all(
          pendingReceipts.map((receipt) =>
            saveDealerReceipt({
              productId: newId,
              productName: formData.name.trim(),
              dealerId: formData.dealerId,
              dealerName: selectedDealer?.name || "",
              note: receipt.note,
              imageData: receipt.imageData,
              createdAt: receipt.createdAt,
            }),
          ),
        );
      }
      if (newId) {
        onCreated(newId);
      } else {
        onBack();
      }
    } catch (err: any) {
      toast.error("Failed to add product", {
        description: err.message || "An unexpected error occurred.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto pb-24">
      {/* Top Header with Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={onBack}
            className="rounded-xl h-10 w-10 border-slate-200 text-slate-600 hover:bg-slate-100 shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Add New Product
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Create a new SKU in your warehouse catalog with pricing, supplier,
              and initial stock.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            onClick={onBack}
            className="text-slate-500 hover:text-slate-900 text-xs font-bold uppercase tracking-wider"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 h-10 rounded-xl shadow-md shadow-indigo-100 gap-2"
          >
            {submitting ? "Saving Product..." : "Save & Publish Product"}
          </Button>
        </div>
      </div>

      {/* Quick Duplicate Search Bar */}
      <div className="bg-slate-100/70 border border-slate-200 rounded-2xl p-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            placeholder="Quick duplicate check: Search existing product names or SKUs..."
            value={duplicateSearch}
            onChange={(e) => setDuplicateSearch(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none"
          />
          {duplicateSearch && (
            <button
              onClick={() => setDuplicateSearch("")}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold px-1"
            >
              ✕
            </button>
          )}
        </div>
        {searchingDuplicates && (
          <p className="mt-2 px-1 text-[10px] text-slate-500">Searching products on server...</p>
        )}
        {duplicateSearchError && (
          <p className="mt-2 px-1 text-[10px] text-rose-600">{duplicateSearchError}</p>
        )}
        {duplicateSearch.trim() && !searchingDuplicates && !duplicateSearchError && duplicateMatches.length === 0 && (
          <p className="mt-2 px-1 text-[10px] text-slate-500">No matching products found.</p>
        )}
        {duplicateMatches.length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-200 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Similar Existing Items Found:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {duplicateMatches.map((m) => (
                <div
                  key={m._id || m.id}
                  className="text-xs bg-white p-2 rounded-lg border border-slate-200 flex justify-between items-center"
                >
                  <div>
                    <span className="font-bold text-slate-800">{m.name}</span>
                    {m.displayName && (
                      <span className="text-slate-500 text-[10px] ml-1.5">
                        ({m.displayName})
                      </span>
                    )}
                  </div>
                  <span className="text-indigo-600 font-bold">
                    ${m.sellPrice}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Product Identification */}
        <Card className="relative z-20 border-slate-200 shadow-sm rounded-2xl overflow-visible bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Product Identification
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Set the product's internal name and the customer-facing receipt
              display name.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Internal Product Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center justify-between">
                  <span>
                    Product Name (Internal){" "}
                    <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] font-normal text-slate-400">
                    Used for inventory, search & reports
                  </span>
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g. UltraWide Gaming Monitor 34-Inch Curved"
                  className="h-11 border-slate-200 bg-white focus:border-indigo-500 rounded-xl text-sm"
                  required
                />
              </div>

              {/* Receipt Display Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                    Receipt Display Name
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Shows on Invoice / Receipt
                  </span>
                </label>
                <Input
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData({ ...formData, displayName: e.target.value })
                  }
                  placeholder='e.g. UltraWide 34" Curved (Leave empty to use Name)'
                  className="h-11 border-indigo-200 bg-indigo-50/20 focus:bg-white focus:border-indigo-500 rounded-xl text-sm font-medium"
                />
                <p className="text-[11px] text-slate-500">
                  This custom title will appear on printed sales receipts and
                  live customer invoices.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 pt-2">
              {/* Category */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Category
                </label>
                <CategorySelect
                  value={formData.category}
                  onChange={(category) =>
                    setFormData((previous) => ({ ...previous, category }))
                  }
                  placeholder="Search or add a category..."
                  className="h-11 rounded-xl border-slate-200 bg-white text-sm"
                />
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Unit of Measurement
                </label>
                <Select value={formData.unit} onValueChange={handleUnitChange}>
                  <SelectTrigger className="h-11 border-slate-200 bg-white rounded-xl text-sm">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {unitTypes.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* SKU */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5 text-slate-500" />
                    SKU / Barcode
                  </label>
                  <button
                    type="button"
                    onClick={generateSku}
                    className="text-[10px] text-indigo-600 font-bold hover:underline"
                  >
                    Auto-Gen
                  </button>
                </div>
                <Input
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="e.g. SKU-MON-3401"
                  className="h-11 border-slate-200 bg-white rounded-xl font-mono text-sm uppercase"
                />
              </div>
            </div>

            {/* If Box, Packed, Dozen, Carton: Pieces per Unit Field */}
            {isMultiPieceUnit && (
              <div className="mt-4 p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="text-xs font-bold text-indigo-950 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    Pieces per {formData.unit} (প্রতি {formData.unit}-এ কয়টা পিস
                    আছে)
                  </label>
                  <span className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.5 rounded-full w-fit">
                    Sell by Piece + Bulk
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative w-44">
                    <Input
                      type="number"
                      min="1"
                      value={formData.piecesPerUnit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          piecesPerUnit: e.target.value,
                        })
                      }
                      placeholder="10"
                      className="h-10 bg-white border-indigo-300 font-black text-indigo-950 text-base rounded-xl"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 uppercase">
                      Pieces
                    </span>
                  </div>
                  <p className="text-xs text-indigo-800">
                    When selling, you can sell in full{" "}
                    <strong>{formData.unit}</strong> or individual{" "}
                    <strong>Pieces (পিস)</strong> with auto-calculated piece
                    prices.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Supplier Information */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Supplier & Dealer Assignment
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Assign the authorized wholesale dealer or vendor for restocking.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Authorized Supplier / Dealer{" "}
                <span className="text-rose-500">*</span>
              </label>
              <SearchableDealerSelect
                value={formData.dealerId}
                onChange={(dealerId) =>
                  setFormData({ ...formData, dealerId })
                }
                placeholder="Search or select a dealer..."
                required
              />
            </div>
            <DealerReceiptUploader
              dealerId={formData.dealerId}
              dealerName={
                dealers.find(
                  (dealer) =>
                    String(dealer._id || dealer.id) === String(formData.dealerId),
                )?.name
              }
              pendingReceipts={pendingReceipts}
              onPendingChange={setPendingReceipts}
            />
          </CardContent>
        </Card>

        {/* Section 3: Pricing & Real-time Profit Preview */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
            <div className="flex items-center gap-2">
              <TakaIcon className="w-5 h-5 text-emerald-600 text-lg" />
              <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Pricing & Profit Margin
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Specify your wholesale procurement cost and standard selling
              price.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Buy Price */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Buy / Cost Price (৳) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <TakaIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 text-sm" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.buyPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, buyPrice: e.target.value })
                    }
                    placeholder="0.00"
                    className="pl-9 h-11 border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-800"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Unit procurement cost paid to supplier.
                </p>
              </div>

              {/* Sell Price */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-indigo-900 uppercase tracking-wide">
                  Sell / Retail Price (৳){" "}
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <TakaIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-600 text-sm" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.sellPrice}
                    onChange={(e) =>
                      setFormData({ ...formData, sellPrice: e.target.value })
                    }
                    placeholder="0.00"
                    className="pl-9 h-11 border-indigo-200 bg-indigo-50/20 focus:bg-white focus:border-indigo-500 rounded-xl text-sm font-bold text-indigo-700"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Standard sales catalog price charged to customers.
                </p>
              </div>
            </div>

            {/* Profit Margin Preview Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                Live Margin & Profitability Metrics
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Unit Profit
                  </span>
                  <span
                    className={`text-lg font-black ${unitProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                  >
                    ${unitProfit.toFixed(2)}
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Profit Margin
                  </span>
                  <span
                    className={`text-lg font-black ${parseFloat(marginPercent) >= 0 ? "text-indigo-600" : "text-rose-600"}`}
                  >
                    {marginPercent}%
                  </span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Markup
                  </span>
                  <span
                    className={`text-lg font-black ${parseFloat(markupPercent) >= 0 ? "text-slate-800" : "text-rose-600"}`}
                  >
                    {markupPercent}%
                  </span>
                </div>
              </div>

              {/* Auto Calculated Piece Price */}
              {piecesCount > 1 && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Auto-Calculated Piece (পিস) Selling & Cost Price
                    </span>
                    <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      1 {formData.unit} = {piecesCount} Pieces
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-indigo-200 shadow-sm">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Piece Sell Price
                      </span>
                      <span className="text-base font-black text-indigo-700">
                        ৳{pieceSellPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Piece Buy Cost
                      </span>
                      <span className="text-base font-black text-slate-700">
                        ৳{pieceBuyPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Piece Profit
                      </span>
                      <span
                        className={`text-base font-black ${pieceProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        +৳{pieceProfit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Stock & Inventory Management */}
        <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/60 border-b border-slate-100 py-4 px-6">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Inventory & Stock Management
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Set initial stock on hand and automatic low-stock threshold
              warning.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Initial Stock */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Initial Stock Quantity
                </label>
                <div className="relative">
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    min="0"
                    value={formData.initialStock}
                    onChange={(e) =>
                      setFormData({ ...formData, initialStock: e.target.value })
                    }
                    placeholder="0"
                    className="pl-9 h-11 border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-800"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Total units immediately available in warehouse.
                </p>
              </div>

              {/* Low Stock Alert Threshold */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  Low Stock Alert Threshold
                </label>
                <div className="relative">
                  <AlertTriangle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                  <Input
                    type="number"
                    min="1"
                    value={formData.lowStockThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        lowStockThreshold: e.target.value,
                      })
                    }
                    placeholder="15"
                    className="pl-9 h-11 border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-800"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Trigger low-stock alerts when inventory dips below this count.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bottom Action Footer */}
        <div className="flex items-center justify-between pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl h-11 px-6 text-xs font-bold uppercase tracking-wider"
          >
            ← Back to Inventory
          </Button>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-8 h-11 rounded-xl shadow-lg shadow-indigo-100 gap-2"
          >
            {submitting ? "Publishing SKU..." : "Save & Publish Product"}
          </Button>
        </div>
      </form>
    </div>
  );
}
