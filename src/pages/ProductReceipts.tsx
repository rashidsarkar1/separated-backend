import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Filter,
  ImageIcon,
  Search,
  Trash2,
  X,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { DealerReceiptUploader } from "../components/common/DealerReceiptUploader";
import { Pagination } from "../components/common/Pagination";
import { useAppSelector } from "../store/hooks";
import { apiService } from "../services/apiService";
import {
  DealerReceipt,
  deleteDealerReceipt,
} from "../utils/receiptStore";

interface ProductReceiptsProps {
  productId: string | null;
  onBack: () => void;
}

export function ProductReceipts({ productId, onBack }: ProductReceiptsProps) {
  const { products } = useAppSelector((state) => state.inventory);
  const { dealers } = useAppSelector((state) => state.dealers);
  const product = products.find(
    (item) => item._id === productId || item.id === productId,
  );
  const dealer = dealers.find(
    (item) => String(item._id || item.id) === String(product?.dealerId || ""),
  );

  const [receipts, setReceipts] = useState<DealerReceipt[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [preview, setPreview] = useState<DealerReceipt | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadReceipts = async () => {
    if (!productId) {
      setReceipts([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await apiService.getDealerReceipts({
        productId,
        page,
        limit: pageSize,
        search,
        range,
        order: sort === "newest" ? "desc" : "asc",
      });
      setReceipts(Array.isArray(response?.data) ? response.data : []);
      setTotal(response?.meta?.total || 0);
    } catch (error: any) {
      setReceipts([]);
      setTotal(0);
      toast.error("Could not load dealer receipt images", {
        description: error?.response?.data?.message || error?.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [productId, page, search, range, sort]);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this dealer receipt image?");
    if (!confirmed) return;
    await deleteDealerReceipt(id);
    setPreview((current) => (current?.id === id ? null : current));
    await loadReceipts();
    toast.success("Receipt image deleted");
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto pb-24">
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
              Dealer Receipt Images
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {product?.name || "Product"} · {total} saved in local
              folder
            </p>
          </div>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl bg-white">
        <CardContent className="p-5">
          <DealerReceiptUploader
            productId={productId || undefined}
            productName={product?.name}
            dealerId={product?.dealerId}
            dealerName={dealer?.name}
            onSaved={loadReceipts}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by note, dealer, or date..."
            className="pl-9 h-11 border-slate-200 rounded-xl bg-white"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:w-auto">
          <Select
            value={range}
            onValueChange={(value) => {
              setRange(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white">
              <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dates</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(value) => {
              setSort(value as "newest" | "oldest");
              setPage(1);
            }}
          >
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white col-span-2 sm:col-span-1">
              <Filter className="w-3.5 h-3.5 mr-1 text-slate-400" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm font-medium">
          Loading receipt images...
        </div>
      ) : receipts.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <ImageIcon className="w-12 h-12 mx-auto text-slate-200" />
          <p className="text-sm font-bold text-slate-600">
            No receipt images match these filters
          </p>
          <p className="text-xs text-slate-400">
            Upload a dealer receipt with camera or gallery after each purchase.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {receipts.map((receipt) => (
            <Card
              key={receipt.id}
              className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => setPreview(receipt)}
                className="block w-full aspect-[4/3] bg-slate-100 overflow-hidden"
              >
                <img
                  src={receipt.imageData}
                  alt={receipt.note || "Dealer receipt"}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                />
              </button>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-black text-slate-800">
                      {format(
                        new Date(receipt.createdAt),
                        "dd MMM yyyy, h:mm a",
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {receipt.dealerName || "Dealer receipt"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(receipt.id)}
                    className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                    title="Delete image"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {receipt.note && (
                  <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5">
                    {receipt.note}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={Math.max(1, Math.ceil(total / pageSize))}
        onPageChange={setPage}
        totalItems={total}
        pageSize={pageSize}
        label="receipt images"
      />

      {preview && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <p className="text-sm font-black text-slate-900">
                  {format(new Date(preview.createdAt), "dd MMM yyyy, h:mm a")}
                </p>
                <p className="text-[11px] text-slate-500">
                  {preview.dealerName || "Dealer receipt"}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className="text-rose-600 hover:bg-rose-50"
                  onClick={() => handleDelete(preview.id)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPreview(null)}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>
            <img
              src={preview.imageData}
              alt="Dealer receipt preview"
              className="w-full max-h-[70vh] object-contain bg-slate-950"
            />
            {preview.note && (
              <p className="px-4 py-3 text-sm text-slate-600 border-t border-slate-100">
                {preview.note}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
