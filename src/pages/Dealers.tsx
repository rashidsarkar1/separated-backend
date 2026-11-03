import React, { useState, useEffect } from "react";
import {
  Store,
  Users,
  Plus,
  Mail,
  Phone,
  MapPin,
  Search,
  Globe,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
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
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchDealers,
  createDealer,
  updateDealer,
} from "../store/slices/dealerSlice";

interface DealersProps {
  onSelectDealer?: (id: string) => void;
  onViewDealerReceipts?: (id: string) => void;
}

export function Dealers({
  onSelectDealer,
  onViewDealerReceipts,
}: DealersProps) {
  const dispatch = useAppDispatch();
  const { dealers, loading, meta, error } = useAppSelector((state) => state.dealers);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDealer, setEditingDealer] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [page, setPage] = useState(1);
  const [range, setRange] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const pageSize = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchTerm.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    dispatch(fetchDealers({ page, limit: pageSize, range, search, sortBy, order }));
  }, [dispatch, page, range, search, sortBy, order]);

  const resetForm = () => {
    setFormData({ name: "", email: "", phone: "", address: "" });
    setEditingDealer(null);
  };

  const openEdit = (dealer: any) => {
    setEditingDealer(dealer);
    setFormData({
      name: dealer.name || "",
      email: dealer.contactInfo?.email || "",
      phone: dealer.contactInfo?.phone || "",
      address: dealer.address || "",
    });
    setIsAddOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      toast.error("Missing Name", { description: "Dealer name is required." });
      return;
    }

    try {
      const dealerData = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        contactInfo: {
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        },
      };
      if (editingDealer) {
        await dispatch(
          updateDealer({
            id: String(editingDealer._id || editingDealer.id),
            dealerData,
          }),
        ).unwrap();
        toast.success("Dealer updated", { description: dealerData.name });
      } else {
        await dispatch(createDealer(dealerData)).unwrap();
        toast.success("Dealer registered", {
          description: `${dealerData.name} added to supply network.`,
        });
      }
      setIsAddOpen(false);
      resetForm();
      dispatch(fetchDealers({ page, limit: pageSize, range, search, sortBy, order }));
    } catch (err: any) {
      toast.error(editingDealer ? "Failed to update dealer" : "Failed to register dealer", {
        description: err?.message,
      });
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic">
            Wholesale Supply Network
          </h2>
          <p className="text-sm text-slate-500 font-medium italic">
            Manage your primary procurement sources and logistics partners.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setPage(1);
              }}
              placeholder="Search dealer, phone, email..."
              className="h-10 w-full pl-9 sm:w-64"
            />
          </div>
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
            aria-label="Sort dealers"
          >
            <option value="createdAt">Newest</option>
            <option value="name">Name</option>
          </select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setOrder((current) => current === "asc" ? "desc" : "asc")}
            title={order === "asc" ? "Ascending" : "Descending"}
          >
            {order === "asc" ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <DateRangeSelect
            value={range}
            onChange={(nextRange) => {
              setRange(nextRange);
              setPage(1);
            }}
            className="h-10 w-full bg-white sm:w-36"
          />
        </div>
        <Dialog
          open={isAddOpen}
          onOpenChange={(open) => {
            setIsAddOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger
            render={
              <Button onClick={resetForm} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 uppercase font-black text-[10px] tracking-widest px-6 italic">
                <Plus className="w-4 h-4" />
                Onboard Supplier
              </Button>
            }
          />
          <DialogContent className="sm:max-w-md bg-white border-2 border-slate-100 shadow-2xl rounded-3xl">
            <DialogHeader className="pb-4 border-b border-slate-50">
              <DialogTitle className="text-2xl font-black text-slate-900 italic uppercase flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <Store className="w-6 h-6" />
                </div>
                {editingDealer ? "Edit Dealer" : "New Dealer Entry"}
              </DialogTitle>
              <DialogDescription className="font-medium text-slate-500 mt-1">
                {editingDealer
                  ? "Update dealer contact and address details."
                  : "Register a new wholesale entity for procurement tracking."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Business Identity
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Global Distribution Ltd."
                  className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                    Corporate Email
                  </label>
                  <Input
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="ops@globaldist.com"
                    className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                    Logistics Phone
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+880 1XXX-XXXXXX"
                    className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Distribution Headquarters
                </label>
                <Input
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder="Dhaka, Bangladesh"
                  className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>
            <DialogFooter className="pt-4 border-t border-slate-50">
              <Button
                variant="ghost"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-500 font-bold uppercase text-[10px] tracking-widest italic"
              >
                Abort
              </Button>
              <Button
                onClick={handleSubmit}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-indigo-100 italic"
              >
                {editingDealer ? "Save Changes" : "Authorize Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          <div className="col-span-full h-64 flex items-center justify-center text-slate-400 font-bold uppercase text-xs animate-pulse">
            Scanning Grid Supply Nodes...
          </div>
        ) : error ? (
          <div className="col-span-full py-12 text-center text-sm text-rose-600">
            Could not load dealers: {error}
          </div>
        ) : dealers.length > 0 ? (
          <>
            {dealers.map((dealer) => (
              <Card
                key={dealer._id || dealer.id}
                className="border-slate-200 shadow-sm rounded-2xl overflow-hidden hover:border-indigo-300 transition-all group relative bg-white"
              >
                <CardHeader className="bg-white border-b border-slate-100 pb-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg font-black text-slate-800 uppercase italic tracking-tight">
                        {dealer.name}
                      </CardTitle>
                      <CardDescription className="text-slate-500 font-medium italic line-clamp-1">
                        {dealer.address}
                      </CardDescription>
                    </div>
                    <div className="bg-slate-50 text-slate-400 p-2 rounded-xl border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all group-hover:shadow-lg group-hover:shadow-indigo-200">
                      <Globe className="w-4 h-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6 relative z-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                          Contact Ledger
                        </p>
                        <p className="text-sm font-bold text-slate-700 mt-1">
                          {dealer.contactInfo?.email || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                          Secure Line
                        </p>
                        <p className="text-sm font-bold text-slate-700 mt-1">
                          {dealer.contactInfo?.phone || "N/A"}
                        </p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-slate-50 flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          onSelectDealer?.(dealer._id || dealer.id)
                        }
                        className="flex-1 h-10 font-black text-[10px] uppercase tracking-widest bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all italic shadow-none"
                      >
                        Supply Logs
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          onViewDealerReceipts?.(dealer._id || dealer.id)
                        }
                        className="flex-1 h-10 font-black text-[10px] uppercase tracking-widest bg-white border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <ImageIcon className="mr-1.5 h-4 w-4" />
                        Receipts
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => openEdit(dealer)}
                        title={`Edit ${dealer.name}`}
                        className="h-10 w-10 shrink-0"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 h-10 font-black text-[10px] uppercase tracking-widest bg-slate-50 border-slate-200 text-slate-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all italic shadow-none"
                      >
                        Procurement
                      </Button>
                    </div>
                  </div>
                </CardContent>
                {/* Aesthetic background accent */}
                <div className="absolute top-0 right-0 p-4 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity">
                  <Store className="w-32 h-32" />
                </div>
              </Card>
            ))}
            {meta && meta.total > 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm mt-4">
                <Pagination
                  currentPage={page}
                  totalPages={Math.max(1, Math.ceil(meta.total / pageSize))}
                  onPageChange={setPage}
                  totalItems={meta.total}
                  pageSize={pageSize}
                  label="wholesale dealers"
                />
              </div>
            )}
          </>
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-300 opacity-50">
            <Store className="w-16 h-16 mb-4" />
            <p className="font-black uppercase text-[10px] tracking-[0.3em]">
              No Supply Nodes Active
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
