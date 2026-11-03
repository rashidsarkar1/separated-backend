import { apiService } from "../services/apiService";

export interface DealerReceipt {
  id: string;
  productId?: string;
  productName?: string;
  dealerId: string;
  dealerName: string;
  note?: string;
  imageData: string;
  createdAt: string;
}

export async function saveDealerReceipt(
  receipt: Omit<DealerReceipt, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
): Promise<DealerReceipt> {
  return apiService.saveDealerReceipt({
    ...receipt,
    productId: String(receipt.productId || ""),
    dealerId: String(receipt.dealerId || ""),
  });
}

export async function getReceiptsByProduct(
  productId: string,
): Promise<DealerReceipt[]> {
  const id = String(productId || "");
  if (!id) return [];

  return apiService.getReceiptsByProduct(id);
}

export async function deleteDealerReceipt(id: string): Promise<void> {
  await apiService.deleteDealerReceipt(id);
}

export function compressImageFile(
  file: File,
  maxWidth = 1400,
  quality = 0.72,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image file"));
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process image"));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
