import React, { useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, ImageIcon, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Pagination } from "../components/common/Pagination";
import { DateRangeSelect } from "../components/common/DateRangeSelect";
import { DealerReceiptUploader } from "../components/common/DealerReceiptUploader";
import { useAppSelector } from "../store/hooks";
import { apiService } from "../services/apiService";
import { DealerReceipt, deleteDealerReceipt } from "../utils/receiptStore";

interface DealerReceiptsPageProps {
  dealerId: string | null;
  onBack: () => void;
}

const pageSize = 10;

export function DealerReceiptsPage({ dealerId, onBack }: DealerReceiptsPageProps) {
  const { dealers } = useAppSelector((state) => state.dealers);
  const dealer = dealers.find(
    (item) => String(item._id || item.id) === String(dealerId || ""),
  );
  const [receipts, setReceipts] = useState<DealerReceipt[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: pageSize, total: 0 });
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState("all");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!dealerId) {
      setReceipts([]);
      setMeta({ page: 1, limit: pageSize, total: 0 });
      setError("Select a dealer to view its receipts.");
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setError("");
    apiService
      .getDealerReceipts({ dealerId, page, limit: pageSize, search, range, order })
      .then((response) => {
        if (!active) return;
        setReceipts(Array.isArray(response?.data) ? response.data : []);
        setMeta(response?.meta || { page, limit: pageSize, total: 0 });
      })
      .catch((requestError: any) => {
        if (!active) return;
        setReceipts([]);
        setMeta({ page, limit: pageSize, total: 0 });
        setError(requestError.response?.data?.message || requestError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [dealerId, page, search, range, order, refreshKey]);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this receipt image?")) return;
    try {
      await deleteDealerReceipt(id);
      setRefreshKey((key) => key + 1);
      toast.success("Receipt deleted from project folder");
    } catch (requestError: any) {
      toast.error("Could not delete receipt", {
        description: requestError.response?.data?.message || requestError.message,
      });
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 text-slate-900 md:p-8">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
        <Button variant="outline" size="icon" onClick={onBack} title="Back to dealers">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-black uppercase text-slate-900">
            {dealer?.name || "Dealer"} Receipts
          </h1>
          <p className="text-sm text-slate-500">
            {meta.total} images stored in the project folder.
          </p>
        </div>
      </div>

      <Card className="border-slate-200 bg-white">
        <CardContent className="p-4">
          <DealerReceiptUploader
            dealerId={dealerId || undefined}
            dealerName={dealer?.name || ""}
            persistForDealer
            onSaved={() => setRefreshKey((key) => key + 1)}
          />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-56 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value);
              setPage(1);
            }}
            placeholder="Search note, product, or date..."
            className="pl-9"
          />
        </div>
        <DateRangeSelect
          value={range}
          onChange={(nextRange) => {
            setRange(nextRange);
            setPage(1);
          }}
          className="h-10 w-full bg-white sm:w-36"
        />
        <Button
          variant="outline"
          onClick={() => setOrder((current) => current === "desc" ? "asc" : "desc")}
          title={order === "desc" ? "Newest first" : "Oldest first"}
        >
          {order === "desc" ? <ArrowDown className="mr-2 h-4 w-4" /> : <ArrowUp className="mr-2 h-4 w-4" />}
          {order === "desc" ? "Newest first" : "Oldest first"}
        </Button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">Loading receipt images...</div>
      ) : error ? (
        <div className="py-10 text-center text-sm text-rose-600">{error}</div>
      ) : receipts.length ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {receipts.map((receipt) => (
              <Card key={receipt.id} className="overflow-hidden border-slate-200 bg-white">
                <a href={receipt.imageData} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-slate-100">
                  <img
                    src={receipt.imageData}
                    alt={receipt.note || "Dealer receipt"}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </a>
                <CardContent className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800">
                      {format(new Date(receipt.createdAt), "dd MMM yyyy, h:mm a")}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {receipt.productName || receipt.note || "Dealer receipt"}
                    </p>
                    {receipt.note && receipt.productName && (
                      <p className="mt-1 truncate text-xs text-slate-400">{receipt.note}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(receipt.id)}
                    title="Delete receipt"
                    className="h-8 w-8 shrink-0 text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination
            currentPage={page}
            totalPages={Math.max(1, Math.ceil(meta.total / pageSize))}
            onPageChange={setPage}
            totalItems={meta.total}
            pageSize={pageSize}
            label="receipt images"
          />
        </>
      ) : (
        <div className="py-12 text-center text-slate-400">
          <ImageIcon className="mx-auto mb-2 h-8 w-8" />
          No receipts match these filters.
        </div>
      )}
    </div>
  );
}
