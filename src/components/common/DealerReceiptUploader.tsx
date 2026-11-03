import React, { useRef, useState } from "react";
import { Camera, ImagePlus, Trash2, Loader2, Receipt } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { cn } from "../../lib/utils";
import { compressImageFile, saveDealerReceipt } from "../../utils/receiptStore";

export interface PendingDealerReceipt {
  id: string;
  imageData: string;
  note: string;
  createdAt: string;
}

interface DealerReceiptUploaderProps {
  productId?: string;
  productName?: string;
  dealerId?: string;
  dealerName?: string;
  persistForDealer?: boolean;
  pendingReceipts?: PendingDealerReceipt[];
  onPendingChange?: (receipts: PendingDealerReceipt[]) => void;
  onSaved?: () => void;
  className?: string;
}

export function DealerReceiptUploader({
  productId,
  productName,
  dealerId,
  dealerName,
  persistForDealer = false,
  pendingReceipts = [],
  onPendingChange,
  onSaved,
  className,
}: DealerReceiptUploaderProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const persistNow = Boolean(productId || (persistForDealer && dealerId));

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const created: PendingDealerReceipt[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image`);
          continue;
        }
        const imageData = await compressImageFile(file);
        const receipt: PendingDealerReceipt = {
          id: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          imageData,
          note: note.trim(),
          createdAt: new Date().toISOString(),
        };

        if (persistNow && (productId || dealerId)) {
          await saveDealerReceipt({
            productId: productId || "",
            productName: productName || "",
            dealerId: dealerId || "",
            dealerName: dealerName || "",
            note: receipt.note,
            imageData,
            createdAt: receipt.createdAt,
          });
        } else {
          created.push(receipt);
        }
      }

      if (!persistNow && created.length > 0) {
        onPendingChange?.([...pendingReceipts, ...created]);
      } else if (persistNow) {
        onSaved?.();
        toast.success("Dealer receipt saved to Cloudinary");
      }

      setNote("");
    } catch (err: any) {
      toast.error("Could not save receipt image", {
        description: err?.message || "Please try another photo.",
      });
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galleryRef.current) galleryRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
          <Receipt className="w-3.5 h-3.5 text-indigo-600" />
          Dealer Receipt Image
        </label>
        <span className="text-[10px] font-semibold text-slate-400">
          Camera or gallery • saved to Cloudinary
        </span>
      </div>

      <Input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note (batch, invoice no, date...)"
        className="h-10 border-slate-200 bg-white rounded-xl text-sm"
      />

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => cameraRef.current?.click()}
          className="h-11 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold text-xs gap-2"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Camera className="w-4 h-4" />
          )}
          Open Camera
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => galleryRef.current?.click()}
          className="h-11 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs gap-2"
        >
          <ImagePlus className="w-4 h-4" />
          Choose Gallery
        </Button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {!persistNow && pendingReceipts.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {pendingReceipts.map((receipt) => (
            <div
              key={receipt.id}
              className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-100 group"
            >
              <img
                src={receipt.imageData}
                alt="Pending dealer receipt"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() =>
                  onPendingChange?.(
                    pendingReceipts.filter((item) => item.id !== receipt.id),
                  )
                }
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-white/90 text-rose-600 flex items-center justify-center shadow-sm opacity-90 group-hover:opacity-100"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-slate-500">
        Add one receipt now, then upload another each time you buy this product
        again. Images are stored in Cloudinary and appear on the product details
        page.
      </p>
    </div>
  );
}
