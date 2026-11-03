import { TakaIcon } from "../components/common/TakaIcon";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreVertical,
  Package,
  ArrowUpDown,
  Check,
  X,
  Layers,
  ChevronLeft,
  ChevronRight,
  Copy,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  AlertTriangle,
  Eye,
  FileJson,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  Archive,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Pagination } from "../components/common/Pagination";
import { DateRangeSelect } from "../components/common/DateRangeSelect";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import { Separator } from "../components/ui/separator";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchInventory,
  addProduct,
  updateStock as updateStockThunk,
  updateProduct as updateProductThunk,
  deleteProductThunk,
  restoreProductThunk,
} from "../store/slices/inventorySlice";
import { fetchDealers } from "../store/slices/dealerSlice";
import { SearchableDealerSelect } from "../components/common/SearchableDealerSelect";
import { DealerReceiptUploader } from "../components/common/DealerReceiptUploader";
import { CategorySelect } from "../components/common/CategorySelect";

interface InventoryProps {
  onNavigateToProductAnalytics?: (productId: string) => void;
  onNavigateToAddProduct?: () => void;
  onNavigateToEditProduct?: (productId: string) => void;
  onNavigateToProductDetails?: (productId: string) => void;
}

export function Inventory({
  onNavigateToProductAnalytics,
  onNavigateToAddProduct,
  onNavigateToEditProduct,
  onNavigateToProductDetails,
}: InventoryProps) {
  const dispatch = useAppDispatch();
  const { products, loading, meta, error } = useAppSelector(
    (state) => state.inventory,
  );
  const { dealers } = useAppSelector((state) => state.dealers);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [range, setRange] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("");
  const pageSize = 10;

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [isEditStockOpen, setIsEditStockOpen] = useState(false);
  const [isEditPriceOpen, setIsEditPriceOpen] = useState(false);
  const [isEditThresholdOpen, setIsEditThresholdOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newThreshold, setNewThreshold] = useState("");
  const [newProductData, setNewProductData] = useState({
    name: "",
    displayName: "",
    category: "",
    unit: "Unit",
    buyPrice: "",
    sellPrice: "",
    dealerId: "",
    initialStock: "0",
    lowStockThreshold: "15",
  });

  const unitTypes = [
    "Unit",
    "Dozen",
    "Packed",
    "Piece",
    "Box",
    "Kilogram",
    "Gram",
    "Liter",
  ];

  useEffect(() => {
    const timer = window.setTimeout(
      () => setDebouncedSearchTerm(searchTerm),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  // Update useEffect
  useEffect(() => {
    dispatch(
      fetchInventory({
        search: debouncedSearchTerm,
        status: statusFilter,
        sortBy,
        order,
        page,
        limit: pageSize,
        range,
        category: categoryFilter,
      }),
    );
    dispatch(fetchDealers({ page: 1, limit: 200, range: "all" }));
  }, [dispatch, debouncedSearchTerm, statusFilter, sortBy, order, page, range, categoryFilter]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter, sortBy, order, categoryFilter]);

  // Update handlers
  const handleAddProduct = async () => {
    if (
      !newProductData.name ||
      !newProductData.buyPrice ||
      !newProductData.sellPrice ||
      !newProductData.dealerId
    ) {
      toast.error("Missing Requirements", {
        description:
          "Name, Buy Price, Sell Price, and Dealer are mandatory fields.",
      });
      return;
    }

    try {
      await dispatch(
        addProduct({
          name: newProductData.name,
          displayName: newProductData.displayName,
          category: newProductData.category || "General",
          unit: newProductData.unit,
          buyPrice: parseFloat(newProductData.buyPrice),
          sellPrice: parseFloat(newProductData.sellPrice),
          quantity: parseInt(newProductData.initialStock) || 0,
          lowStockThreshold: parseInt(newProductData.lowStockThreshold) || 15,
          dealerId: newProductData.dealerId,
        }),
      ).unwrap();
      toast.success("Product added successfully");
    } catch (err: any) {
      toast.error("Failed to add product", { description: err.message });
    }

    setIsAddProductOpen(false);
    setNewProductData({
      name: "",
      displayName: "",
      category: "",
      unit: "Unit",
      buyPrice: "",
      sellPrice: "",
      dealerId: "",
      initialStock: "0",
      lowStockThreshold: "15",
    });
  };

  const handleEditProduct = async () => {
    if (!selectedItem) return;

    // Find original product to fallback if fields were cleared in the UI
    const original = products.find(
      (p) => (p._id || p.id) === (selectedItem._id || selectedItem.id),
    );

    // Core requirements fallback to original if cleared
    const name = selectedItem.name?.trim() || original?.name;
    const displayName =
      selectedItem.displayName?.trim() || original?.displayName;
    const dealerId = selectedItem.dealerId || original?.dealerId;
    const buyPrice = selectedItem.buyPrice
      ? parseFloat(selectedItem.buyPrice)
      : original?.buyPrice;
    const sellPrice = selectedItem.sellPrice
      ? parseFloat(selectedItem.sellPrice)
      : original?.sellPrice;

    if (!name || !dealerId) {
      toast.error("Missing Requirements", {
        description: "Name and Dealer are mandatory fields.",
      });
      return;
    }

    try {
      await dispatch(
        updateProductThunk({
          id: selectedItem._id || selectedItem.id,
          productData: {
            name,
            displayName,
            category: selectedItem.category || original?.category || "General",
            unit: selectedItem.unit || original?.unit || "Unit",
            dealerId,
            buyPrice: buyPrice || 0,
            sellPrice: sellPrice || 0,
          },
        }),
      ).unwrap();
      toast.success("Product updated successfully");
      setIsEditProductOpen(false);
      setSelectedItem(null);
    } catch (err: any) {
      toast.error("Failed to update product", { description: err.message });
    }
  };

  const handleUpdateStock = async () => {
    if (!selectedItem || newQuantity === "") return;
    try {
      await dispatch(
        updateStockThunk({
          id: selectedItem._id || selectedItem.id,
          quantity: parseInt(newQuantity),
        }),
      ).unwrap();
      toast.success("Stock updated successfully");
    } catch (err: any) {
      toast.error("Failed to update stock", { description: err.message });
    }
    setIsEditStockOpen(false);
    setSelectedItem(null);
    setNewQuantity("");
  };

  const handleUpdatePrice = async () => {
    if (!selectedItem || newPrice === "") return;
    try {
      await dispatch(
        updateProductThunk({
          id: selectedItem._id || selectedItem.id,
          productData: { sellPrice: parseFloat(newPrice) },
        }),
      ).unwrap();
      toast.success("Price updated successfully");
    } catch (err: any) {
      toast.error("Failed to update price", { description: err.message });
    }
    setIsEditPriceOpen(false);
    setSelectedItem(null);
    setNewPrice("");
  };

  const handleUpdateThreshold = async () => {
    if (!selectedItem || newThreshold === "") return;
    try {
      await dispatch(
        updateProductThunk({
          id: selectedItem._id || selectedItem.id,
          productData: { lowStockThreshold: parseInt(newThreshold) },
        }),
      ).unwrap();
      toast.success("Threshold updated successfully");
    } catch (err: any) {
      toast.error("Failed to update threshold", { description: err.message });
    }
    setIsEditThresholdOpen(false);
    setSelectedItem(null);
    setNewThreshold("");
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to archive ${name}? It will be moved to Deleted Inventory.`,
      )
    ) {
      try {
        await dispatch(deleteProductThunk(id)).unwrap();
        toast.success("Product Archived", {
          description: `${name} removed from active catalog.`,
        });
      } catch (err: any) {
        toast.error("Failed to archive product", { description: err.message });
      }
    }
  };

  const handleRestoreProduct = async (id: string, name: string) => {
    try {
      await dispatch(restoreProductThunk(id)).unwrap();
      toast.success("Product Restored", {
        description: `${name} returned to active catalog.`,
      });
    } catch (err: any) {
      toast.error("Failed to restore product", { description: err.message });
    }
  };

  const exportInventoryToJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(products, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "inventory_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("Inventory JSON Export Initialized");
  };

  const exportInventoryToCsv = () => {
    const headers = [
      "SKU",
      "Name",
      "Category",
      "Unit",
      "Buy Price",
      "Sell Price",
      "Quantity",
    ];
    const rows = products.map((p) => [
      p.sku || p._id || p.id,
      p.name,
      p.category,
      p.unit,
      p.buyPrice,
      p.sellPrice,
      p.quantity,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "inventory_export.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("Inventory CSV Export Initialized");
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard", {
      description: "Product ID has been duplicated.",
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800 uppercase italic">
            Inventory & Stock
          </h2>
          <p className="text-[10px] md:text-sm text-slate-500 font-medium">
            Comprehensive view of your wholesale product holdings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={exportInventoryToCsv}
            className="flex-1 md:flex-none gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 uppercase font-black text-[10px] tracking-widest px-4 h-10 italic"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={exportInventoryToJson}
            className="flex-1 md:flex-none gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 uppercase font-black text-[10px] tracking-widest px-4 h-10 italic"
          >
            <FileJson className="w-3.5 h-3.5" />
            JSON
          </Button>
          <Button
            onClick={() => {
              if (onNavigateToAddProduct) {
                onNavigateToAddProduct();
              } else {
                setIsAddProductOpen(true);
              }
            }}
            className="w-full md:w-auto shrink-0 gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-md shadow-indigo-100"
          >
            <Plus className="w-4 h-4" />
            Add New Product
          </Button>
        </div>
      </div>

      <Card className="relative border-slate-200 shadow-sm rounded-xl overflow-visible">
        <CardHeader className="bg-white border-b border-slate-100 p-4 md:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-slate-800 text-base md:text-lg font-black uppercase italic">
                Product Catalog
              </CardTitle>
              <CardDescription className="text-[10px] md:text-sm text-slate-500 font-medium italic">
                Manage stock levels and dealer relationships.
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search Name, Display Name, SKU..."
                  className="pl-9 pr-8 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl text-xs md:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
              <DateRangeSelect
                value={range}
                onChange={(nextRange) => {
                  setRange(nextRange);
                  setPage(1);
                }}
                className="h-10 w-full sm:w-36 bg-white"
              />
              <div className="relative z-30 w-full sm:w-48">
                <CategorySelect
                  value={categoryFilter}
                  onChange={(category) => {
                    setCategoryFilter(category);
                    setPage(1);
                  }}
                  onQueryChange={() => {
                    setCategoryFilter("");
                    setPage(1);
                  }}
                  placeholder="Filter category..."
                  allowCreate={false}
                  className="h-10 bg-white text-xs"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="flex-1 sm:w-[130px] h-10 bg-white border-slate-200 rounded-xl text-[10px] md:text-xs">
                    <SelectValue placeholder="Stock Level" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">All Inventory</SelectItem>
                    <SelectItem value="in">In Stock</SelectItem>
                    <SelectItem value="low">Low Stock</SelectItem>
                    <SelectItem value="out">Out of Stock</SelectItem>
                    <SelectItem value="deleted">Deleted Inventory</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1 sm:w-[130px] h-10 bg-white border-slate-200 rounded-xl text-[10px] md:text-xs">
                    <SelectValue placeholder="Sort By" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="createdAt">Date Created</SelectItem>
                    <SelectItem value="name">Product Name</SelectItem>
                    <SelectItem value="quantity">Stock Level</SelectItem>
                    <SelectItem value="id">Product ID</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0 rounded-xl border-slate-200 text-slate-400"
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
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto scrollbar-hide">
            <Table className="min-w-[800px]">
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-100">
                  <TableHead className="w-[140px] px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest italic">
                    ID Code
                  </TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest italic">
                    Product Info
                  </TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest italic">
                    Category
                  </TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest italic text-right">
                    Unit Cost
                  </TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest italic text-right">
                    Current Stock
                  </TableHead>
                  <TableHead className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest italic">
                    Inventory Status
                  </TableHead>
                  <TableHead className="w-[80px] p-0"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-60 text-center text-slate-400 italic"
                    >
                      Synchronizing with blockchain database...
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-48 text-center text-rose-600">
                      Inventory search failed: {error}
                    </TableCell>
                  </TableRow>
                ) : products.length > 0 ? (
                  products.map((item) => {
                    const threshold = item.lowStockThreshold || 15;
                    const status =
                      item.quantity === 0
                        ? "Out of Stock"
                        : item.quantity < threshold
                          ? "Low Stock"
                          : "In Stock";
                    return (
                      <TableRow
                        key={item._id || item.id}
                        className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50"
                      >
                        <TableCell className="px-6 py-4">
                          <Button
                            variant="ghost"
                            className="p-0 h-auto font-mono text-[10px] text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1.5"
                            onClick={() => copyToClipboard(item._id || item.id)}
                          >
                            #
                            {(item._id || item.id)
                              ?.toString()
                              .slice(-8)
                              .toUpperCase() || "N/A"}
                            <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Button>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <button
                            onClick={() => {
                              const pId = item._id || item.id;
                              if (onNavigateToProductDetails) {
                                onNavigateToProductDetails(pId);
                              } else if (onNavigateToProductAnalytics) {
                                onNavigateToProductAnalytics(pId);
                              }
                            }}
                            className="text-left group/item cursor-pointer"
                          >
                            <div className="font-bold text-slate-800 text-sm group-hover/item:text-indigo-600 transition-colors">
                              {item.name}
                            </div>
                            {item.displayName &&
                              item.displayName !== item.name && (
                                <div className="text-[11px] text-slate-400 font-medium">
                                  Receipt:{" "}
                                  <span className="text-slate-600 font-semibold">
                                    {item.displayName}
                                  </span>
                                </div>
                              )}
                          </button>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1 py-0.5 rounded font-black uppercase tracking-tighter italic">
                              Unit
                            </span>
                            <span className="text-[10px] text-slate-600 font-bold uppercase">
                              {item.unit}
                            </span>
                            {item.sku && (
                              <span className="text-[10px] font-mono text-slate-400 ml-1">
                                · {item.sku}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-600 font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-tighter"
                          >
                            {item.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <span className="text-sm font-black text-slate-700">
                            ${(item.buyPrice || 0).toLocaleString()}
                          </span>
                          <span className="block text-[10px] text-indigo-600 font-bold">
                            Sell: ${(item.sellPrice || 0).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div
                            className={cn(
                              "font-mono text-base font-black italic",
                              status === "Low Stock" && "text-amber-600",
                              status === "Out of Stock" && "text-rose-600",
                              status === "In Stock" && "text-slate-900",
                            )}
                          >
                            {item.quantity}
                          </div>
                          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter italic leading-none">
                            Net Volume
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Badge
                              className={cn(
                                "font-black text-[10px] uppercase tracking-widest px-2 py-1 rounded shadow-none italic",
                                status === "Low Stock" &&
                                  "bg-amber-100 text-amber-700",
                                status === "Out of Stock" &&
                                  "bg-rose-100 text-rose-700",
                                status === "In Stock" &&
                                  "bg-emerald-100 text-emerald-700",
                              )}
                            >
                              {status}
                            </Badge>
                            {status === "Low Stock" && (
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-slate-900 transition-all"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent
                              align="end"
                              className="w-52 bg-white border-slate-200"
                            >
                              <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-3 py-2 italic font-serif">
                                  Action Matrix
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 px-3 py-2 text-[10px] font-black uppercase text-indigo-700 bg-indigo-50/40 hover:bg-indigo-50 cursor-pointer tracking-wider"
                                  onClick={() => {
                                    const pId = item._id || item.id;
                                    if (onNavigateToProductDetails) {
                                      onNavigateToProductDetails(pId);
                                    } else if (onNavigateToProductAnalytics) {
                                      onNavigateToProductAnalytics(pId);
                                    }
                                  }}
                                >
                                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                                  Product Details & Top Buyers
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 cursor-pointer tracking-widest italic"
                                  onClick={() => {
                                    const pId = item._id || item.id;
                                    if (onNavigateToEditProduct) {
                                      onNavigateToEditProduct(pId);
                                    } else {
                                      setSelectedItem({ ...item });
                                      setIsEditProductOpen(true);
                                    }
                                  }}
                                >
                                  <Plus className="w-3.5 h-3.5 text-blue-500" />
                                  Edit All Fields
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 cursor-pointer tracking-widest italic"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setNewQuantity(item.quantity.toString());
                                    setIsEditStockOpen(true);
                                  }}
                                >
                                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
                                  Adjust Inventory
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 cursor-pointer tracking-widest italic"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setNewPrice(item.sellPrice.toString());
                                    setIsEditPriceOpen(true);
                                  }}
                                >
                                  <TakaIcon className="w-3.5 h-3.5 text-emerald-500 text-xs" />
                                  Market Pricing
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 cursor-pointer tracking-widest italic"
                                  onClick={() => {
                                    setSelectedItem(item);
                                    setNewThreshold(
                                      (item.lowStockThreshold || 15).toString(),
                                    );
                                    setIsEditThresholdOpen(true);
                                  }}
                                >
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                  Safety Threshold
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 cursor-pointer tracking-widest italic"
                                  onClick={() => {
                                    if (onNavigateToProductAnalytics) {
                                      onNavigateToProductAnalytics(
                                        item._id || item.id,
                                      );
                                    }
                                  }}
                                >
                                  <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                  Core Analytics
                                </DropdownMenuItem>
                                <DropdownMenuItem className="gap-2 px-3 py-2 text-[10px] font-black uppercase text-slate-700 cursor-pointer tracking-widest italic">
                                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                                  Audit Trail
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {statusFilter === "deleted" ? (
                                  <DropdownMenuItem
                                    className="gap-2 px-3 py-2 text-[10px] font-black uppercase text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50 cursor-pointer tracking-widest italic"
                                    onClick={() =>
                                      handleRestoreProduct(
                                        item._id || item.id,
                                        item.name,
                                      )
                                    }
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Restore SKU
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    className="gap-2 px-3 py-2 text-[10px] font-black uppercase text-rose-500 focus:text-rose-600 focus:bg-rose-50 cursor-pointer tracking-widest italic"
                                    onClick={() =>
                                      handleDeleteProduct(
                                        item._id || item.id,
                                        item.name,
                                      )
                                    }
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Archive Product
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-48 text-center text-slate-400 italic font-medium"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Package className="w-10 h-10 text-slate-200" />
                        <span>
                          No product sequences found in current sector
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {meta && meta.total > 0 && (
            <Pagination
              currentPage={page}
              totalPages={Math.max(1, Math.ceil(meta.total / pageSize))}
              onPageChange={setPage}
              totalItems={meta.total}
              pageSize={pageSize}
              label="products"
            />
          )}
        </CardContent>
      </Card>

      {/* Dialogs remain largely same but updated with consistent styling */}
      <Dialog open={isEditProductOpen} onOpenChange={setIsEditProductOpen}>
        <DialogContent className="sm:max-w-lg bg-white border-2 border-slate-100 shadow-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-slate-50">
            <DialogTitle className="text-2xl font-black text-slate-900 italic uppercase flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <Plus className="w-6 h-6" />
              </div>
              Update Product
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500 mt-1">
              Modify core attributes for SKU #
              {(selectedItem?._id || selectedItem?.id)
                ?.toString()
                .slice(-8)
                .toUpperCase()}
              .
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Product Description <span className="text-rose-500">*</span>
                </label>
                <Input
                  value={selectedItem?.name || ""}
                  onChange={(e) =>
                    setSelectedItem({ ...selectedItem, name: e.target.value })
                  }
                  className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white font-bold"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Receipt Display Name
                </label>
                <Input
                  value={selectedItem?.displayName || ""}
                  onChange={(e) =>
                    setSelectedItem({
                      ...selectedItem,
                      displayName: e.target.value,
                    })
                  }
                  className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white font-medium"
                  placeholder="Official name for receipt..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Authorized Supplier <span className="text-rose-500">*</span>
                </label>
                <SearchableDealerSelect
                  value={selectedItem?.dealerId || ""}
                  onChange={(val) =>
                    setSelectedItem({ ...selectedItem, dealerId: val })
                  }
                  placeholder="Search or select a dealer..."
                  required
                />
              </div>
              {selectedItem && (
                <DealerReceiptUploader
                  productId={selectedItem._id || selectedItem.id}
                  productName={selectedItem.name}
                  dealerId={selectedItem.dealerId}
                  dealerName={
                    dealers.find(
                      (dealer) =>
                        String(dealer._id || dealer.id) ===
                        String(selectedItem.dealerId || ""),
                    )?.name
                  }
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Category
                </label>
                <CategorySelect
                  value={selectedItem?.category || ""}
                  onChange={(category) =>
                    setSelectedItem((current: any) => current
                      ? { ...current, category }
                      : current)
                  }
                  className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white"
                  placeholder="Search or add a category..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Unit Type
                </label>
                <Select
                  value={selectedItem?.unit || "Unit"}
                  onValueChange={(val) =>
                    setSelectedItem({ ...selectedItem, unit: val })
                  }
                >
                  <SelectTrigger className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white">
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {unitTypes.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-slate-50">
            <Button
              variant="ghost"
              onClick={() => setIsEditProductOpen(false)}
              className="text-slate-500 font-bold uppercase text-[10px] tracking-widest"
            >
              Abort
            </Button>
            <Button
              onClick={handleEditProduct}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-blue-100"
            >
              Update SKU
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditStockOpen} onOpenChange={setIsEditStockOpen}>
        <DialogContent className="sm:max-w-md bg-white border-2 border-slate-100 shadow-2xl rounded-3xl">
          <DialogHeader className="pb-4 border-b border-slate-50">
            <DialogTitle className="text-2xl font-black text-slate-900 italic uppercase flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <ArrowUpDown className="w-6 h-6" />
              </div>
              Adjust Stock
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500 mt-1">
              Update available quantity for {selectedItem?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">
                New Available Quantity
              </label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={newQuantity}
                  onChange={(e) => setNewQuantity(e.target.value)}
                  placeholder="0"
                  className="pl-10 h-12 border-slate-200 bg-slate-50/50 focus:bg-white font-mono text-lg font-bold"
                />
              </div>
              <p className="text-[10px] text-slate-400 italic ml-1 mt-1">
                Current level: {selectedItem?.quantity} {selectedItem?.unit}
              </p>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-slate-50">
            <Button
              variant="ghost"
              onClick={() => setIsEditStockOpen(false)}
              className="text-slate-500 font-bold uppercase text-[10px] tracking-widest italic"
            >
              Abort
            </Button>
            <Button
              onClick={handleUpdateStock}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-indigo-100 italic"
            >
              Apply Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditPriceOpen} onOpenChange={setIsEditPriceOpen}>
        <DialogContent className="sm:max-w-md bg-white border-2 border-slate-100 shadow-2xl rounded-3xl">
          <DialogHeader className="pb-4 border-b border-slate-50">
            <DialogTitle className="text-2xl font-black text-slate-900 italic uppercase flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <TakaIcon className="w-6 h-6 text-2xl" />
              </div>
              Market Edge
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500 mt-1">
              Adjust default selling price for {selectedItem?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">
                New Default Price
              </label>
              <div className="relative">
                <TakaIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 text-sm" />
                <Input
                  type="number"
                  step="0.01"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="0.00"
                  className="pl-10 h-12 border-slate-200 bg-slate-50/50 focus:bg-white font-mono text-lg font-bold"
                />
              </div>
              <p className="text-[10px] text-slate-400 italic ml-1 mt-1">
                Current price: ${selectedItem?.sellPrice}
              </p>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-slate-50">
            <Button
              variant="ghost"
              onClick={() => setIsEditPriceOpen(false)}
              className="text-slate-500 font-bold uppercase text-[10px] tracking-widest italic"
            >
              Abort
            </Button>
            <Button
              onClick={handleUpdatePrice}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-emerald-100 italic"
            >
              Update SKU Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditThresholdOpen} onOpenChange={setIsEditThresholdOpen}>
        <DialogContent className="sm:max-w-md bg-white border-2 border-slate-100 shadow-2xl rounded-3xl">
          <DialogHeader className="pb-4 border-b border-slate-50">
            <DialogTitle className="text-2xl font-black text-slate-900 italic uppercase flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                <AlertTriangle className="w-6 h-6" />
              </div>
              Safety Logic
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500 mt-1">
              Configure low stock trigger for {selectedItem?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 italic">
                Alert Threshold (Units)
              </label>
              <div className="relative">
                <AlertTriangle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="number"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(e.target.value)}
                  placeholder="15"
                  className="pl-10 h-12 border-slate-200 bg-slate-50/50 focus:bg-white font-mono text-lg font-bold"
                />
              </div>
              <p className="text-[10px] text-slate-400 italic ml-1 mt-1">
                Current threshold: {selectedItem?.lowStockThreshold || 15} units
              </p>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-slate-50">
            <Button
              variant="ghost"
              onClick={() => setIsEditThresholdOpen(false)}
              className="text-slate-500 font-bold uppercase text-[10px] tracking-widest italic"
            >
              Abort
            </Button>
            <Button
              onClick={handleUpdateThreshold}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-amber-100 italic"
            >
              Update Logic
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-xl bg-white border-2 border-slate-100 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black italic uppercase leading-none">
                    {selectedItem?.displayName || selectedItem?.name}
                  </h3>
                  {selectedItem?.displayName && (
                    <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mt-1 opacity-70">
                      Catalog Name: {selectedItem?.name}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] uppercase font-black px-2">
                      {selectedItem?.category}
                    </Badge>
                    <Badge className="bg-indigo-500/20 text-indigo-300 border-none text-[10px] uppercase font-black px-2">
                      {selectedItem?.sku}
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-white"
                onClick={() =>
                  copyToClipboard(selectedItem?._id || selectedItem?.id)
                }
              >
                <Copy className="w-5 h-5" />
              </Button>
            </div>
          </div>

          <div className="p-8 grid grid-cols-2 gap-8 bg-white">
            <div className="space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Internal Hash ID
                </p>
                <p className="text-xs font-mono font-bold text-slate-600 truncate">
                  {selectedItem?._id || selectedItem?.id}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Supply Pipeline
                </p>
                <p className="text-sm font-bold text-slate-800 italic uppercase">
                  {dealers.find(
                    (d) => (d._id || d.id) === selectedItem?.dealerId,
                  )?.name || "Standard Wholesale"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Stock Architecture
                </p>
                <div className="flex gap-4 items-end">
                  <p className="text-3xl font-black text-slate-900 italic leading-none">
                    {selectedItem?.quantity}
                  </p>
                  <p className="text-[10px] font-black text-slate-400 uppercase italic pb-0.5">
                    {selectedItem?.unit} in reserve
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                  Pricing Matrix
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500">
                      Buy-in Point:
                    </span>
                    <span className="font-black text-slate-800">
                      ${selectedItem?.buyPrice}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500">
                      Market Price:
                    </span>
                    <span className="font-black text-indigo-600">
                      ${selectedItem?.sellPrice}
                    </span>
                  </div>
                  <Separator className="bg-slate-200" />
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 italic">
                      Projected ROI:
                    </span>
                    <span className="font-black text-emerald-600 italic">
                      +
                      {(
                        ((selectedItem?.sellPrice - selectedItem?.buyPrice) /
                          selectedItem?.buyPrice) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                  Safety Threshold
                </p>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3 text-amber-500" />
                  <p className="text-sm font-bold text-slate-800 italic uppercase">
                    Flag below {selectedItem?.lowStockThreshold || 15} units
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
            <Button
              variant="ghost"
              onClick={() => setIsDetailsOpen(false)}
              className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-900 italic"
            >
              Exit Terminal Details
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
