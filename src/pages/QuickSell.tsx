import { TakaIcon } from "../components/common/TakaIcon";
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Trash2,
  Receipt,
  History,
  Package,
  CheckCircle2,
  User,
  Eye,
  Copy,
  Plus,
  Minus,
  Printer,
  BadgeCheck,
  Maximize2,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import { format } from "date-fns";
import { Pagination } from "../components/common/Pagination";
import { DateRangeSelect } from "../components/common/DateRangeSelect";
import { apiService } from "../services/apiService";
import { BanglaCashMemo } from "../components/common/BanglaCashMemo";

import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchProducts } from "../store/slices/inventorySlice";
import { fetchCustomers } from "../store/slices/customerSlice";
import {
  fetchTransactions,
  recordTransaction,
} from "../store/slices/transactionSlice";
import { fetchSettings } from "../store/slices/settingsSlice";

interface CartItem {
  id: string;
  name: string;
  displayName?: string;
  quantity: number;
  price: number;
  total: number;
  unit: string;
  isPiece: boolean;
  piecesPerUnit: number;
  costPrice: number;
}

export function QuickSell({
  onFinalizeSale,
}: {
  onFinalizeSale: (order: any) => void;
}) {
  const dispatch = useAppDispatch();
  const { products } = useAppSelector((state) => state.inventory);
  const { customers } = useAppSelector((state) => state.customers);

  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [price, setPrice] = useState<string>("");
  const [sellUnit, setSellUnit] = useState("");
  const [quantity, setQuantity] = useState<string>("0");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [recentTrans, setRecentTrans] = useState<any[]>([]);
  const [recentTransMeta, setRecentTransMeta] = useState({ total: 0 });
  const [recentTransPage, setRecentTransPage] = useState(1);
  const [recentTransRange, setRecentTransRange] = useState("all");
  const [recentTransLoading, setRecentTransLoading] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] =
    useState<string>("unknown");
  const [applyAdvanceBalance, setApplyAdvanceBalance] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerSearchResults, setCustomerSearchResults] = useState<any[]>([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [selectedCustomerDetails, setSelectedCustomerDetails] =
    useState<any>(null);
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [selectedOrderData, setSelectedOrderData] = useState<any>(null);
  const [isInvoicePreviewOpen, setIsInvoicePreviewOpen] = useState(false);
  const cartEndRef = React.useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    cartEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (cart.length > 0) {
      scrollToBottom();
    }
  }, [cart.length]);

  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchCustomers(undefined));
  }, [dispatch]);

  useEffect(() => {
    const term = customerSearch.trim();
    if (!term) {
      setCustomerSearchResults([]);
      setCustomerSearchLoading(false);
      return;
    }

    let active = true;
    setCustomerSearchResults([]);
    setCustomerSearchLoading(true);
    const timer = setTimeout(() => {
      apiService
        .getCustomers(term, 1, 50, "all")
        .then((response) => {
          if (active) {
            setCustomerSearchResults(
              Array.isArray(response?.data) ? response.data : [],
            );
          }
        })
        .catch(() => {
          if (active) {
            setCustomerSearchResults([]);
            toast.error("Could not search customers");
          }
        })
        .finally(() => {
          if (active) setCustomerSearchLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [customerSearch]);

  // Handle auto-selection of 'unknown' if it's available or not selected
  useEffect(() => {
    if (!selectedCustomerId || selectedCustomerId === "") {
      setSelectedCustomerId("unknown");
    }
  }, [selectedCustomerId]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.displayName && p.displayName.toLowerCase().includes(term)) ||
        (p.sku && p.sku.toLowerCase().includes(term)) ||
        (p.category && p.category.toLowerCase().includes(term)),
    );
  }, [products, search]);

  const filteredCustomers = useMemo(() => {
    const list = customerSearch.trim() ? customerSearchResults : customers;
    return list.filter(
      (customer) => (customer._id || customer.id) !== "unknown",
    );
  }, [customers, customerSearch, customerSearchResults]);

  // Load price history from the backend rather than scanning the current transaction page.
  useEffect(() => {
    if (!selectedProduct) {
      setRecentTrans([]);
      setRecentTransMeta({ total: 0 });
      return;
    }

    let active = true;
    setRecentTransLoading(true);
    apiService
      .getProductSalesHistory(
        selectedProduct._id || selectedProduct.id,
        recentTransRange,
        recentTransPage,
        10,
        sellUnit || selectedProduct.unit || "Unit",
      )
      .then((response) => {
        if (!active) return;
        setRecentTrans(response.data || []);
        setRecentTransMeta({ total: response.meta?.total || 0 });
      })
      .catch(() => {
        if (active) {
          setRecentTrans([]);
          setRecentTransMeta({ total: 0 });
        }
      })
      .finally(() => {
        if (active) setRecentTransLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedProduct, recentTransRange, recentTransPage, sellUnit]);

  useEffect(() => {
    if (selectedProduct) {
      setSellUnit(selectedProduct.unit || "Unit");
      setPrice((selectedProduct.sellPrice || 0).toString());
    }
  }, [selectedProduct]);

  const handleSellUnitChange = (nextUnit: string) => {
    if (!selectedProduct) return;
    const piecesPerUnit = Math.max(
      1,
      Number(selectedProduct.piecesPerUnit) || 1,
    );
    const isPiece =
      nextUnit.toLowerCase() === "piece" &&
      selectedProduct.unit?.toLowerCase() !== "piece";
    setSellUnit(nextUnit);
    setRecentTransPage(1);
    setPrice(
      (selectedProduct.sellPrice / (isPiece ? piecesPerUnit : 1)).toString(),
    );
  };

  const addToCart = () => {
    if (!selectedProduct) return;

    const productId = selectedProduct._id || selectedProduct.id;
    const piecesPerUnit = Math.max(
      1,
      Number(selectedProduct.piecesPerUnit) || 1,
    );
    const isPiece =
      sellUnit.toLowerCase() === "piece" &&
      selectedProduct.unit?.toLowerCase() !== "piece";
    const finalPrice =
      price === ""
        ? selectedProduct.sellPrice / (isPiece ? piecesPerUnit : 1)
        : parseFloat(price);

    if (isNaN(finalPrice)) {
      toast.error("Invalid price entered");
      return;
    }

    const finalQuantity = parseFloat(quantity);
    if (isNaN(finalQuantity) || finalQuantity <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return;
    }

    const costPrice = selectedProduct.buyPrice / (isPiece ? piecesPerUnit : 1);
    const existingItem = cart.find(
      (item) =>
        item.id === productId &&
        item.price === finalPrice &&
        item.unit === sellUnit,
    );
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item === existingItem
            ? {
                ...item,
                quantity: item.quantity + finalQuantity,
                total: (item.quantity + finalQuantity) * item.price,
              }
            : item,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          id: productId,
          name: selectedProduct.name,
          displayName: selectedProduct.displayName,
          quantity: finalQuantity,
          price: finalPrice,
          total: finalPrice * finalQuantity,
          unit: sellUnit,
          isPiece,
          piecesPerUnit,
          costPrice,
        },
      ]);
    }

    toast.success(`${selectedProduct.name} Added`, {
      description: "Line item committed to pending receipt.",
    });

    setSelectedProduct(null);
    setSearch("");
    setPrice("");
    setSellUnit("");
    setQuantity("0");
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const updateCartItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const newCart = [...cart];
    newCart[index] = {
      ...newCart[index],
      quantity: newQty,
      total: newQty * newCart[index].price,
    };
    setCart(newCart);
  };

  const { config: settings } = useAppSelector((state) => state.settings);

  useEffect(() => {
    if (!settings) {
      dispatch(fetchSettings());
    }
  }, [dispatch, settings]);

  const handleClearCart = () => {
    setCart([]);
    setSelectedProduct(null);
  };

  const totalCartValue = cart.reduce((acc, curr) => acc + curr.total, 0);
  const totalProfit = cart.reduce((acc, curr) => {
    const product = products.find((p) => (p._id || p.id) === curr.id);
    return acc + (curr.price - curr.costPrice) * curr.quantity;
  }, 0);

  const finalPaidAmount =
    amountPaidInput !== ""
      ? Math.max(0, parseFloat(amountPaidInput) || 0)
      : totalCartValue;
  const selectedCustomer =
    customerSearchResults.find(
      (customer) => (customer._id || customer.id) === selectedCustomerId,
    ) ||
    customers.find(
      (customer) => (customer._id || customer.id) === selectedCustomerId,
    ) ||
    (selectedCustomerDetails &&
    (selectedCustomerDetails._id || selectedCustomerDetails.id) ===
      selectedCustomerId
      ? selectedCustomerDetails
      : undefined);
  const customerOptions = useMemo(() => {
    if (
      !selectedCustomerDetails ||
      selectedCustomerId === "unknown" ||
      filteredCustomers.some(
        (customer) => (customer._id || customer.id) === selectedCustomerId,
      )
    ) {
      return filteredCustomers;
    }
    return [selectedCustomerDetails, ...filteredCustomers];
  }, [filteredCustomers, selectedCustomerDetails, selectedCustomerId]);
  const availableAdvance = Number(selectedCustomer?.advanceBalance) || 0;
  const advanceAmountUsed = applyAdvanceBalance
    ? Math.min(availableAdvance, Math.max(0, totalCartValue - finalPaidAmount))
    : 0;
  const effectivePaidAmount = finalPaidAmount + advanceAmountUsed;
  const remainingDue = Math.max(0, totalCartValue - effectivePaidAmount);
  const surplusAdvance =
    effectivePaidAmount > totalCartValue
      ? effectivePaidAmount - totalCartValue
      : 0;

  const handleFinalize = async (shouldPrint: boolean = true) => {
    if (cart.length === 0) return;

    // If no customer is selected, default to 'unknown'
    const finalCustomerId = selectedCustomerId || "unknown";
    const customerObj = selectedCustomer;
    const customerName = customerObj?.name || "Walk-in Customer";

    const transactionData = {
      customerId: finalCustomerId,
      customerName,
      items: cart.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
        unitPrice: item.price,
        unit: item.unit,
        isPiece: item.isPiece,
        piecesPerUnit: item.piecesPerUnit,
        costPrice: item.costPrice,
      })),
      totalAmount: totalCartValue,
      amountPaid: effectivePaidAmount,
      cashReceived: finalPaidAmount,
      advanceUsed: advanceAmountUsed,
      dueAmount: remainingDue,
      type: "SALE",
    };

    try {
      const result = await dispatch(
        recordTransaction(transactionData),
      ).unwrap();
      // Re-fetch products and customers to update stock & balances
      dispatch(fetchProducts());
      dispatch(fetchCustomers(undefined));

      if (shouldPrint) {
        printCashMemo();
      }

      toast.success("Sale finalized successfully", {
        description:
          remainingDue > 0
            ? `Recorded ৳${remainingDue.toLocaleString()} due for ${customerName}`
            : "Payment settled in full",
      });

      onFinalizeSale(result);
      setCart([]);
      setAmountPaidInput("");
      setSelectedProduct(null);
      setApplyAdvanceBalance(false);
    } catch (err) {
      toast.error("Failed to record transaction");
    }
  };

  const handleJustPrint = () => {
    if (cart.length === 0) return;
    printCashMemo();
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

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-[1600px] mx-auto h-full lg:h-[calc(100vh-64px)] overflow-y-auto lg:overflow-hidden flex flex-col print:p-0 print:h-auto print:overflow-visible">
      <div className="cash-memo-print-host" aria-hidden="true">
        <BanglaCashMemo order={{
          id: selectedOrderData?._id || selectedOrderData?.id,
          memoNumber: selectedOrderData?.memoNumber,
          customerName: selectedCustomer?.name || "Walk-in Customer",
          createdAt: selectedOrderData?.createdAt || new Date(),
          items: cart.map((item) => ({
            productName: item.displayName || item.name,
            quantity: item.quantity,
            unitPrice: item.price,
            unit: item.unit,
          })),
        }} />
      </div>
      {/* Print-only Invoice Header */}
      <div className="hidden print:block p-12 space-y-10 bg-white text-slate-900 min-h-screen font-sans">
        <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10">
          <div>
            <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
              {settings?.shopName || "Wholesale OS"}
            </h1>
            <p className="text-xs font-black text-indigo-600 mt-3 uppercase tracking-[0.4em] leading-none">
              {settings?.address || "Official Transaction Receipt"}
            </p>
            {settings?.phone && (
              <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest leading-none">
                Phone: {settings.phone}
              </p>
            )}
          </div>
          <div className="text-right">
            <Badge className="bg-slate-900 text-white border-none text-[10px] uppercase font-black px-3 py-1 mb-4">
              SUCCESS
            </Badge>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              Generated
            </p>
            <p className="text-xs font-bold text-slate-900 uppercase">
              {format(new Date(), "PPpp")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Order Index
            </p>
            <p className="text-sm font-mono font-bold text-slate-900">
              #{Date.now().toString(36).toUpperCase()}
              {Math.random().toString(36).substring(2, 10).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
              Settle Date
            </p>
            <p className="text-lg font-black text-slate-900 italic uppercase">
              {format(new Date(), "MMMM do, yyyy")}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3">
            Product Displacement
          </p>
          <div className="space-y-8">
            {cart.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-xl font-black text-slate-900 uppercase italic leading-none">
                    {item.displayName || item.name}
                  </p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    SKU #{item.id?.toString().slice(-6).toUpperCase() || "N/A"}
                  </p>
                  <p className="text-sm font-bold text-slate-600 mt-2">
                    Qty: {item.quantity} {item.unit} @ ৳
                    {item.price.toLocaleString()} / {item.unit}
                  </p>
                </div>
                <p className="text-2xl font-black text-slate-900 italic">
                  ৳{item.total.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-10 border-t-4 border-slate-900 space-y-4">
          <div className="flex justify-between items-center px-2">
            <span className="text-sm font-black text-slate-400 uppercase tracking-[0.3em]">
              Transaction Total
            </span>
            <span className="text-4xl font-black text-slate-900 italic leading-none">
              ৳{totalCartValue.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between items-center px-2">
            <span className="text-sm font-black text-slate-500 uppercase tracking-[0.3em]">
              Amount Paid
            </span>
            <span className="text-2xl font-black text-slate-800 italic leading-none">
              ৳{effectivePaidAmount.toLocaleString()}
            </span>
          </div>
          {remainingDue > 0 && (
            <div className="flex justify-between items-center px-2 text-rose-600">
              <span className="text-sm font-black uppercase tracking-[0.3em]">
                Remaining Due (বকেয়া)
              </span>
              <span className="text-2xl font-black italic leading-none">
                ৳{remainingDue.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="mt-32 pt-10 border-t border-slate-100 flex justify-between items-end italic text-slate-300">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.4em]">
              {settings?.footerText || "Verified Transaction Block"}
            </p>
            <p className="text-[8px] font-mono mt-1 opacity-50 uppercase tracking-tighter">
              {Math.random().toString(36).substring(2, 32).toUpperCase()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-black uppercase tracking-widest mb-10">
              Authorized Signature
            </p>
            <div className="w-48 h-px bg-slate-200" />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between shrink-0 gap-4 print:hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6 w-full md:w-auto">
          <div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-slate-800 uppercase italic">
              Transaction Terminal
            </h2>
            <p className="text-[10px] md:text-sm font-medium text-slate-500">
              Quickly process B2B transactions with price intelligence.
            </p>
          </div>
          <div className="h-10 w-px bg-slate-200 hidden lg:block" />
          <div className="flex flex-col gap-1.5 w-full md:min-w-[280px]">
            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none flex items-center gap-1.5">
              <User className="w-3 h-3 text-indigo-500" />
              Active Distribution Account (Customer)
            </p>
            <Input
              value={customerSearch}
              onChange={(event) => setCustomerSearch(event.target.value)}
              placeholder="Search customer name or phone..."
              className="h-9 bg-white border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
            />
            {customerSearch.trim() && (
              <div
                className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm"
                role="listbox"
                aria-label="Matching customers"
                aria-live="polite"
              >
                {customerSearchLoading ? (
                  <p className="px-3 py-3 text-xs text-slate-500">
                    Searching customers...
                  </p>
                ) : filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => {
                    const customerId = customer._id || customer.id;
                    return (
                      <button
                        key={customerId}
                        type="button"
                        role="option"
                        aria-selected={customerId === selectedCustomerId}
                        onClick={() => {
                          setSelectedCustomerId(customerId);
                          setSelectedCustomerDetails(customer);
                          setApplyAdvanceBalance(false);
                          setCustomerSearch("");
                        }}
                        className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-indigo-50 focus-visible:bg-indigo-50 focus-visible:outline-none"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-slate-800">
                            {customer.name}
                          </span>
                          {customer.phone && (
                            <span className="block text-[10px] text-slate-500">
                              {customer.phone}
                            </span>
                          )}
                        </span>
                        {(customer.dueBalance || 0) > 0 && (
                          <span className="shrink-0 text-[10px] font-bold text-rose-600">
                            Due: ৳{customer.dueBalance.toLocaleString()}
                          </span>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <p className="px-3 py-3 text-xs text-slate-500">
                    No matching customers found.
                  </p>
                )}
              </div>
            )}
            <Select
              value={selectedCustomerId}
              onValueChange={(customerId) => {
                setSelectedCustomerId(customerId);
                setSelectedCustomerDetails(
                  customerOptions.find(
                    (customer) => (customer._id || customer.id) === customerId,
                  ) || null,
                );
                setApplyAdvanceBalance(false);
              }}
            >
              <SelectTrigger className="w-full h-10 md:h-11 bg-white border-slate-200 font-bold text-[10px] md:text-sm uppercase tracking-tight shadow-sm hover:border-indigo-300 transition-all">
                <span className="min-w-0 flex-1 truncate text-left">
                  {selectedCustomer?.name ||
                    (selectedCustomerId === "unknown"
                      ? "Walk-in Customer (Unknown)"
                      : "Select customer")}
                </span>
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem
                  value="unknown"
                  className="text-[10px] md:text-sm font-bold uppercase py-2 md:py-3 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Walk-in Customer (Unknown)
                  </div>
                </SelectItem>
                {customerOptions.map((c) => (
                  <SelectItem
                    key={c._id || c.id}
                    value={c._id || c.id}
                    className="text-[10px] md:text-sm font-bold uppercase py-2 md:py-3 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-4 w-full">
                      <span>{c.name}</span>
                      {c.dueBalance !== undefined && c.dueBalance > 0 && (
                        <span className="text-[9px] text-rose-600 font-bold">
                          Due: ৳{c.dueBalance}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
                {filteredCustomers.length === 0 && customerSearch.trim() && (
                  <SelectItem value="__no_customers__" disabled>
                    No matching customers found.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>

            {/* Selected customer financial indicators */}
            {(() => {
              const cust =
                customers.find((c) => (c._id || c.id) === selectedCustomerId) ||
                selectedCustomer;
              if (!cust || selectedCustomerId === "unknown") return null;
              return (
                <div className="flex items-center gap-2 mt-0.5">
                  {(cust.dueBalance || 0) > 0 ? (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                      Current Due: ৳{cust.dueBalance?.toLocaleString()} (বকেয়া)
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      Dues: Clear
                    </span>
                  )}
                  {(cust.advanceBalance || 0) > 0 && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      Advance: ৳{cust.advanceBalance?.toLocaleString()} (অগ্রিম)
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 md:gap-8 flex-1 min-h-0 pb-4">
        {/* Step 1: Product Selection */}
        <div className="md:col-span-1 lg:col-span-3 space-y-6 overflow-y-auto lg:pr-4 scrollbar-hide">
          <Card className="border-slate-200 shadow-lg rounded-2xl overflow-hidden border-t-4 border-t-indigo-600">
            <CardHeader className="bg-white border-b border-slate-100 p-4 md:p-6">
              <CardTitle className="text-slate-800 flex items-center gap-2 text-base md:text-lg">
                <Search className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                Find & Config Product
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                <Input
                  placeholder="Type product name to search..."
                  className="pl-9 md:pl-10 h-10 md:h-12 text-sm md:text-lg font-medium border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {search && !selectedProduct && (
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50 shadow-inner max-h-60 overflow-y-auto">
                  {filteredProducts.map((p) => (
                    <div
                      key={p._id || p.id}
                      className="p-4 border-b border-slate-100 hover:bg-white flex items-center justify-between cursor-pointer group transition-all"
                      onClick={() => {
                        setRecentTransPage(1);
                        setSelectedProduct(p);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 group-hover:text-indigo-600">
                            {p.name}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">
                            {p.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-slate-800">
                          ৳{p.sellPrice}
                        </p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                          Per {p.unit}
                        </p>
                      </div>
                    </div>
                  ))}
                  {filteredProducts.length === 0 && (
                    <div className="p-8 text-center text-slate-400 font-medium italic">
                      No products found
                    </div>
                  )}
                </div>
              )}

              {selectedProduct && (
                <div className="bg-indigo-50/30 border border-indigo-100 rounded-2xl p-6 space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-3 rounded-xl border border-indigo-200 shadow-sm">
                        <Package className="w-6 h-6 text-indigo-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 italic uppercase">
                          Selected: {selectedProduct.name}
                        </h3>
                        <p className="text-xs text-indigo-500 font-bold tracking-widest flex items-center gap-1.2">
                          <CheckCircle2 className="w-3 h-3" /> READY FOR
                          TRANSACTION
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedProduct(null);
                        setRecentTransPage(1);
                      }}
                      className="text-slate-400 hover:text-rose-600 font-bold uppercase text-[10px]"
                    >
                      Change Product
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-400" />
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                          Sell Price History ({recentTransMeta.total})
                        </p>
                      </div>
                      <DateRangeSelect
                        value={recentTransRange}
                        onChange={(nextRange) => {
                          setRecentTransRange(nextRange);
                          setRecentTransPage(1);
                        }}
                        className="h-8 w-full sm:w-36 bg-white text-xs"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {recentTransLoading ? (
                        <div className="text-sm text-slate-400">
                          Loading price history…
                        </div>
                      ) : recentTrans.length > 0 ? (
                        recentTrans.map((t, i) => (
                          <div
                            key={t.orderId || i}
                            className="group/chip relative px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 shadow-sm hover:border-indigo-400 hover:text-indigo-600 cursor-pointer transition-all flex items-center gap-2"
                          >
                            <span
                              onClick={() => setPrice(t.unitPrice.toString())}
                            >
                              ৳{Number(t.unitPrice).toLocaleString()}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrderData({
                                  ...t.receipt,
                                  id: t.orderId,
                                  orderDate: t.date,
                                });
                                setViewOrderId(t.orderId);
                              }}
                              className="w-5 h-5 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
                            >
                              <Eye className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-slate-400 italic">
                          No previous sales records for this item.
                        </div>
                      )}
                    </div>
                    <Pagination
                      currentPage={recentTransPage}
                      totalPages={Math.ceil(recentTransMeta.total / 10) || 1}
                      onPageChange={setRecentTransPage}
                      totalItems={recentTransMeta.total}
                      pageSize={10}
                      label="matching sales"
                      className="rounded-lg border border-slate-100 bg-white p-2"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Unit Type
                      </label>
                      <Select
                        value={sellUnit}
                        onValueChange={handleSellUnitChange}
                      >
                        <SelectTrigger className="h-12 bg-white font-bold text-slate-800 border-slate-200">
                          <SelectValue placeholder="Choose a unit" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                          <SelectItem value={selectedProduct.unit || "Unit"}>
                            {selectedProduct.unit || "Unit"}
                          </SelectItem>
                          {Number(selectedProduct.piecesPerUnit) > 1 &&
                            selectedProduct.unit?.toLowerCase() !== "piece" && (
                              <SelectItem value="Piece">Piece</SelectItem>
                            )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Sell Price per {sellUnit || selectedProduct.unit}
                      </label>
                      <div className="relative">
                        <TakaIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 text-sm" />
                        <Input
                          type="number"
                          placeholder={selectedProduct.sellPrice.toString()}
                          className="pl-8 h-12 bg-white font-black text-slate-800 text-lg border-slate-200"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                        />
                        <p className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 uppercase">
                          Catalog: ৳
                          {(
                            selectedProduct.sellPrice /
                            (sellUnit.toLowerCase() === "piece" &&
                            selectedProduct.unit?.toLowerCase() !== "piece"
                              ? Math.max(
                                  1,
                                  Number(selectedProduct.piecesPerUnit) || 1,
                                )
                              : 1)
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                        Quantity ({sellUnit || selectedProduct.unit})
                      </label>
                      <Input
                        type="number"
                        min="1"
                        step="any"
                        className="h-12 bg-white font-black text-slate-800 text-lg border-slate-200"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm uppercase tracking-[0.2em] shadow-lg shadow-indigo-200"
                    onClick={addToCart}
                  >
                    Commit Line Item to Receipt
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {!selectedProduct && (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-200 rounded-3xl opacity-50">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Package className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest text-center">
                Protocol: Enter a product name above to initialize transaction
              </p>
            </div>
          )}
        </div>

        {/* Step 2: Receipt Preview */}
        <div className="md:col-span-1 lg:col-span-2 space-y-4 flex flex-col h-full min-h-0 overflow-hidden lg:-mt-[170px] lg:mb-0 lg:h-[calc(100dvh-80px)]">
          <Card className="flex-1 min-h-0 border-slate-200 shadow-xl rounded-2xl overflow-hidden flex flex-col h-full">
            <CardHeader className="bg-slate-900 text-white shrink-0 px-4 py-3 italic">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-400" />
                  <CardTitle className="text-lg">
                    Live Invoice Preview
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-500 text-white border-none text-[10px] font-bold uppercase shadow-none">
                    Draft Receipt
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={cart.length === 0}
                    onClick={() => setIsInvoicePreviewOpen(true)}
                    className="text-white hover:bg-white/10 hover:text-white"
                    title="Open full-page invoice preview"
                    aria-label="Open full-page invoice preview"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col bg-[#fdfdfd] min-h-0">
              {cart.length > 0 ? (
                <>
                  <ScrollArea className="flex-1 min-h-0 px-4 py-3 md:px-5">
                    <div className="space-y-2 pb-3">
                      {cart.map((item, idx) => (
                        <div
                          key={`${item.id}-${idx}`}
                          className="flex justify-between items-start gap-3 group rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors"
                        >
                          <div className="min-w-0 flex-1 space-y-2">
                            <p className="text-sm font-bold text-slate-900 leading-snug break-words">
                              {item.displayName || item.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-xs font-bold text-indigo-700">
                                ৳{item.price.toLocaleString()} / {item.unit}
                              </p>
                              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                                <button
                                  onClick={() =>
                                    updateCartItemQuantity(
                                      idx,
                                      item.quantity - 1,
                                    )
                                  }
                                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-md transition-all disabled:opacity-30"
                                  disabled={item.quantity <= 1}
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-xs font-bold min-w-14 text-center text-slate-800">
                                  {item.quantity} {item.unit}
                                </span>
                                <button
                                  onClick={() =>
                                    updateCartItemQuantity(
                                      idx,
                                      item.quantity + 1,
                                    )
                                  }
                                  className="w-7 h-7 flex items-center justify-center text-slate-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-md transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <button
                                onClick={() => removeFromCart(idx)}
                                className="text-slate-400 hover:text-rose-600 transition-all p-1"
                                title="Remove Line Item"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-base font-black text-slate-950 whitespace-nowrap">
                              ৳{item.total.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      <div ref={cartEndRef} />
                    </div>
                  </ScrollArea>

                  <div className="p-3 border-t border-slate-100 bg-slate-50/70 space-y-2 shrink-0">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-800 italic uppercase">
                        Receipt Total
                      </span>
                      <span className="text-xl font-black text-indigo-700">
                        ৳{totalCartValue.toLocaleString()}
                      </span>
                    </div>

                    <div className="space-y-1 pt-2 border-t border-slate-200/60">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black uppercase text-slate-600 tracking-wider">
                          Amount Paid / Received (টাকা পেয়েছি)
                        </label>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setAmountPaidInput(totalCartValue.toString())
                            }
                            className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded transition-colors"
                          >
                            Full Paid
                          </button>
                          <button
                            type="button"
                            onClick={() => setAmountPaidInput("0")}
                            className="text-[9px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded transition-colors"
                          >
                            Full Due (৳0)
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <Input
                          type="number"
                          placeholder={totalCartValue.toString()}
                          value={amountPaidInput}
                          onChange={(e) => setAmountPaidInput(e.target.value)}
                          className="h-9 text-right font-black text-sm bg-white border-slate-200 focus:border-indigo-500"
                        />
                      </div>

                      {availableAdvance > 0 &&
                        selectedCustomerId !== "unknown" && (
                          <label className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-[10px] font-semibold text-emerald-800">
                            <input
                              type="checkbox"
                              checked={applyAdvanceBalance}
                              onChange={(event) =>
                                setApplyAdvanceBalance(event.target.checked)
                              }
                              className="mt-0.5 accent-emerald-600"
                            />
                            <span>
                              Apply customer advance credit (available ৳
                              {availableAdvance.toLocaleString()})
                              {advanceAmountUsed > 0 && (
                                <span className="block font-black">
                                  Applying ৳{advanceAmountUsed.toLocaleString()}{" "}
                                  to this sale
                                </span>
                              )}
                            </span>
                          </label>
                        )}

                      {/* Live Due / Advance status message */}
                      <div className="pt-0.5 flex justify-between items-center text-[11px] font-bold">
                        {remainingDue > 0 ? (
                          <div className="text-rose-600 bg-rose-50 border border-rose-200/80 p-2 rounded-lg text-[10px] w-full flex justify-between items-center">
                            <span>Remaining Due (বকেয়া):</span>
                            <span className="font-black text-xs">
                              ৳{remainingDue.toLocaleString()}{" "}
                              <span className="font-normal text-[9px] block text-right">
                                (Added to customer ledger)
                              </span>
                            </span>
                          </div>
                        ) : surplusAdvance > 0 ? (
                          <div className="text-emerald-700 bg-emerald-50 border border-emerald-200/80 p-2 rounded-lg text-[10px] w-full flex justify-between items-center">
                            <span>Surplus Advance (অগ্রিম):</span>
                            <span className="font-black text-xs">
                              ৳{surplusAdvance.toLocaleString()}{" "}
                              <span className="font-normal text-[9px] block text-right">
                                (Added to advance credit)
                              </span>
                            </span>
                          </div>
                        ) : (
                          <div className="text-emerald-700 bg-emerald-50/80 border border-emerald-100 p-1.5 rounded-lg text-[10px] w-full flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Full Payment Settled
                            </span>
                            <span className="font-black">৳0 Due</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                  <Receipt className="w-10 h-10 mb-4 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest italic">
                    Receipt is currently empty
                  </p>
                  <p className="text-[10px] mt-2 font-medium opacity-60">
                    Add items from the selector to begin
                  </p>
                </div>
              )}
            </CardContent>
            <div className="p-3 bg-white border-t border-slate-100 shrink-0 space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={cart.length === 0}
                  className="flex-1 h-9 border-slate-200 text-slate-600 font-bold text-[9px] uppercase tracking-widest shadow-sm gap-2"
                  onClick={handleJustPrint}
                >
                  <Printer className="w-3.5 h-3.5" />
                  Just Print
                </Button>
                <Button
                  variant="outline"
                  disabled={cart.length === 0}
                  className="flex-1 h-9 border-slate-200 text-slate-600 font-bold text-[9px] uppercase tracking-widest shadow-sm"
                  onClick={() => handleFinalize(false)}
                >
                  Complete (No Print)
                </Button>
              </div>
              <Button
                disabled={cart.length === 0}
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[11px] uppercase tracking-widest shadow-md rounded-xl gap-2 italic"
                onClick={() => handleFinalize(true)}
              >
                <BadgeCheck className="w-4 h-4" />
                Complete & Print Receipt
              </Button>
              <Button
                variant="ghost"
                onClick={handleClearCart}
                className="w-full text-slate-400 font-bold uppercase text-[9px] tracking-widest hover:text-rose-500"
              >
                Purge Cart
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <Dialog
        open={isInvoicePreviewOpen}
        onOpenChange={setIsInvoicePreviewOpen}
      >
      <DialogContent className="fixed! inset-0! left-0! top-0! block! h-dvh! w-screen! max-w-none! translate-x-0! translate-y-0! overflow-y-auto overscroll-contain rounded-none! border-0! bg-slate-100! p-0! ring-0!">
          <div className="min-h-full bg-slate-100 text-slate-900">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:px-8">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-indigo-600" />
                <div>
                  <DialogTitle className="text-sm font-black uppercase tracking-wide text-slate-900">
                    Invoice Preview
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Draft invoice · {cart.length} {cart.length === 1 ? "item" : "items"} · updates live
                  </DialogDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={cart.length === 0}
                  onClick={handleJustPrint}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsInvoicePreviewOpen(false)}
                  aria-label="Close invoice preview"
                  title="Close invoice preview"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </header>

            <main className="mx-auto w-full max-w-5xl px-3 py-4 md:px-8 md:py-8">
              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-200/70">
                <div className="border-b border-slate-200 bg-gradient-to-r from-white to-indigo-50/70 px-4 py-5 md:px-10 md:py-7">
                  <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-start">
                    <div>
                      <p className="text-xl font-black uppercase tracking-tight text-slate-900 md:text-2xl">
                        {settings?.shopName || "Wholesale OS"}
                      </p>
                      {settings?.address && (
                        <p className="mt-2 text-sm text-slate-500">
                          {settings.address}
                        </p>
                      )}
                      {settings?.phone && (
                        <p className="mt-1 text-sm text-slate-500">
                          {settings.phone}
                        </p>
                      )}
                    </div>
                    <div className="sm:text-right">
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600">
                        Draft Invoice
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-700">
                        {format(new Date(), "PPpp")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-slate-200 pt-4 md:mt-6">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Bill To · {cart.length} {cart.length === 1 ? "item" : "items"}
                    </p>
                    <p className="mt-1 text-base font-bold text-slate-800">
                      {selectedCustomer?.name || "Walk-in Customer"}
                    </p>
                  </div>
                </div>

                <div className="px-3 py-4 md:px-10 md:py-6">
                  <div className="mb-3 space-y-2 md:hidden">
                    {cart.map((item, index) => (
                      <article key={`${item.id}-${index}`} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold text-slate-900">{item.displayName || item.name}</p>
                            <p className="mt-1 text-xs text-slate-600">{item.quantity} {item.unit} × ৳{item.price.toLocaleString()}</p>
                          </div>
                          <p className="shrink-0 text-sm font-black text-slate-950">৳{item.total.toLocaleString()}</p>
                        </div>
                      </article>
                    ))}
                    {cart.length === 0 && <p className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500">No items yet. Add products to see them here.</p>}
                  </div>
                  <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                  <table className="w-full min-w-[620px] border-collapse text-left">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <th className="w-12 px-3 py-3 text-center">#</th>
                        <th className="py-3 pr-4">Product</th>
                        <th className="px-3 py-3 text-right">Qty</th>
                        <th className="px-3 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.length ? cart.map((item, index) => (
                        <tr
                          key={`${item.id}-${index}`}
                          className="border-b border-slate-100 text-sm last:border-0 hover:bg-indigo-50/40"
                        >
                          <td className="px-3 py-4 text-center text-xs font-semibold text-slate-400">{index + 1}</td>
                          <td className="py-4 pr-4 font-semibold text-slate-900">
                            {item.displayName || item.name}
                          </td>
                          <td className="px-3 py-4 text-right font-medium text-slate-700">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="px-3 py-4 text-right text-slate-700">
                            ৳{item.price.toLocaleString()} / {item.unit}
                          </td>
                          <td className="px-4 py-4 text-right font-bold text-slate-950">
                            ৳{item.total.toLocaleString()}
                          </td>
                        </tr>
                      )) : <tr><td colSpan={5} className="px-4 py-14 text-center text-sm text-slate-500">No items yet. Add products to see them here.</td></tr>}
                    </tbody>
                  </table>
                  </div>
                </div>

                <div className="ml-auto max-w-md border-t border-slate-200 bg-slate-50/70 px-5 py-4 md:px-10 md:py-6">
                  <div className="flex justify-between gap-8 py-2 text-sm">
                    <span className="font-semibold text-slate-500">
                      Subtotal
                    </span>
                    <span className="font-bold text-slate-900">
                      ৳{totalCartValue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between gap-8 py-2 text-sm">
                    <span className="font-semibold text-slate-500">
                      Amount Paid
                    </span>
                    <span className="font-bold text-slate-900">
                      ৳{effectivePaidAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between gap-8 border-t border-slate-200 pt-4 text-base">
                    <span className="font-black uppercase tracking-wide text-slate-800">
                      {remainingDue > 0 ? "Balance Due" : "Balance"}
                    </span>
                    <span
                      className={`font-black ${remainingDue > 0 ? "text-rose-600" : "text-emerald-700"}`}
                    >
                      ৳{remainingDue.toLocaleString()}
                    </span>
                  </div>
                </div>
                {settings?.footerText && (
                  <p className="border-t border-slate-100 px-6 py-5 text-center text-xs text-slate-400 md:px-10">
                    {settings.footerText}
                  </p>
                )}
              </section>
            </main>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!viewOrderId}
        onOpenChange={(open) => {
          if (!open) {
            setViewOrderId(null);
            setSelectedOrderData(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md bg-white border-2 border-slate-100 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <div className="bg-slate-950 p-8 text-white relative">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-black italic uppercase leading-none tracking-tighter">
                  Wholesale OS
                </h3>
                <p className="text-[10px] font-black text-indigo-400 mt-2 uppercase tracking-[0.3em] leading-none">
                  Official Transaction Receipt
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge className="bg-emerald-500 text-white border-none text-[10px] uppercase font-black px-2 shadow-lg shadow-emerald-500/20">
                  Success
                </Badge>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  Order Index
                  <button
                    onClick={() => {
                      const id = selectedOrderData?.id;
                      navigator.clipboard.writeText(id?.toString() || "");
                      toast.success("Order ID Copied");
                    }}
                    className="p-1 hover:bg-slate-800 rounded transition-colors text-indigo-400 hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </p>
                <p className="text-sm font-mono font-bold text-slate-200">
                  {(() => {
                    const id = selectedOrderData?.id?.toString() || "";
                    return id.length > 12
                      ? `#${id.substring(0, 8)}...${id.substring(id.length - 4)}`
                      : `#${id}`;
                  })()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                  Settle Date
                </p>
                <p className="font-bold text-sm text-slate-200">
                  {selectedOrderData
                    ? (() => {
                        const date = new Date(selectedOrderData.orderDate);
                        return !isNaN(date.getTime())
                          ? format(date, "MMMM do, yyyy")
                          : "N/A";
                      })()
                    : "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6 bg-white">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
                Product Displacement
              </p>
              <div className="space-y-4">
                {selectedOrderData?.items?.map((item: any, idx: number) => {
                  const product = products.find(
                    (p) => (p._id || p.id) === item.productId,
                  );
                  return (
                    <div
                      key={`${item.productId}-${idx}`}
                      className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-all"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-black text-slate-900 uppercase italic leading-none">
                          {product?.displayName ||
                            product?.name ||
                            "Catalog Item"}
                        </p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                          SKU #{product?.sku?.toString().slice(-6) || "N/A"}
                        </p>
                        <p className="text-[10px] font-bold text-indigo-500 mt-1">
                          Qty: {item.quantity} {item.unit || "units"} @ ৳
                          {item.unitPrice}
                        </p>
                      </div>
                      <p className="text-md font-black text-slate-900 italic">
                        ৳{(item.quantity * item.unitPrice).toLocaleString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center px-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Transaction Total
                </span>
                <span className="text-2xl font-black text-slate-900 italic">
                  ৳{selectedOrderData?.totalAmount.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">
                  Calculated Profit
                </span>
                <span className="text-xl font-black text-indigo-700 italic">
                  ৳{selectedOrderData?.totalProfit?.toLocaleString() || "0"}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-center">
            <Button
              variant="ghost"
              onClick={() => {
                setViewOrderId(null);
                setSelectedOrderData(null);
              }}
              className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-slate-900 italic"
            >
              Dismiss History Entry
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
