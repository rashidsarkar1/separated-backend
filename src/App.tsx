/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { Dashboard } from "./pages/Dashboard";
import { Inventory } from "./pages/Inventory";
import { Orders } from "./pages/Orders";
import { QuickSell } from "./pages/QuickSell";
import { CustomerAnalytics } from "./pages/CustomerAnalytics";
import { ProductAnalytics } from "./pages/ProductAnalytics";
import { Reports } from "./pages/Reports";
import { Categories } from "./pages/Categories";
import { Customers } from "./pages/Customers";
import { Dealers } from "./pages/Dealers";
import { ProductDetailAnalyticsPage } from "./pages/ProductDetailAnalytics";
import { DealerSupplyHistoryPage } from "./pages/DealerSupplyHistory";
import { DealerReceiptsPage } from "./pages/DealerReceipts";
import { OrderDetailView } from "./pages/OrderDetailView";
import { AddProduct } from "./pages/AddProduct";
import { EditProduct } from "./pages/EditProduct";
import { ProductDetails } from "./pages/ProductDetails";
import { ProductReceipts } from "./pages/ProductReceipts";
import { CustomerDetails } from "./pages/CustomerDetails";
import { ModifyOrderReceipt } from "./pages/ModifyOrderReceipt";
import { Toaster } from "./components/ui/sonner";
import { Button } from "./components/ui/button";
import {
  Users,
  Search,
  Package,
  AlertCircle,
  ArrowLeft,
  Receipt as ReceiptIcon,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./components/ui/card";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "./components/ui/dialog";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import { cn } from "./lib/utils";
import { Separator } from "./components/ui/separator";

import { apiService } from "./services/apiService";
import { useAppSelector, useAppDispatch } from "./store/hooks";
import { fetchTransactions } from "./store/slices/transactionSlice";
import {
  fetchSettings,
  updateSettingsThunk,
} from "./store/slices/settingsSlice";


const pathToTab = (pathname: string): string => {
  const clean = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (clean === "/quicksell" || clean === "/qucksell" || clean === "/quick-sell") {
    return "quick-sell";
  }
  if (clean === "/inventory") return "inventory";
  if (clean === "/categories") return "categories";
  if (clean === "/sales-orders" || clean === "/orders") return "sales-orders";
  if (clean === "/customers") return "customers";
  if (clean === "/dealers") return "dealers";
  if (clean === "/dealer-receipts") return "dealer-receipts";
  if (clean === "/customer-analytics") return "customer-analytics";
  if (clean === "/product-analytics") return "product-analytics";
  if (clean === "/reports") return "reports";
  if (clean === "/settings") return "settings";
  return "dashboard";
};

const tabToPath = (tab: string): string => {
  if (tab === "quick-sell") return "/quicksell";
  if (tab === "dashboard") return "/";
  return `/${tab}`;
};

export default function App() {
  const [user, setUser] = useState<any>({ username: "admin", role: "admin" });
  const [activeTab, setActiveTabState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return pathToTab(window.location.pathname);
    }
    return "dashboard";
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    if (typeof window !== "undefined") {
      const targetPath = tabToPath(tab);
      if (window.location.pathname !== targetPath) {
        window.history.pushState(null, "", targetPath);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      setActiveTabState(pathToTab(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const clean = window.location.pathname.toLowerCase().replace(/\/+$/, "");
      if (clean === "/qucksell" || clean === "/quick-sell") {
        window.history.replaceState(null, "", "/quicksell");
      }
    }
  }, []);
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null,
  );
  const [selectedDealerId, setSelectedDealerId] = useState<string | null>(null);
  const [selectedOrderForDetail, setSelectedOrderForDetail] =
    useState<any>(null);
  const [selectedOrderForEdit, setSelectedOrderForEdit] = useState<any>(null);

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            onNavigateToSell={() => setActiveTab("quick-sell")}
            onNavigateToReports={() => setActiveTab("reports")}
          />
        );
      case "quick-sell":
        return (
          <QuickSell
            onFinalizeSale={() => {}} // Redux handles state refresh
          />
        );
      case "inventory":
        return (
          <Inventory
            onNavigateToProductAnalytics={(id) => {
              setSelectedProductId(id);
              setActiveTab("product-detail-analytics");
            }}
            onNavigateToProductDetails={(id) => {
              setSelectedProductId(id);
              setActiveTab("product-details");
            }}
            onNavigateToAddProduct={() => setActiveTab("add-product")}
            onNavigateToEditProduct={(id) => {
              setSelectedProductId(id);
              setActiveTab("edit-product");
            }}
          />
        );
      case "add-product":
        return (
          <AddProduct
            onBack={() => setActiveTab("inventory")}
            onCreated={(newId) => {
              setSelectedProductId(newId);
              setActiveTab("product-details");
            }}
          />
        );
      case "edit-product":
        return (
          <EditProduct
            productId={selectedProductId}
            onBack={() => setActiveTab("inventory")}
            onUpdated={() => setActiveTab("product-details")}
          />
        );
      case "product-details":
        return (
          <ProductDetails
            productId={selectedProductId}
            onBack={() => setActiveTab("inventory")}
            onNavigateToEdit={(id) => {
              setSelectedProductId(id);
              setActiveTab("edit-product");
            }}
            onSelectProduct={(id) => setSelectedProductId(id)}
            onNavigateToSell={() => setActiveTab("quick-sell")}
            onNavigateToCustomer={(cId) => {
              setSelectedCustomerId(cId);
              setActiveTab("customer-details");
            }}
            onViewOrderDetail={(order) => {
              setSelectedOrderForDetail(order);
              setActiveTab("sales-order-detail");
            }}
            onNavigateToReceipts={(id) => {
              setSelectedProductId(id);
              setActiveTab("product-receipts");
            }}
          />
        );
      case "product-receipts":
        return (
          <ProductReceipts
            productId={selectedProductId}
            onBack={() => setActiveTab("product-details")}
          />
        );
      case "dealers":
        return (
          <Dealers
            onSelectDealer={(id) => {
              setSelectedDealerId(id);
              setActiveTab("dealer-supply-history");
            }}
            onViewDealerReceipts={(id) => {
              setSelectedDealerId(id);
              setActiveTab("dealer-receipts");
            }}
          />
        );
      case "sales-orders":
        return (
          <Orders
            onNavigateToSell={() => setActiveTab("quick-sell")}
            onViewOrderDetail={(order) => {
              setSelectedOrderForDetail(order);
              setActiveTab("sales-order-detail");
            }}
            onEditOrder={(order) => {
              setSelectedOrderForEdit(order);
              setActiveTab("modify-order-receipt");
            }}
            onSelectCustomer={(cId) => {
              setSelectedCustomerId(cId);
              setActiveTab("customer-details");
            }}
          />
        );
      case "sales-order-detail":
        return (
          <OrderDetailView
            order={selectedOrderForDetail}
            onBack={() => setActiveTab("sales-orders")}
            onNavigateToEditOrder={(order) => {
              setSelectedOrderForEdit(order);
              setActiveTab("modify-order-receipt");
            }}
            onSelectCustomer={(cId) => {
              setSelectedCustomerId(cId);
              setActiveTab("customer-details");
            }}
          />
        );
      case "modify-order-receipt":
      case "edit-sales-order":
        return (
          <ModifyOrderReceipt
            initialOrder={selectedOrderForEdit || selectedOrderForDetail}
            orderId={
              selectedOrderForEdit?._id ||
              selectedOrderForEdit?.id ||
              selectedOrderForDetail?._id ||
              selectedOrderForDetail?.id
            }
            onBack={() => {
              if (selectedOrderForDetail) {
                setActiveTab("sales-order-detail");
              } else {
                setActiveTab("sales-orders");
              }
            }}
            onOrderUpdated={(updated) => {
              setSelectedOrderForDetail(updated);
              setSelectedOrderForEdit(updated);
              setActiveTab("sales-order-detail");
            }}
            onSelectCustomer={(cId) => {
              setSelectedCustomerId(cId);
              setActiveTab("customer-details");
            }}
          />
        );
      case "customer-analytics":
        return (
          <CustomerAnalytics
            onSelectCustomer={(cId) => {
              setSelectedCustomerId(cId);
              setActiveTab("customer-details");
            }}
          />
        );
      case "product-analytics":
        return (
          <ProductAnalytics
            onSelectProduct={(id) => {
              setSelectedProductId(id);
              setActiveTab("product-details");
            }}
          />
        );
      case "product-detail-analytics":
        return (
          <ProductDetailAnalyticsPage
            productId={selectedProductId}
            onBack={() => setActiveTab("inventory")}
          />
        );
      case "dealer-supply-history":
        return (
          <DealerSupplyHistoryPage
            dealerId={selectedDealerId}
            onBack={() => setActiveTab("dealers")}
          />
        );
      case "dealer-receipts":
        return (
          <DealerReceiptsPage
            dealerId={selectedDealerId}
            onBack={() => setActiveTab("dealers")}
          />
        );
      case "customers":
        return (
          <Customers
            onSelectCustomer={(id) => {
              setSelectedCustomerId(id);
              setActiveTab("customer-details");
            }}
          />
        );
      case "customer-details":
      case "customer-receipts":
        return (
          <CustomerDetails
            customerId={selectedCustomerId}
            onBack={() => setActiveTab("customers")}
            onNavigateToSell={(cId) => {
              if (cId) setSelectedCustomerId(cId);
              setActiveTab("quick-sell");
            }}
            onNavigateToEditOrder={(order) => {
              setSelectedOrderForEdit(order);
              setActiveTab("modify-order-receipt");
            }}
          />
        );
      case "reports":
        return <Reports />;
      case "categories":
        return <Categories />;
      case "settings":
        return <SettingsPage />;
      default:
        return (
          <Dashboard
            onNavigateToSell={() => setActiveTab("quick-sell")}
            onNavigateToReports={() => setActiveTab("reports")}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:relative lg:flex transition-transform duration-300 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSidebarOpen(false);
          }}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
      </div>

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <Header
          activeTab={activeTab}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto scrollbar-hide bg-slate-50 relative pb-20 lg:pb-0">
          {renderContent()}
        </main>
      </div>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function SettingsPage() {
  const dispatch = useAppDispatch();
  const { config, loading } = useAppSelector((state) => state.settings);
  const [formData, setFormData] = useState({
    shopName: "",
    address: "",
    phone: "",
    secondaryPhone: "",
    email: "",
    footerText: "",
  });

  useEffect(() => {
    dispatch(fetchSettings());
  }, [dispatch]);

  useEffect(() => {
    if (config) {
      setFormData({
        shopName: config.shopName || "",
        address: config.address || "",
        phone: config.phone || "",
        secondaryPhone: config.secondaryPhone || "",
        email: config.email || "",
        footerText: config.footerText || "",
      });
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await dispatch(updateSettingsThunk(formData)).unwrap();
      toast.success("Settings Saved", {
        description: "Global configuration updated successfully.",
      });
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  if (loading && !config) {
    return (
      <div className="p-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest text-[10px]">
        Accessing Cloud Registry...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-10 mb-20">
      <div className="space-y-2">
        <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
          System Configuration
        </h2>
        <p className="text-slate-500 font-medium italic">
          Define global identity and invoice parameters for the distribution
          network.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="border-slate-200 shadow-xl rounded-3xl overflow-hidden border-t-4 border-t-indigo-600 col-span-full">
          <CardHeader className="bg-white border-b border-slate-100">
            <CardTitle className="text-slate-800 font-black uppercase text-sm italic tracking-tight">
              Business Identity (Invoice Header)
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase text-slate-400">
              This information will appear on all generated PDFs and receipts.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-6 pt-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Shop/Company Name
              </label>
              <Input
                value={formData.shopName}
                onChange={(e) =>
                  setFormData({ ...formData, shopName: e.target.value })
                }
                className="h-12 bg-slate-50 border-slate-200 font-bold focus:bg-white"
                placeholder="Wholesale OS"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Official Address
              </label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="h-12 bg-slate-50 border-slate-200 font-bold focus:bg-white"
                placeholder="123 Distribution Blvd"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Secure Line (Phone)
              </label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="h-12 bg-slate-50 border-slate-200 font-bold focus:bg-white"
                placeholder="+8801XXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Secondary Phone (Cash Memo)
              </label>
              <Input
                value={formData.secondaryPhone}
                onChange={(e) =>
                  setFormData({ ...formData, secondaryPhone: e.target.value })
                }
                className="h-12 bg-slate-50 border-slate-200 font-bold focus:bg-white"
                placeholder="+8801XXXXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Contact Email
              </label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="h-12 bg-slate-50 border-slate-200 font-bold focus:bg-white"
                placeholder="support@wholesaleos.com"
              />
            </div>
            <div className="space-y-2 col-span-full">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Invoice Footer (Terms/Thanks)
              </label>
              <Input
                value={formData.footerText}
                onChange={(e) =>
                  setFormData({ ...formData, footerText: e.target.value })
                }
                className="h-12 bg-slate-50 border-slate-200 font-bold focus:bg-white"
                placeholder="Goods once sold are not returnable. Thank you!"
              />
            </div>
          </CardContent>
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
            <Button
              onClick={handleSave}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest h-12 px-10 shadow-lg shadow-indigo-100 italic"
            >
              Update Global Parameters
            </Button>
          </div>
        </Card>

        <Card className="border-slate-200 shadow-lg rounded-2xl overflow-hidden opacity-60 grayscale cursor-not-allowed">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase italic">
              Printer Integration
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[10px] font-bold text-slate-400 text-center py-8">
            DIRECT THERMAL PRINTER PROTOCOL
            <br />
            COMING SOON
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-lg rounded-2xl overflow-hidden opacity-60 grayscale cursor-not-allowed">
          <CardHeader>
            <CardTitle className="text-sm font-black uppercase italic">
              Backup Registry
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[10px] font-bold text-slate-400 text-center py-8">
            SECURE CLOUD BACKUP & SYNC
            <br />
            ACTIVE BY DEFAULT
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
