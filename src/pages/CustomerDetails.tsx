import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  Users,
  Phone,
  Mail,
  MapPin,
  ShoppingBag,
  TrendingUp,
  Receipt,
  CreditCard,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit,
  Plus,
  Trash2,
  Printer,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  History,
  FileSpreadsheet,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
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
import { Separator } from "../components/ui/separator";
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
import { apiService } from "../services/apiService";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "../lib/utils";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { fetchProducts } from "../store/slices/inventorySlice";
import { fetchTransactions } from "../store/slices/transactionSlice";
import { resolveSaleUnit } from "../utils/salesUnits";

interface CustomerDetailsProps {
  customerId: string | null;
  onBack: () => void;
  onNavigateToSell?: (customerId?: string) => void;
  onNavigateToEditOrder?: (order: any) => void;
}

export function CustomerDetails({
  customerId,
  onBack,
  onNavigateToSell,
  onNavigateToEditOrder,
}: CustomerDetailsProps) {
  const dispatch = useAppDispatch();
  const { products } = useAppSelector((state) => state.inventory);

  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditCustomerOpen, setIsEditCustomerOpen] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderMeta, setOrderMeta] = useState<{
    total: number;
    page: number;
    limit: number;
  }>({ total: 0, page: 1, limit: 5 });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [orderRange, setOrderRange] = useState("all");
  const [adjustmentPage, setAdjustmentPage] = useState(1);
  const [adjustmentPageSize] = useState(10);
  const [adjustmentMeta, setAdjustmentMeta] = useState({ total: 0 });

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"orders" | "adjustments">(
    "orders",
  );

  // Adjust balance modal state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<
    | "DUE_PAYMENT_RECEIVED"
    | "ADVANCE_DEPOSIT"
    | "DUE_DISCOUNT"
    | "ADVANCE_WITHDRAWAL"
    | "ADVANCE_APPLIED"
  >("DUE_PAYMENT_RECEIVED");
  const [adjustAmount, setAdjustAmount] = useState<string>("");
  const [adjustMethod, setAdjustMethod] = useState<string>("Cash");
  const [adjustNotes, setAdjustNotes] = useState<string>("");
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);
  const [adjustments, setAdjustments] = useState<any[]>([]);

  // Edit Order Modal state
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [editOrderItems, setEditOrderItems] = useState<any[]>([]);
  const [editOrderPaid, setEditOrderPaid] = useState<string>("");
  const [isEditOrderOpen, setIsEditOrderOpen] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>("");

  useEffect(() => {
    dispatch(fetchProducts());
  }, [dispatch]);

  const loadCustomer = useCallback(async () => {
    if (!customerId) return;
    try {
      setLoading(true);
      const data = await apiService.getCustomerById(customerId);
      setCustomer(data);
    } catch (err) {
      console.error("Error fetching customer:", err);
      toast.error("Failed to load customer profile");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  const openCustomerEdit = () => {
    if (!customer) return;
    setCustomerForm({
      name: customer.name || "",
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
    });
    setIsEditCustomerOpen(true);
  };

  const saveCustomerProfile = async () => {
    if (!customerId || !customerForm.name.trim() || !customerForm.phone.trim()) {
      toast.error("Name and phone are required");
      return;
    }
    setSavingCustomer(true);
    try {
      const updated = await apiService.updateCustomer(customerId, {
        name: customerForm.name.trim(),
        phone: customerForm.phone.trim(),
        email: customerForm.email.trim(),
        address: customerForm.address.trim(),
      });
      setCustomer((previous: any) => ({ ...previous, ...updated }));
      setIsEditCustomerOpen(false);
      toast.success("Customer profile updated");
    } catch (error: any) {
      toast.error("Could not update customer", {
        description: error.response?.data?.message || error.message,
      });
    } finally {
      setSavingCustomer(false);
    }
  };

  const loadCustomerOrders = useCallback(
    async (targetPage: number) => {
      if (!customerId) return;
      try {
        setOrdersLoading(true);
        const response = await apiService.getCustomerOrders(
          customerId,
          targetPage,
          pageSize,
          orderRange,
        );
        setOrders(response.data || []);
        if (response.meta) {
          setOrderMeta(response.meta);
        }
      } catch (err) {
        console.error("Error fetching customer orders:", err);
        toast.error("Failed to load customer orders");
      } finally {
        setOrdersLoading(false);
      }
    },
    [customerId, pageSize, orderRange],
  );

  const loadAdjustments = useCallback(async () => {
    if (!customerId) return;
    try {
      const response = await apiService.getCustomerAdjustments(
        customerId,
        adjustmentPage,
        adjustmentPageSize,
        orderRange,
      );
      setAdjustments(response.data || []);
      setAdjustmentMeta({ total: response.meta?.total || 0 });
    } catch (err) {
      console.error("Error fetching adjustments:", err);
    }
  }, [customerId, adjustmentPage, adjustmentPageSize, orderRange]);

  useEffect(() => {
    loadCustomer();
  }, [loadCustomer]);

  useEffect(() => {
    loadCustomerOrders(page);
  }, [loadCustomerOrders, page]);

  useEffect(() => {
    loadAdjustments();
  }, [loadAdjustments]);

  // Handle balance adjustment submission
  const handleAdjustBalance = async () => {
    const num = parseFloat(adjustAmount);
    if (isNaN(num) || num <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    try {
      setIsSubmittingAdjust(true);
      await apiService.adjustCustomerBalance(customerId!, {
        amount: num,
        type: adjustType,
        paymentMethod: adjustMethod,
        notes: adjustNotes,
      });

      toast.success(
        adjustType === "DUE_PAYMENT_RECEIVED"
          ? `Received ৳${num.toLocaleString()} due payment from ${customer.name}`
          : adjustType === "ADVANCE_DEPOSIT"
            ? `Added ৳${num.toLocaleString()} advance deposit`
            : adjustType === "ADVANCE_WITHDRAWAL"
              ? `Reduced advance credit by ৳${num.toLocaleString()}`
              : adjustType === "ADVANCE_APPLIED"
                ? `Applied ৳${num.toLocaleString()} advance to open invoices`
                : `Applied ৳${num.toLocaleString()} balance adjustment`,
      );

      setIsAdjustOpen(false);
      setAdjustAmount("");
      setAdjustNotes("");
      // Reload customer data and adjustments
      loadCustomer();
      loadAdjustments();
      loadCustomerOrders(page);
      dispatch(fetchTransactions(undefined));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to adjust balance");
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Open Edit Order (Full page if onNavigateToEditOrder available)
  const handleOpenEditOrder = (order: any) => {
    if (onNavigateToEditOrder) {
      onNavigateToEditOrder(order);
      return;
    }
    setEditingOrder(order);
    setEditOrderItems(
      (order.items || []).map((it: any) => ({
        productId: it.productId,
        productName: it.productName || "Product",
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        costPrice: it.costPrice || 0,
        unit: it.unit,
        isPiece: it.isPiece,
        piecesPerUnit: it.piecesPerUnit,
      })),
    );
    setEditOrderPaid(
      (order.amountPaid !== undefined
        ? order.amountPaid
        : order.totalAmount
      ).toString(),
    );
    setIsEditOrderOpen(true);
  };

  // Edit order calculations
  const editComputedTotal = editOrderItems.reduce(
    (sum, it) => sum + it.unitPrice * it.quantity,
    0,
  );
  const editComputedCost = editOrderItems.reduce(
    (sum, it) => sum + it.costPrice * it.quantity,
    0,
  );
  const editComputedProfit = editComputedTotal - editComputedCost;
  const editPaidNumber = parseFloat(editOrderPaid) || 0;
  const editComputedDue = Math.max(0, editComputedTotal - editPaidNumber);
  const editComputedAdvance =
    editPaidNumber > editComputedTotal ? editPaidNumber - editComputedTotal : 0;

  const handleUpdateItemQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const updated = [...editOrderItems];
    updated[index].quantity = newQty;
    setEditOrderItems(updated);
  };

  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    const updated = [...editOrderItems];
    updated[index].unitPrice = newPrice;
    setEditOrderItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (editOrderItems.length <= 1) {
      toast.error(
        "An order must have at least one product item. If order is canceled, adjust quantity or set paid accordingly.",
      );
      return;
    }
    const updated = [...editOrderItems];
    const removed = updated.splice(index, 1)[0];
    setEditOrderItems(updated);
    toast.info(`Removed ${removed.productName} from order`);
  };

  const handleAddProductToEditOrder = () => {
    if (!selectedProductToAdd) return;
    const prod = products.find((p) => (p._id || p.id) === selectedProductToAdd);
    if (!prod) return;

    // Check if already in order
    const existingIdx = editOrderItems.findIndex(
      (it) => it.productId === (prod._id || prod.id),
    );
    if (existingIdx !== -1) {
      const updated = [...editOrderItems];
      updated[existingIdx].quantity += 1;
      setEditOrderItems(updated);
    } else {
      setEditOrderItems([
        ...editOrderItems,
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

  const handleSaveOrderChanges = async () => {
    if (!editingOrder) return;
    if (editOrderItems.length === 0) {
      toast.error("Order cannot be empty");
      return;
    }

    try {
      setIsSavingOrder(true);
      const payload = {
        items: editOrderItems,
        amountPaid: editPaidNumber,
        totalAmount: editComputedTotal,
      };

      const orderId = editingOrder._id || editingOrder.id;
      await apiService.updateTransaction(orderId, payload);

      toast.success("Order and inventory updated successfully", {
        description: `Order #${orderId.slice(-6)} adjusted. Stock & balances reconciled.`,
      });

      setIsEditOrderOpen(false);
      setEditingOrder(null);
      // Reload customer, orders, and products
      loadCustomer();
      loadCustomerOrders(page);
      dispatch(fetchProducts());
      dispatch(fetchTransactions(undefined));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to update order");
    } finally {
      setIsSavingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">
          Loading Customer Financial Ledger...
        </p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 max-w-[1600px] mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-xl font-bold text-slate-800">Customer Not Found</h3>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Directory
        </Button>
      </div>
    );
  }

  const dueBalance = customer.dueBalance || 0;
  const advanceBalance = customer.advanceBalance || 0;
  const totalSpent =
    customer.totalLifetimePurchases ?? customer.totalSpent ?? 0;
  const totalOrders = customer.totalOrders || orderMeta.total || 0;
  const totalProfit = customer.totalLifetimeProfit || 0;

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto text-slate-900 pb-24">
      {/* Top Navigation & Profile Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start sm:items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 shrink-0 h-10 w-10"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight uppercase italic">
                {customer.name}
              </h1>
              <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[10px] uppercase font-bold">
                ID: {customer._id || customer.id}
              </Badge>
              {dueBalance > 0 ? (
                <Badge className="bg-rose-100 text-rose-700 border-none font-bold text-[10px] uppercase">
                  ৳{dueBalance.toLocaleString()} Due / বকেয়া আছে
                </Badge>
              ) : advanceBalance > 0 ? (
                <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px] uppercase">
                  ৳{advanceBalance.toLocaleString()} Advance Credit / অগ্রিম জমা
                </Badge>
              ) : (
                <Badge className="bg-slate-100 text-slate-600 border-none font-bold text-[10px] uppercase">
                  Balance Clear / হিসাব পরিষ্কার
                </Badge>
              )}
            </div>

            {/* Contact details */}
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <Phone className="w-3.5 h-3.5 text-indigo-600" />
                {customer.phone || "No phone"}
              </span>
              {customer.email && (
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {customer.email}
                </span>
              )}
              {customer.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {customer.address}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            onClick={openCustomerEdit}
            className="gap-2 border-slate-200 bg-white font-bold text-xs"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
          <Button
            onClick={() => {
              setAdjustType(
                dueBalance > 0 ? "DUE_PAYMENT_RECEIVED" : "ADVANCE_DEPOSIT",
              );
              setAdjustAmount(dueBalance > 0 ? dueBalance.toString() : "");
              setIsAdjustOpen(true);
            }}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-5 h-11 rounded-xl shadow-md shadow-emerald-100"
          >
            <Coins className="w-4 h-4" />
            Tk Adjust / টাকা গ্রহণ বা জমা
          </Button>

          <Button
            onClick={() => onNavigateToSell?.(customer._id || customer.id)}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-5 h-11 rounded-xl shadow-md shadow-indigo-100"
          >
            <ShoppingBag className="w-4 h-4" />
            New Sales Order
          </Button>
        </div>
      </div>

      <Dialog open={isEditCustomerOpen} onOpenChange={setIsEditCustomerOpen}>
        <DialogContent className="sm:max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle>Edit Customer Profile</DialogTitle>
            <DialogDescription>
              Update this customer&apos;s contact information.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Name
              <Input
                value={customerForm.name}
                onChange={(event) =>
                  setCustomerForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Phone
              <Input
                value={customerForm.phone}
                onChange={(event) =>
                  setCustomerForm((current) => ({ ...current, phone: event.target.value }))
                }
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Email
              <Input
                type="email"
                value={customerForm.email}
                onChange={(event) =>
                  setCustomerForm((current) => ({ ...current, email: event.target.value }))
                }
              />
            </label>
            <label className="space-y-1.5 text-sm font-medium text-slate-700">
              Address
              <Input
                value={customerForm.address}
                onChange={(event) =>
                  setCustomerForm((current) => ({ ...current, address: event.target.value }))
                }
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditCustomerOpen(false)}
              disabled={savingCustomer}
            >
              Cancel
            </Button>
            <Button onClick={saveCustomerProfile} disabled={savingCustomer}>
              {savingCustomer ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Financial Ledger & Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Koto Tk Ami Pai (Receivables / Due) */}
        <Card
          className={cn(
            "border rounded-2xl shadow-sm transition-all relative overflow-hidden",
            dueBalance > 0
              ? "border-rose-200 bg-rose-50/40 border-t-4 border-t-rose-600"
              : "border-slate-200 bg-white",
          )}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Koto Tk Ami Pai (বকেয়া)
                </p>
                <h3
                  className={cn(
                    "text-2xl md:text-3xl font-black mt-1 tracking-tight italic",
                    dueBalance > 0 ? "text-rose-600" : "text-slate-800",
                  )}
                >
                  ৳{dueBalance.toLocaleString()}
                </h3>
              </div>
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  dueBalance > 0
                    ? "bg-rose-100 text-rose-600"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2">
              {dueBalance > 0
                ? "Total pending receivable from customer"
                : "Customer has zero outstanding dues"}
            </p>
          </CardContent>
        </Card>

        {/* Metric 2: Koto Tk Advance Kora Ace (Customer Deposit/Credit) */}
        <Card
          className={cn(
            "border rounded-2xl shadow-sm transition-all relative overflow-hidden",
            advanceBalance > 0
              ? "border-emerald-200 bg-emerald-50/40 border-t-4 border-t-emerald-600"
              : "border-slate-200 bg-white",
          )}
        >
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Advance Kora Ache (অগ্রিম)
                </p>
                <h3
                  className={cn(
                    "text-2xl md:text-3xl font-black mt-1 tracking-tight italic",
                    advanceBalance > 0 ? "text-emerald-700" : "text-slate-800",
                  )}
                >
                  ৳{advanceBalance.toLocaleString()}
                </h3>
              </div>
              <div
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  advanceBalance > 0
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2">
              {advanceBalance > 0
                ? "Customer prepaid credit available"
                : "No advance deposit currently on hold"}
            </p>
          </CardContent>
        </Card>

        {/* Metric 3: Total Lifetime Purchases */}
        <Card className="border-slate-200 bg-white border-t-4 border-t-indigo-600 rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Total Purchases (মোট ক্রয়)
                </p>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-1 tracking-tight italic">
                  ৳{totalSpent.toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2">
              Gross sales volume across all orders
            </p>
          </CardContent>
        </Card>

        {/* Metric 4: Lifetime Profit Generated */}
        <Card className="border-slate-200 bg-white border-t-4 border-t-amber-500 rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Lifetime Profit (লাভ)
                </p>
                <h3 className="text-2xl md:text-3xl font-black text-emerald-600 mt-1 tracking-tight italic">
                  +৳{totalProfit.toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2">
              Gross margin yield from this account
            </p>
          </CardContent>
        </Card>

        {/* Metric 5: Total Orders */}
        <Card className="border-slate-200 bg-white border-t-4 border-t-slate-700 rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Orders Count (অর্ডার)
                </p>
                <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-1 tracking-tight italic">
                  {totalOrders}
                </h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] font-medium text-slate-500 mt-2">
              Completed transaction cycles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs: Order History vs Adjustments History */}
      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant={activeTab === "orders" ? "default" : "outline"}
                onClick={() => setActiveTab("orders")}
                className={cn(
                  "h-10 px-5 rounded-xl font-bold text-xs uppercase tracking-wider italic",
                  activeTab === "orders"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 text-slate-600",
                )}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Sales & Invoice History ({orderMeta.total})
              </Button>

              <Button
                variant={activeTab === "adjustments" ? "default" : "outline"}
                onClick={() => setActiveTab("adjustments")}
                className={cn(
                  "h-10 px-5 rounded-xl font-bold text-xs uppercase tracking-wider italic",
                  activeTab === "adjustments"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 text-slate-600",
                )}
              >
                <History className="w-4 h-4 mr-2" />
                Balance Adjustments Log ({adjustmentMeta.total})
              </Button>
            </div>

            <DateRangeSelect
              value={orderRange}
              onChange={(range) => {
                setOrderRange(range);
                setPage(1);
                setAdjustmentPage(1);
              }}
              className="h-9 w-full sm:w-36 bg-white"
            />
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {activeTab === "orders" ? (
            <div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-slate-100">
                      <TableHead className="w-[140px] px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Order ID
                      </TableHead>
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Date & Time
                      </TableHead>
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Items Bought
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Buy Price (Cost)
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Sell Price (Total)
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Profit
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Paid (পেইড)
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Due (বকেয়া)
                      </TableHead>
                      <TableHead className="px-6 py-4 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Status
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="h-48 text-center text-slate-400 font-bold uppercase text-xs"
                        >
                          Loading customer orders...
                        </TableCell>
                      </TableRow>
                    ) : orders.length > 0 ? (
                      orders.map((order) => {
                        const orderId = order._id || order.id;
                        const shortId =
                          orderId?.toString().slice(-8).toUpperCase() || "N/A";
                        const isExpanded = expandedOrderId === orderId;
                        const date = new Date(
                          order.createdAt || order.orderDate || order.date,
                        );
                        const formattedDate = !isNaN(date.getTime())
                          ? format(date, "MMM d, yyyy h:mm a")
                          : "N/A";

                        const totalAmount = order.totalAmount || 0;
                        const dueDiscount = Number(order.dueDiscount) || 0;
                        const correctedLines = (order.items || []).map(
                          (item: any) => {
                            const productId =
                              item.productId?._id ||
                              item.productId?.id ||
                              item.productId;
                            const product = products.find(
                              (entry) => (entry._id || entry.id) === productId,
                            );
                            const { unit, costPrice } = resolveSaleUnit(
                              item,
                              product,
                            );
                            const quantity = Number(item.quantity) || 0;
                            const unitPrice = Number(item.unitPrice) || 0;
                            return {
                              item,
                              product,
                              unit,
                              costPrice,
                              quantity,
                              unitPrice,
                            };
                          },
                        );
                        const totalCost = correctedLines.reduce(
                          (sum, line) => sum + line.costPrice * line.quantity,
                          0,
                        );
                        const totalProfitVal = correctedLines.reduce(
                          (sum, line) =>
                            sum +
                            (line.unitPrice - line.costPrice) * line.quantity,
                          0,
                        );
                        const amountPaid =
                          order.amountPaid !== undefined
                            ? order.amountPaid
                            : totalAmount;
                        const dueAmount =
                          order.dueAmount !== undefined
                            ? order.dueAmount
                            : Math.max(0, totalAmount - amountPaid);

                        return (
                          <React.Fragment key={orderId}>
                            <TableRow
                              className={cn(
                                "hover:bg-slate-50/50 transition-colors border-b border-slate-100",
                                isExpanded && "bg-indigo-50/20",
                              )}
                            >
                              {/* Order ID */}
                              <TableCell className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                                #{shortId}
                              </TableCell>

                              {/* Date */}
                              <TableCell className="px-6 py-4 text-xs text-slate-600 font-medium">
                                {formattedDate}
                              </TableCell>

                              {/* Items Summary */}
                              <TableCell className="px-6 py-4">
                                <span className="inline-flex items-center text-[11px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                  {(order.items || []).reduce(
                                    (sum: number, it: any) =>
                                      sum + (Number(it.quantity) || 0),
                                    0,
                                  )}{" "}
                                  item
                                </span>
                              </TableCell>

                              {/* Buy Price / Total Cost */}
                              <TableCell className="px-6 py-4 text-right font-medium text-xs text-slate-500">
                                ৳{totalCost.toLocaleString()}
                              </TableCell>

                              {/* Sell Price / Order Total */}
                              <TableCell className="px-6 py-4 text-right font-bold text-xs text-slate-900">
                                ৳{totalAmount.toLocaleString()}
                              </TableCell>

                              {/* Profit */}
                              <TableCell className="px-6 py-4 text-right">
                                <span
                                  className={`font-bold text-xs ${totalProfitVal < 0 ? "text-rose-600" : "text-emerald-600"}`}
                                >
                                  {totalProfitVal < 0 ? "-৳" : "+৳"}
                                  {Math.abs(totalProfitVal).toLocaleString()}
                                </span>
                              </TableCell>

                              {/* Paid Amount */}
                              <TableCell className="px-6 py-4 text-right font-bold text-xs text-slate-800">
                                ৳{amountPaid.toLocaleString()}
                              </TableCell>

                              {/* Due Amount */}
                              <TableCell className="px-6 py-4 text-right">
                                {dueAmount > 0 ? (
                                  <span className="font-black text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                                    ৳{dueAmount.toLocaleString()}
                                  </span>
                                ) : (
                                  <span className="text-xs text-slate-400 font-bold">
                                    ৳0
                                  </span>
                                )}
                                {dueDiscount > 0 && (
                                  <span className="block mt-1 text-[10px] font-semibold text-amber-700">
                                    Waived: ৳{dueDiscount.toLocaleString()}
                                  </span>
                                )}
                              </TableCell>

                              {/* Status Badge */}
                              <TableCell className="px-6 py-4 text-center">
                                <PaymentStatusBadge
                                  status={order.paymentStatus}
                                  dueAmount={dueAmount}
                                  amountPaid={amountPaid}
                                  totalAmount={totalAmount}
                                />
                              </TableCell>

                              {/* Actions */}
                              <TableCell className="px-6 py-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEditOrder(order)}
                                    className="h-8 px-2.5 rounded-lg border-indigo-200 text-indigo-700 bg-indigo-50/40 hover:bg-indigo-100 text-[10px] font-bold uppercase tracking-wider"
                                    title="Edit items, prices, or payment in this receipt"
                                  >
                                    <Edit className="w-3.5 h-3.5 mr-1" />
                                    Edit Receipt
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setExpandedOrderId(
                                        isExpanded ? null : orderId,
                                      )
                                    }
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-slate-800"
                                    title="View item breakdown"
                                  >
                                    {isExpanded ? (
                                      <ChevronUp className="w-4 h-4" />
                                    ) : (
                                      <ChevronDown className="w-4 h-4" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* Expanded Item Breakdown Table */}
                            {isExpanded && (
                              <TableRow className="bg-slate-50/60 border-b border-slate-200">
                                <TableCell colSpan={10} className="p-4 md:p-6">
                                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                                    <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200 flex justify-between items-center">
                                      <p className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                                        Line Items Detailed Breakdown: Order #
                                        {shortId}
                                      </p>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          handleOpenEditOrder(order)
                                        }
                                        className="h-7 text-indigo-600 hover:text-indigo-800 font-bold text-[10px] uppercase gap-1"
                                      >
                                        <Edit className="w-3 h-3" />
                                        Modify Products or Quantities
                                      </Button>
                                    </div>

                                    <Table>
                                      <TableHeader>
                                        <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                                          <th className="px-4 py-2.5 text-left">
                                            Product Name / Item
                                          </th>
                                          <th className="px-4 py-2.5 text-center">
                                            Quantity
                                          </th>
                                          <th className="px-4 py-2.5 text-right">
                                            Buy Price (Cost)
                                          </th>
                                          <th className="px-4 py-2.5 text-right">
                                            Sell Price (Unit)
                                          </th>
                                          <th className="px-4 py-2.5 text-right">
                                            Total Cost
                                          </th>
                                          <th className="px-4 py-2.5 text-right">
                                            Total Revenue
                                          </th>
                                          <th className="px-4 py-2.5 text-right">
                                            Net Profit
                                          </th>
                                        </tr>
                                      </TableHeader>
                                      <TableBody>
                                        {correctedLines.map(
                                          (
                                            {
                                              item,
                                              unit,
                                              costPrice: cost,
                                              quantity: qty,
                                              unitPrice: sell,
                                            },
                                            itIdx,
                                          ) => {
                                            const itemCost = cost * qty;
                                            const itemRevenue = sell * qty;
                                            const itemProfit =
                                              itemRevenue - itemCost;
                                            const profitMargin =
                                              itemRevenue > 0
                                                ? (
                                                    (itemProfit / itemRevenue) *
                                                    100
                                                  ).toFixed(1)
                                                : "0";

                                            return (
                                              <tr
                                                key={itIdx}
                                                className="border-b border-slate-50 text-xs hover:bg-slate-50/50"
                                              >
                                                <td className="px-4 py-3 font-bold text-slate-800">
                                                  {item.productName ||
                                                    "Catalog Product"}
                                                  <span className="text-[10px] text-slate-400 font-mono ml-2">
                                                    ID:{" "}
                                                    {(
                                                      item.productId?.toString() ||
                                                      ""
                                                    ).slice(-6)}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-slate-700">
                                                  {qty} {unit}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-slate-500">
                                                  ৳{cost.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-800">
                                                  ৳{sell.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-slate-500">
                                                  ৳{itemCost.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-slate-900">
                                                  ৳
                                                  {itemRevenue.toLocaleString()}
                                                </td>
                                                <td
                                                  className={`px-4 py-3 text-right font-bold ${itemProfit < 0 ? "text-rose-600" : "text-emerald-600"}`}
                                                >
                                                  {itemProfit < 0 ? "-৳" : "+৳"}
                                                  {Math.abs(
                                                    itemProfit,
                                                  ).toLocaleString()}{" "}
                                                  <span className="text-[10px] text-slate-400 font-normal">
                                                    ({profitMargin}%)
                                                  </span>
                                                </td>
                                              </tr>
                                            );
                                          },
                                        )}
                                      </TableBody>
                                    </Table>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={10}
                          className="h-40 text-center text-slate-400 italic"
                        >
                          No sales orders found for this customer yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Order History Pagination */}
              <Pagination
                currentPage={page}
                totalPages={Math.ceil((orderMeta.total || 0) / pageSize) || 1}
                onPageChange={(p) => setPage(p)}
                totalItems={orderMeta.total}
                pageSize={pageSize}
                label="orders"
              />
            </div>
          ) : (
            /* Balance Adjustment Ledger History */
            <div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 border-b border-slate-100">
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Timestamp
                      </TableHead>
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Adjustment Type
                      </TableHead>
                      <TableHead className="px-6 py-4 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Amount (টাকা)
                      </TableHead>
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Payment Channel
                      </TableHead>
                      <TableHead className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Notes / Memo
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.length > 0 ? (
                      adjustments.map((adj) => {
                        const date = new Date(adj.createdAt);
                        const formattedDate = !isNaN(date.getTime())
                          ? format(date, "MMM d, yyyy h:mm a")
                          : "N/A";
                        return (
                          <TableRow
                            key={adj._id}
                            className="border-b border-slate-50 hover:bg-slate-50/50"
                          >
                            <TableCell className="px-6 py-4 text-xs text-slate-600 font-medium">
                              {formattedDate}
                            </TableCell>
                            <TableCell className="px-6 py-4">
                              {adj.type === "DUE_PAYMENT_RECEIVED" ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px] uppercase">
                                  Due Payment Received / বকেয়া গ্রহণ
                                </Badge>
                              ) : adj.type === "ADVANCE_DEPOSIT" ? (
                                <Badge className="bg-indigo-100 text-indigo-800 border-none font-bold text-[10px] uppercase">
                                  Advance Deposit / অগ্রিম জমা
                                </Badge>
                              ) : adj.type === "ADVANCE_WITHDRAWAL" ? (
                                <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px] uppercase">
                                  Advance Credit Reduced
                                </Badge>
                              ) : adj.type === "ADVANCE_APPLIED" ? (
                                <Badge className="bg-indigo-100 text-indigo-800 border-none font-bold text-[10px] uppercase">
                                  Advance Applied to Due
                                </Badge>
                              ) : adj.type === "DUE_DISCOUNT" ? (
                                <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px] uppercase">
                                  Due Discount / Waiver
                                </Badge>
                              ) : adj.type === "SALE_PAYMENT" ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px] uppercase">
                                  Sale Payment Received
                                </Badge>
                              ) : adj.type === "ADVANCE_APPLIED" ? (
                                <Badge className="bg-indigo-100 text-indigo-800 border-none font-bold text-[10px] uppercase">
                                  Advance Applied to Sale
                                </Badge>
                              ) : adj.type === "SALE_DUE_CREATED" ? (
                                <Badge className="bg-rose-100 text-rose-800 border-none font-bold text-[10px] uppercase">
                                  Sale Due Created
                                </Badge>
                              ) : adj.type === "SALE_OVERPAYMENT" ? (
                                <Badge className="bg-indigo-100 text-indigo-800 border-none font-bold text-[10px] uppercase">
                                  Sale Overpayment to Advance
                                </Badge>
                              ) : adj.type === "SALE_RECONCILIATION" ? (
                                <Badge className="bg-slate-100 text-slate-800 border-none font-bold text-[10px] uppercase">
                                  Sale Receipt Reconciled
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px] uppercase">
                                  Balance Adjustment / সমন্বয়
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-right font-black text-sm text-slate-900">
                              ৳{adj.amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-xs font-bold text-slate-700">
                              {adj.paymentMethod || "Cash"}
                            </TableCell>
                            <TableCell className="px-6 py-4 text-xs text-slate-500 italic max-w-[300px] truncate">
                              {adj.notes ||
                                (adj.referenceId
                                  ? `Order #${String(adj.referenceId).slice(-8).toUpperCase()}`
                                  : "—")}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="h-40 text-center text-slate-400 italic"
                        >
                          No balance or payment entries have been logged yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={adjustmentPage}
                totalPages={
                  Math.ceil(adjustmentMeta.total / adjustmentPageSize) || 1
                }
                onPageChange={setAdjustmentPage}
                totalItems={adjustmentMeta.total}
                pageSize={adjustmentPageSize}
                label="ledger entries"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: TK ADJUST / BALANCE ADJUSTMENT MODAL */}
      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-6">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <DialogTitle className="text-xl font-black text-slate-900 uppercase italic flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              Adjust Balance (টাকা সমন্বয়)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium">
              Record due payment received, deposit advance money, or reconcile{" "}
              {customer.name}&apos;s ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Current balances preview */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Current Due (বকেয়া)
                </p>
                <p className="text-base font-black text-rose-600">
                  ৳{dueBalance.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Advance Credit (অগ্রিম)
                </p>
                <p className="text-base font-black text-emerald-700">
                  ৳{advanceBalance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Adjustment Type */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Action Type <span className="text-rose-500">*</span>
              </label>
              <Select
                value={adjustType}
                onValueChange={(val: any) => setAdjustType(val)}
              >
                <SelectTrigger className="h-10 bg-white border-slate-200 text-xs font-bold text-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className="bg-white text-slate-900"
                  style={{ minWidth: "min(28rem, calc(100vw - 2rem))" }}
                >
                  <SelectItem
                    value="ADVANCE_APPLIED"
                    disabled={dueBalance <= 0 || advanceBalance <= 0}
                  >
                    Apply Advance to Outstanding Due
                  </SelectItem>
                  <SelectItem value="DUE_PAYMENT_RECEIVED">
                    Receive Due Payment (বকেয়া টাকা গ্রহণ)
                  </SelectItem>
                  <SelectItem value="ADVANCE_DEPOSIT">
                    Deposit Advance Tk (অগ্রিম টাকা জমা)
                  </SelectItem>
                  <SelectItem value="ADVANCE_WITHDRAWAL">
                    Reduce Advance Credit (অগ্রিম সমন্বয়)
                  </SelectItem>
                  <SelectItem value="DUE_DISCOUNT">
                    Waive / Discount Due (বকেয়া ছাড় / ডিসকাউন্ট)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Amount (৳ টাকা) <span className="text-rose-500">*</span>
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                max={
                  adjustType === "DUE_DISCOUNT"
                    ? dueBalance
                    : adjustType === "ADVANCE_WITHDRAWAL"
                      ? advanceBalance
                      : adjustType === "ADVANCE_APPLIED"
                        ? Math.min(dueBalance, advanceBalance)
                        : undefined
                }
                placeholder="e.g. 500"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="h-11 border-slate-200 text-base font-bold"
              />
              {adjustType === "DUE_PAYMENT_RECEIVED" && dueBalance > 0 && (
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] font-bold px-2 border-slate-200"
                    onClick={() => setAdjustAmount(dueBalance.toString())}
                  >
                    Pay Full Due (৳{dueBalance})
                  </Button>
                </div>
              )}
              {adjustType === "ADVANCE_WITHDRAWAL" && advanceBalance > 0 && (
                <div className="flex gap-2 mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] font-bold px-2 border-slate-200"
                    onClick={() => setAdjustAmount(advanceBalance.toString())}
                  >
                    Adjust Full Advance (৳{advanceBalance})
                  </Button>
                </div>
              )}
              {adjustType === "ADVANCE_APPLIED" &&
                dueBalance > 0 &&
                advanceBalance > 0 && (
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] font-bold px-2 border-slate-200"
                      onClick={() =>
                        setAdjustAmount(
                          Math.min(dueBalance, advanceBalance).toString(),
                        )
                      }
                    >
                      Apply Maximum (৳{Math.min(dueBalance, advanceBalance)})
                    </Button>
                  </div>
                )}
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Payment Channel
              </label>
              <Select value={adjustMethod} onValueChange={setAdjustMethod}>
                <SelectTrigger className="h-10 bg-white border-slate-200 text-xs font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="Cash">Cash (নগদ)</SelectItem>
                  <SelectItem value="bKash">bKash (বিকাশ)</SelectItem>
                  <SelectItem value="Nagad">Nagad (নগদ)</SelectItem>
                  <SelectItem value="Bank Transfer">
                    Bank Transfer (ব্যাংক)
                  </SelectItem>
                  <SelectItem value="Check">Check (চেক)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Memo / Notes */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Reference / Note (ঐচ্ছিক মন্তব্য)
              </label>
              <Input
                placeholder="e.g. Cleared pending invoice #INV-1234"
                value={adjustNotes}
                onChange={(e) => setAdjustNotes(e.target.value)}
                className="h-10 border-slate-200 text-xs"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-100 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAdjustOpen(false)}
              className="text-slate-600 font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdjustBalance}
              disabled={isSubmittingAdjust || !adjustAmount}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-6 shadow-md shadow-emerald-100"
            >
              {isSubmittingAdjust
                ? "Updating..."
                : "Confirm Balance Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: EDIT ORDER / RECEIPT ITEMS & PAYMENT MODAL */}
      {/* ("sels oder e recipt er item producty proice sob edit korte parbo ..cz recipt korar por jodi costomer oi kiso product na nete cay ...tai") */}
      <Dialog open={isEditOrderOpen} onOpenChange={setIsEditOrderOpen}>
        <DialogContent className="max-w-3xl bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <div className="flex justify-between items-center">
              <div>
                <DialogTitle className="text-xl font-black text-slate-900 uppercase italic flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Edit className="w-4 h-4" />
                  </div>
                  Edit Sales Order Receipt #
                  {((editingOrder?._id || editingOrder?.id)?.toString() || "")
                    .slice(-8)
                    .toUpperCase()}
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-1">
                  Customer changed mind? Adjust quantities, modify prices, or
                  remove rejected items. Stock and customer due balance will
                  automatically reconcile.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Add new product to order section */}
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
                onClick={handleAddProductToEditOrder}
                disabled={!selectedProductToAdd}
                className="w-full sm:w-auto h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Item
              </Button>
            </div>

            {/* Line items editor */}
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
                    <th className="px-4 py-3 text-center w-16">Remove</th>
                  </tr>
                </TableHeader>
                <TableBody>
                  {editOrderItems.map((item, idx) => (
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
                          title="Customer doesn't want this item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Financial Summary & Amount Paid Re-adjustment */}
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
                    {editOrderItems.length} Products
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
                      value={editOrderPaid}
                      onChange={(e) => setEditOrderPaid(e.target.value)}
                      className="h-10 text-right font-black text-base border-slate-300"
                    />
                  </div>
                </div>

                {/* Due / Advance feedback */}
                <div className="mt-3 flex justify-between items-center text-xs font-bold">
                  <span>Balance Impact:</span>
                  {editComputedDue > 0 ? (
                    <span className="text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                      Remaining Due (বকেয়া): ৳{editComputedDue.toLocaleString()}{" "}
                      (Will be added to customer due)
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
              onClick={() => setIsEditOrderOpen(false)}
              className="text-slate-600 font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveOrderChanges}
              disabled={isSavingOrder}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-6 shadow-md shadow-indigo-100"
            >
              {isSavingOrder
                ? "Updating Inventory & Ledger..."
                : "Save & Sync Order Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentStatusBadge({
  status,
  dueAmount,
  amountPaid,
  totalAmount,
}: {
  status?: string;
  dueAmount: number;
  amountPaid: number;
  totalAmount: number;
}) {
  if (dueAmount > 0) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px] uppercase">
        Due / বকেয়া
      </Badge>
    );
  }
  if (amountPaid > totalAmount) {
    return (
      <Badge className="bg-purple-100 text-purple-800 border-none font-bold text-[10px] uppercase">
        Overpaid / অগ্রিম
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-100 text-emerald-800 border-none font-bold text-[10px] uppercase">
      Paid / পরিশোধিত
    </Badge>
  );
}
