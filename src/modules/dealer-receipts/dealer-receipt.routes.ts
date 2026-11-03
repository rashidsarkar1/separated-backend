import { Router } from "express";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { getDateRangeStart } from "../../utils/dateRange";

interface DealerReceiptRecord {
  id: string;
  productId: string;
  productName: string;
  dealerId: string;
  dealerName: string;
  note: string;
  imageData: string;
  createdAt: string;
}

export interface DealerReceiptMongoDocument {
  [key: string]: string | undefined;
  _id: string;
  id: string;
  productId: string;
  productName: string;
  dealerId: string;
  dealerName: string;
  note: string;
  imageData: string;
  createdAt: string;
}

const router = Router();
const receiptsCollectionName = "dealerReceipts";

function getReceiptsCollection() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("MongoDB is unavailable; dealer receipts cannot be accessed.");
  }
  return mongoose.connection.collection<DealerReceiptMongoDocument>(
    receiptsCollectionName,
  );
}

function getCloudinaryConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (
    !cloudName ||
    !apiKey ||
    !apiSecret ||
    [cloudName, apiKey, apiSecret].some((value) =>
      /^(?:\*+|change.?me|your_|replace_)/i.test(value),
    )
  ) {
    throw new Error(
      "Valid Cloudinary credentials are required. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in the backend environment.",
    );
  }
  return { cloudName, apiKey, apiSecret };
}

async function uploadReceiptImage(imageData: string, id: string): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "dealer-receipts";
  const signature = createHash("sha1")
    .update(`folder=${folder}&public_id=${id}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");
  const form = new FormData();
  form.append("file", imageData);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", folder);
  form.append("public_id", id);
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`,
    { method: "POST", body: form },
  );
  const result = (await response.json()) as {
    secure_url?: string;
    error?: { message?: string };
  };
  if (!response.ok || !result.secure_url) {
    throw new Error(result.error?.message || "Cloudinary image upload failed");
  }
  return result.secure_url;
}

function getCloudinaryPublicId(imageUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }
  if (url.hostname !== "res.cloudinary.com") return null;

  const uploadPath = url.pathname.split("/upload/")[1];
  if (!uploadPath) return null;
  const publicId = uploadPath.replace(/^v\d+\//, "").replace(/\.[^/.]+$/, "");
  return publicId.startsWith("dealer-receipts/") ? publicId : null;
}

async function deleteCloudinaryImage(imageUrl: string): Promise<void> {
  const publicId = getCloudinaryPublicId(imageUrl);
  if (!publicId) return;

  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1")
    .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");
  const form = new FormData();
  form.append("public_id", publicId);
  form.append("api_key", apiKey);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/destroy`,
    { method: "POST", body: form },
  );
  const result = (await response.json()) as {
    result?: string;
    error?: { message?: string };
  };
  if (!response.ok || (result.result !== "ok" && result.result !== "not found")) {
    throw new Error(result.error?.message || "Cloudinary image deletion failed");
  }
}

async function readReceipts(): Promise<DealerReceiptRecord[]> {
  const records = await getReceiptsCollection().find({}).toArray();
  return records.map((record) => ({
    id: String(record.id ?? record._id),
    productId: String(record.productId ?? ""),
    productName: String(record.productName ?? ""),
    dealerId: String(record.dealerId ?? ""),
    dealerName: String(record.dealerName ?? ""),
    note: String(record.note ?? ""),
    imageData: String(record.imageData ?? ""),
    createdAt: String(record.createdAt ?? ""),
  }));
}

router.get("/", async (req, res) => {
  try {
    const productId = String(req.query.productId || "");
    const dealerId = String(req.query.dealerId || "");
    if (!productId && !dealerId) {
      return res
        .status(400)
        .json({ success: false, message: "productId or dealerId is required" });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 10));
    const search = String(req.query.search || "").trim().toLowerCase();
    const rangeStart = getDateRangeStart(String(req.query.range || "all"));
    const direction = req.query.order === "asc" ? 1 : -1;
    let filtered = (await readReceipts()).filter((receipt) => {
      if (productId && receipt.productId !== productId) return false;
      if (dealerId && receipt.dealerId !== dealerId) return false;
      if (rangeStart && new Date(receipt.createdAt) < rangeStart) return false;
      if (!search) return true;
      return [receipt.note, receipt.productName, receipt.dealerName, receipt.createdAt]
        .join(" ")
        .toLowerCase()
        .includes(search);
    });
    filtered.sort(
      (left, right) =>
        (new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()) *
        direction,
    );
    const total = filtered.length;
    const receipts = filtered
      .slice((page - 1) * limit, page * limit);

    return res.json({
      success: true,
      data: receipts,
      meta: { page, limit, total },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      productId,
      productName = "",
      dealerId = "",
      dealerName = "",
      note = "",
      imageData,
      createdAt,
    } = req.body || {};
    const imageMatch =
      typeof imageData === "string" &&
      imageData.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/);

    if ((!productId && !dealerId) || !imageMatch) {
      return res.status(400).json({
        success: false,
        message:
          "A dealer or product and valid JPEG, PNG, or WebP receipt image are required",
      });
    }

    const imageBuffer = Buffer.from(imageMatch[2], "base64");
    const maxImageSize = 3 * 1024 * 1024;
    if (imageBuffer.length > maxImageSize) {
      return res
        .status(413)
        .json({
          success: false,
          message: "Receipt image must be no larger than 3 MB",
        });
    }

    const id = `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record: DealerReceiptRecord = {
      id,
      productId: String(productId || ""),
      productName: String(productName),
      dealerId: String(dealerId),
      dealerName: String(dealerName),
      note: String(note),
      imageData: await uploadReceiptImage(imageData, id),
      createdAt: createdAt || new Date().toISOString(),
    };

    try {
      await getReceiptsCollection().insertOne({ _id: id, ...record });
    } catch (error) {
      try {
        await deleteCloudinaryImage(record.imageData);
      } catch (cleanupError) {
        const saveMessage =
          error instanceof Error ? error.message : String(error);
        const cleanupMessage =
          cleanupError instanceof Error
            ? cleanupError.message
            : String(cleanupError);
        throw new Error(
          `Could not save receipt metadata: ${saveMessage}. Cloudinary cleanup failed: ${cleanupMessage}`,
        );
      }
      throw error;
    }

    return res.status(201).json({ success: true, data: record });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const receipts = await readReceipts();
    const receipt = receipts.find((item) => item.id === req.params.id);
    if (!receipt) {
      return res
        .status(404)
        .json({ success: false, message: "Receipt not found" });
    }

    await deleteCloudinaryImage(receipt.imageData);
    await getReceiptsCollection().deleteOne({ _id: req.params.id });
    return res.json({ success: true, data: null });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export const dealerReceiptRoutes = router;
