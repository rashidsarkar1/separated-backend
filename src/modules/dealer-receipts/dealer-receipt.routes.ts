import { Router } from "express";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
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
  imageFileName: string;
  createdAt: string;
}

export interface DealerReceiptMongoDocument {
  [key: string]: string | Buffer | undefined;
  _id: string;
  id: string;
  productId: string;
  productName: string;
  dealerId: string;
  dealerName: string;
  note: string;
  imageData: string;
  imageFileName: string;
  imageContentType: string;
  imageBuffer: Buffer;
  createdAt: string;
}

const router = Router();
const useMongoStorage = process.env.VERCEL === "1";
const receiptsDirectory = path.join(process.cwd(), "data", "dealer-receipts");
const imagesDirectory = path.join(receiptsDirectory, "images");
const metadataPath = path.join(receiptsDirectory, "receipts.json");

async function readReceipts(): Promise<DealerReceiptRecord[]> {
  if (useMongoStorage) {
    const records = await mongoose.connection
      .collection<DealerReceiptMongoDocument>("dealerReceipts")
      .find({}, { projection: { imageBuffer: 0, imageContentType: 0 } })
      .toArray();
    return records.map((record) => ({
      id: String(record.id ?? record._id),
      productId: String(record.productId ?? ""),
      productName: String(record.productName ?? ""),
      dealerId: String(record.dealerId ?? ""),
      dealerName: String(record.dealerName ?? ""),
      note: String(record.note ?? ""),
      imageData: String(record.imageData ?? ""),
      imageFileName: String(record.imageFileName ?? ""),
      createdAt: String(record.createdAt ?? ""),
    }));
  }

  try {
    return JSON.parse(
      await readFile(metadataPath, "utf8"),
    ) as DealerReceiptRecord[];
  } catch (error: any) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeReceipts(receipts: DealerReceiptRecord[]) {
  await mkdir(receiptsDirectory, { recursive: true });
  const temporaryPath = `${metadataPath}.tmp`;
  await writeFile(temporaryPath, JSON.stringify(receipts, null, 2), "utf8");
  await rename(temporaryPath, metadataPath);
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
      .slice((page - 1) * limit, page * limit)
      .map(({ imageFileName, ...receipt }) => receipt);

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
    const maxImageSize = useMongoStorage
      ? 3 * 1024 * 1024
      : 15 * 1024 * 1024;
    if (imageBuffer.length > maxImageSize) {
      return res
        .status(413)
        .json({
          success: false,
          message: useMongoStorage
            ? "Receipt image must be no larger than 3 MB on Vercel"
            : "Receipt image is too large",
        });
    }

    const id = `rcpt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const extension = imageMatch[1] === "jpeg" ? "jpg" : imageMatch[1];
    const imageFileName = `${id}.${extension}`;
    const record: DealerReceiptRecord = {
      id,
      productId: String(productId || ""),
      productName: String(productName),
      dealerId: String(dealerId),
      dealerName: String(dealerName),
      note: String(note),
      imageData: `/uploads/dealer-receipts/${imageFileName}`,
      imageFileName,
      createdAt: createdAt || new Date().toISOString(),
    };

    if (useMongoStorage) {
      const imageContentType = `image/${imageMatch[1] === "jpg" ? "jpeg" : imageMatch[1]}`;
      await mongoose.connection.collection<DealerReceiptMongoDocument>("dealerReceipts").insertOne({
        _id: id,
        ...record,
        imageContentType,
        imageBuffer,
      });
    } else {
      await mkdir(imagesDirectory, { recursive: true });
      await writeFile(path.join(imagesDirectory, imageFileName), imageBuffer);
      try {
        const receipts = await readReceipts();
        receipts.unshift(record);
        await writeReceipts(receipts);
      } catch (error) {
        await unlink(path.join(imagesDirectory, imageFileName)).catch(
          () => undefined,
        );
        throw error;
      }
    }

    const { imageFileName: _imageFileName, ...response } = record;
    return res.status(201).json({ success: true, data: response });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (useMongoStorage) {
      const result = await mongoose.connection
        .collection<DealerReceiptMongoDocument>("dealerReceipts")
        .deleteOne({ _id: req.params.id });
      if (result.deletedCount === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Receipt not found" });
      }
      return res.json({ success: true, data: null });
    }

    const receipts = await readReceipts();
    const receipt = receipts.find((item) => item.id === req.params.id);
    if (!receipt) {
      return res
        .status(404)
        .json({ success: false, message: "Receipt not found" });
    }

    await writeReceipts(receipts.filter((item) => item.id !== receipt.id));
    await unlink(
      path.join(imagesDirectory, path.basename(receipt.imageFileName)),
    ).catch((error: any) => {
      if (error.code !== "ENOENT") throw error;
    });
    return res.json({ success: true, data: null });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export const dealerReceiptRoutes = router;
