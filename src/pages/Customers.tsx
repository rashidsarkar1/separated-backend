import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  History,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Mail,
  Phone,
  MapPin,
  FileJson,
  FileSpreadsheet,
  Edit,
  Trash2,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "../components/ui/dropdown-menu";
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
  fetchCustomers,
  createCustomer,
  updateCustomerThunk,
  deleteCustomerThunk,
} from "../store/slices/customerSlice";
import { Pagination } from "../components/common/Pagination";
import { DateRangeSelect } from "../components/common/DateRangeSelect";

export function Customers({
  onSelectCustomer,
}: {
  onSelectCustomer: (id: string) => void;
}) {
  const dispatch = useAppDispatch();
  const { customers, loading, total } = useAppSelector(
    (state) => state.customers,
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [range, setRange] = useState("all");
  const [limit] = useState(10);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  useEffect(() => {
    dispatch(fetchCustomers({ search: searchTerm, page, limit, range }));
  }, [dispatch, searchTerm, page, limit, range]);

  const handleEdit = (customer: any) => {
    setSelectedCustomer(customer);
    setEditFormData({
      name: customer.name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editFormData.name || !editFormData.phone) {
      toast.error("Missing Requirements", {
        description: "Name and Phone are mandatory.",
      });
      return;
    }

    try {
      await dispatch(
        updateCustomerThunk({
          id: selectedCustomer._id || selectedCustomer.id,
          customerData: editFormData,
        }),
      ).unwrap();
      toast.success("Merchant Updated", {
        description: "Changes saved to directory.",
      });
      setIsEditOpen(false);
    } catch (err) {
      toast.error("Failed to update merchant");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (
      window.confirm(
        `Are you sure you want to remove ${name}? This will soft-delete their record.`,
      )
    ) {
      try {
        await dispatch(deleteCustomerThunk(id)).unwrap();
        toast.success("Merchant Removed", {
          description: `${name} has been archived.`,
        });
      } catch (err) {
        toast.error("Failed to remove merchant");
      }
    }
  };

  const exportToJson = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(customers, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "customers_export.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    toast.success("JSON Export Initialized");
  };

  const exportToCsv = () => {
    const headers = ["Name", "Email", "Phone", "Address", "Total Spent"];
    const rows = customers.map((c) => [
      c.name,
      c.email || "N/A",
      c.phone,
      c.address || "N/A",
      c.totalSpent || 0,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "customers_export.csv");
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("CSV Export Initialized");
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone) {
      toast.error("Missing Requirements", {
        description: "Name and Phone are mandatory.",
      });
      return;
    }

    try {
      await dispatch(createCustomer(formData)).unwrap();
      toast.success("Customer Registered", {
        description: `${formData.name} added to directory.`,
      });
      setIsAddOpen(false);
      setFormData({ name: "", email: "", phone: "", address: "" });
      // Reload is handled by slice or manual refetch
      dispatch(fetchCustomers({ search: searchTerm, page, limit }));
    } catch (err) {
      toast.error("Failed to create customer");
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-800 uppercase italic">
            Customer Directory
          </h2>
          <p className="text-sm text-slate-500 font-medium italic">
            Retailers and business customers in your network.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={exportToCsv}
            className="hidden md:flex gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 uppercase font-black text-[10px] tracking-widest px-4 h-10 italic"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            CSV
          </Button>
          <Button
            variant="outline"
            onClick={exportToJson}
            className="hidden md:flex gap-2 border-slate-200 text-slate-600 hover:bg-slate-50 uppercase font-black text-[10px] tracking-widest px-4 h-10 italic"
          >
            <FileJson className="w-3.5 h-3.5" />
            JSON
          </Button>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger
              render={
                <Button className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 uppercase font-black text-[10px] tracking-widest px-6 italic">
                  <Plus className="w-4 h-4" />
                  Register Merchant
                </Button>
              }
            />
            <DialogContent className="sm:max-w-md bg-white border-2 border-slate-100 shadow-2xl rounded-3xl">
              <DialogHeader className="pb-4 border-b border-slate-50">
                <DialogTitle className="text-2xl font-black text-slate-900 italic uppercase flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                    <Users className="w-6 h-6" />
                  </div>
                  New Account
                </DialogTitle>
                <DialogDescription className="font-medium text-slate-500 mt-1">
                  Establish a new trade relationship in the CRM.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                    Full Name / Merchant
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Rahman Enterprises"
                    className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                      Secure Email
                    </label>
                    <Input
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="rahman@retail.com"
                      className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                      Direct Phone
                    </label>
                    <Input
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="+880 XXXX-XXXXXX"
                      className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                    Billing Location
                  </label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Gazipur, Dhaka"
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
                  Provision Entry
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-white border-b border-slate-100 pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-slate-800 text-lg font-black uppercase gap-2 italic flex items-center">
                Merchant Ledger
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium italic">
                Active merchant entities across the network.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, phone or email..."
                  className="pl-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-xl"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
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
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 italic">
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
                    Customer Name
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
                    Contact Information
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
                    Billing Address
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
                    Balance Status (হিসাব)
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-black text-slate-500 uppercase tracking-widest leading-none">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {loading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="h-60 text-center text-slate-400 italic"
                    >
                      Establishing secure CRM connection...
                    </td>
                  </tr>
                ) : customers.length > 0 ? (
                  customers.map((customer) => {
                    const due = customer.dueBalance || 0;
                    const advance = customer.advanceBalance || 0;
                    const cId = customer._id || customer.id;

                    return (
                      <tr
                        key={cId}
                        className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          <button
                            onClick={() => onSelectCustomer(cId)}
                            className="text-left group-hover:text-indigo-600 transition-colors"
                          >
                            <div className="font-black text-slate-800 uppercase italic tracking-tight group-hover:underline underline-offset-2">
                              {customer.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                              ID: {cId?.toString().slice(-6) || "N/A"}
                            </div>
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-tight">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {customer.email || "N/A"}
                            </div>
                            <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-tight">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {customer.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium max-w-[200px] truncate italic">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-slate-300" />
                            {customer.address || "Direct Pickup"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {due > 0 ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="text-[10px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded uppercase tracking-wider">
                                ৳{due.toLocaleString()} Due (বকেয়া)
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold">
                                Koto tk ami pai
                              </span>
                            </div>
                          ) : advance > 0 ? (
                            <div className="inline-flex flex-col gap-0.5">
                              <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase tracking-wider">
                                ৳{advance.toLocaleString()} Advance (অগ্রিম)
                              </span>
                              <span className="text-[9px] text-slate-400 font-bold">
                                Credit on hold
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">
                              Clear (পরিশোধিত)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-900 font-black text-[10px] uppercase tracking-wider h-8"
                              onClick={() => onSelectCustomer(cId)}
                            >
                              Details & Ledger
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="w-4 h-4 text-slate-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="bg-white border-slate-100 rounded-xl shadow-xl p-1 w-40"
                              >
                                <DropdownMenuItem
                                  className="gap-2 font-bold text-slate-600 focus:text-indigo-600 focus:bg-indigo-50 rounded-lg cursor-pointer text-[10px] uppercase tracking-widest italic"
                                  onClick={() => handleEdit(customer)}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  Edit Profile
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2 font-bold text-rose-500 focus:text-rose-600 focus:bg-rose-50 rounded-lg cursor-pointer text-[10px] uppercase tracking-widest italic"
                                  onClick={() =>
                                    handleDelete(cId, customer.name)
                                  }
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Remove Account
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="h-48 text-center text-slate-400 italic font-medium uppercase text-[10px] tracking-widest"
                    >
                      <div className="flex flex-col items-center gap-2 opacity-50">
                        <Users className="w-10 h-10 text-slate-200" />
                        <span>No merchant credentials found</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages || 1}
            onPageChange={setPage}
            totalItems={total}
            pageSize={limit}
            label="merchants"
          />
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md bg-white border-2 border-slate-100 shadow-2xl rounded-3xl">
          <DialogHeader className="pb-4 border-b border-slate-50">
            <DialogTitle className="text-2xl font-black text-slate-900 italic uppercase flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                <Edit className="w-6 h-6" />
              </div>
              Modify Account
            </DialogTitle>
            <DialogDescription className="font-medium text-slate-500 mt-1">
              Update existing merchant credentials and billing data.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-5 py-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                Full Name / Merchant
              </label>
              <Input
                value={editFormData.name}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, name: e.target.value })
                }
                className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Secure Email
                </label>
                <Input
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, email: e.target.value })
                  }
                  className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                  Direct Phone
                </label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                  className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                Billing Location
              </label>
              <Input
                value={editFormData.address}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, address: e.target.value })
                }
                className="h-11 border-slate-200 bg-slate-50/50 focus:bg-white"
              />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t border-slate-50">
            <Button
              variant="ghost"
              onClick={() => setIsEditOpen(false)}
              className="text-slate-500 font-bold uppercase text-[10px] tracking-widest italic"
            >
              Dismiss
            </Button>
            <Button
              onClick={handleUpdate}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black uppercase text-[10px] tracking-widest px-8 shadow-lg shadow-amber-100 italic"
            >
              Sync Updates
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
