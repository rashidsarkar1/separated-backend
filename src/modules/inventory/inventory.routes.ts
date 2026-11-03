import { Router } from "express";
import mongoose from "mongoose";
import catchAsync from "../../shared/catchasync";
import sendResponse from "../../utils/sendResponse";
import { Product, StockItem } from "./inventory.model";
import { localStore } from "../common/localStore";
import { getDateRangeStart } from "../../utils/dateRange";

const router = Router();

router.get(
  "/",
  catchAsync(async (req, res) => {
    const {
      search = "",
      status = "all",
      sortBy = "createdAt",
      order = "desc",
      page = "1",
      limit = "10",
      range = "all",
      dealerId = "",
      category = "",
    } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    const skip = (pageNum - 1) * limitNum;
    const rangeStart = getDateRangeStart(String(range));
    const searchTerm = String(search).trim();
    const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    if (mongoose.connection.readyState === 1) {
      try {
        // Use aggregation to join stock information
        const pipeline: any[] = [
          {
            $match: { isDeleted: status === "deleted" },
          },
          {
            $lookup: {
              from: "stockitems",
              let: { productId: { $toString: "$_id" } },
              pipeline: [
                { $match: { $expr: { $eq: ["$productId", "$$productId"] } } },
              ],
              as: "stockInfo",
            },
          },
          { $unwind: { path: "$stockInfo", preserveNullAndEmptyArrays: true } },
          {
            $addFields: {
              quantity: { $ifNull: ["$stockInfo.quantity", 0] },
              stringId: { $toString: "$_id" },
              effectiveThreshold: { $ifNull: ["$lowStockThreshold", 15] },
            },
          },
        ];

        const match: any = {};
        if (rangeStart) match.createdAt = { $gte: rangeStart };
        if (dealerId) match.dealerId = String(dealerId);
        if (category) match.category = String(category);
        if (searchTerm) {
          match.$or = [
            { name: { $regex: escapedSearch, $options: "i" } },
            { displayName: { $regex: escapedSearch, $options: "i" } },
            { category: { $regex: escapedSearch, $options: "i" } },
            { sku: { $regex: escapedSearch, $options: "i" } },
            { stringId: { $regex: escapedSearch, $options: "i" } },
          ];
        }

        if (status === "low") {
          match.$expr = {
            $and: [
              { $gt: ["$quantity", 0] },
              { $lte: ["$quantity", "$effectiveThreshold"] },
            ],
          };
        } else if (status === "out") {
          match.quantity = { $lte: 0 };
        } else if (status === "in") {
          match.$expr = { $gt: ["$quantity", "$effectiveThreshold"] };
        }

        if (Object.keys(match).length > 0) {
          pipeline.push({ $match: match });
        }

        const sortOptions: any = {};
        if (sortBy === "id") {
          sortOptions["_id"] = order === "desc" ? -1 : 1;
        } else if (sortBy === "quantity") {
          sortOptions["quantity"] = order === "desc" ? -1 : 1;
        } else {
          sortOptions[sortBy as string] = order === "desc" ? -1 : 1;
        }
        pipeline.push({ $sort: sortOptions });

        // Pagination
        const countPipeline = [...pipeline, { $count: "total" }];
        const dataPipeline = [
          ...pipeline,
          { $skip: skip },
          { $limit: limitNum },
        ];

        const [totalResult, dataResult] = await Promise.all([
          Product.aggregate(countPipeline),
          Product.aggregate(dataPipeline),
        ]);

        const total = totalResult.length > 0 ? totalResult[0].total : 0;

        return sendResponse(res, {
          statusCode: 200,
          success: true,
          message: "Products fetched successfully",
          data: dataResult,
          meta: {
            page: pageNum,
            limit: limitNum,
            total,
          },
        });
      } catch (err) {
        console.warn("MongoDB query failed, falling back to localStore:", err);
      }
    }

    // In-memory fallback
    const searchStr = (search as string).toLowerCase().trim();
    let filtered = localStore.products
      .filter((p) => p.isDeleted === (status === "deleted"))
      .map((p) => {
        const stockItem = localStore.stock.find((s) => s.productId === p._id);
        const quantity = stockItem ? stockItem.quantity : 0;
        const effectiveThreshold = p.lowStockThreshold || 15;
        return {
          ...p,
          quantity,
          effectiveThreshold,
        };
      });

    if (rangeStart) {
      filtered = filtered.filter(
        (product) => new Date(product.createdAt) >= rangeStart,
      );
    }
    if (dealerId) {
      filtered = filtered.filter(
        (product) =>
          String((product as any).dealerId || "") === String(dealerId),
      );
    }
    if (category) {
      filtered = filtered.filter(
        (product) => product.category === String(category),
      );
    }

    if (searchStr) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchStr) ||
          (p.displayName && p.displayName.toLowerCase().includes(searchStr)) ||
          (p.category && p.category.toLowerCase().includes(searchStr)) ||
          p._id.toLowerCase().includes(searchStr) ||
          (p.sku && p.sku.toLowerCase().includes(searchStr)),
      );
    }

    if (status === "low") {
      filtered = filtered.filter(
        (p) => p.quantity > 0 && p.quantity <= p.effectiveThreshold,
      );
    } else if (status === "out") {
      filtered = filtered.filter((p) => p.quantity <= 0);
    } else if (status === "in") {
      filtered = filtered.filter((p) => p.quantity > p.effectiveThreshold);
    }

    filtered.sort((a: any, b: any) => {
      let valA = a[sortBy as string] ?? a._id;
      let valB = b[sortBy as string] ?? b._id;
      if (typeof valA === "string") {
        return order === "desc"
          ? valB.localeCompare(valA)
          : valA.localeCompare(valB);
      }
      return order === "desc" ? valB - valA : valA - valB;
    });

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limitNum);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Products fetched successfully",
      data: paginated,
      meta: {
        page: pageNum,
        limit: limitNum,
        total,
      },
    });
  }),
);

router.get(
  "/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    let product: any;

    if (mongoose.connection.readyState === 1) {
      try {
        const doc = await Product.findById(id);
        if (doc) {
          const stock = await StockItem.findOne({ productId: id });
          product = {
            ...doc.toObject(),
            quantity: stock?.quantity ?? 0,
            effectiveThreshold: doc.lowStockThreshold || 15,
          };
        }
      } catch (err) {
        console.warn("DB get product failed, falling back to localStore:", err);
      }
    }

    if (!product) {
      const found = localStore.products.find((p) => p._id === id);
      if (found) {
        const stockItem = localStore.stock.find(
          (s) => s.productId === found._id,
        );
        product = {
          ...found,
          quantity: stockItem?.quantity ?? 0,
          effectiveThreshold: found.lowStockThreshold || 15,
        };
      }
    }

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product retrieved successfully",
      data: product,
    });
  }),
);

router.post(
  "/",
  catchAsync(async (req, res) => {
    const initialQty =
      Number(req.body.quantity ?? req.body.initialStock ?? 0) || 0;
    let result;
    if (mongoose.connection.readyState === 1) {
      try {
        result = await Product.create(req.body);
        await StockItem.create({
          productId: result._id,
          dealerId: req.body.dealerId || "unknown",
          quantity: initialQty,
        });
        result = {
          ...result.toObject(),
          quantity: initialQty,
          effectiveThreshold: result.lowStockThreshold || 15,
        };
      } catch (err) {
        console.warn("DB create failed, falling back to localStore:", err);
      }
    }

    if (!result) {
      const newId = `p_${Date.now()}`;
      result = {
        ...req.body,
        _id: newId,
        isDeleted: false,
        quantity: initialQty,
        effectiveThreshold: Number(req.body.lowStockThreshold) || 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStore.products.unshift(result);
      localStore.stock.push({
        _id: `s_${Date.now()}`,
        productId: newId,
        dealerId: req.body.dealerId || "unknown",
        quantity: initialQty,
        lastRestocked: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Product created successfully",
      data: result,
    });
  }),
);

router.patch(
  "/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    let result;
    if (mongoose.connection.readyState === 1) {
      try {
        const updated = await Product.findByIdAndUpdate(id, req.body, {
          new: true,
        });
        if (updated) {
          result =
            typeof updated.toObject === "function"
              ? updated.toObject()
              : updated;
        }
        if (req.body.quantity !== undefined) {
          await StockItem.findOneAndUpdate(
            { productId: id },
            { quantity: Number(req.body.quantity) },
            { upsert: true },
          );
        }
      } catch (err) {
        console.warn("DB update failed, falling back to localStore:", err);
      }
    }

    if (!result) {
      const idx = localStore.products.findIndex((p) => p._id === id);
      if (idx !== -1) {
        localStore.products[idx] = {
          ...localStore.products[idx],
          ...req.body,
          updatedAt: new Date().toISOString(),
        };
        result = localStore.products[idx];
      }
    }

    if (req.body.quantity !== undefined) {
      const stockIdx = localStore.stock.findIndex(
        (s) => s.productId === id || s._id === id,
      );
      if (stockIdx !== -1) {
        localStore.stock[stockIdx].quantity = Number(req.body.quantity);
      } else {
        localStore.stock.push({
          _id: `s_${Date.now()}`,
          productId: id,
          dealerId: req.body.dealerId || "unknown",
          quantity: Number(req.body.quantity),
          lastRestocked: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
      if (result) {
        result = { ...result, quantity: Number(req.body.quantity) };
      }
    }

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product updated successfully",
      data: result,
    });
  }),
);

// Stock Routes
router.get(
  "/stock",
  catchAsync(async (req, res) => {
    let result;
    if (mongoose.connection.readyState === 1) {
      try {
        result = await StockItem.find();
      } catch (err) {
        console.warn("DB fetch stock failed, falling back to localStore:", err);
      }
    }
    if (!result) {
      result = localStore.stock;
    }
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Stock data fetched successfully",
      data: result,
    });
  }),
);

router.patch(
  "/stock/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    let result;

    const isTempId = id.startsWith("temp-");
    const lookupId = isTempId ? id.replace("temp-", "") : id;

    if (mongoose.connection.readyState === 1) {
      try {
        if (isTempId || !mongoose.Types.ObjectId.isValid(lookupId)) {
          result = await StockItem.findOneAndUpdate(
            { productId: lookupId },
            { ...req.body, productId: lookupId },
            { new: true, upsert: true },
          );
        } else {
          result = await StockItem.findByIdAndUpdate(lookupId, req.body, {
            new: true,
          });
          if (!result) {
            result = await StockItem.findOneAndUpdate(
              { productId: lookupId },
              { ...req.body, productId: lookupId },
              { new: true, upsert: true },
            );
          }
        }
      } catch (err) {
        console.warn(
          "DB stock update failed, falling back to localStore:",
          err,
        );
      }
    }

    if (!result) {
      const idx = localStore.stock.findIndex(
        (s) => s._id === id || s.productId === lookupId,
      );
      if (idx !== -1) {
        localStore.stock[idx] = {
          ...localStore.stock[idx],
          ...req.body,
          updatedAt: new Date().toISOString(),
        };
        result = localStore.stock[idx];
      } else {
        result = {
          _id: `s_${Date.now()}`,
          productId: lookupId,
          ...req.body,
          dealerId: "unknown",
          updatedAt: new Date().toISOString(),
        };
        localStore.stock.push(result);
      }
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Stock updated successfully",
      data: result,
    });
  }),
);

router.delete(
  "/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    let result;
    if (mongoose.connection.readyState === 1) {
      try {
        result = await Product.findByIdAndUpdate(
          id,
          { isDeleted: true },
          { new: true },
        );
      } catch (err) {
        console.warn("DB soft delete failed, falling back to localStore:", err);
      }
    }

    if (!result) {
      const idx = localStore.products.findIndex((p) => p._id === id);
      if (idx !== -1) {
        localStore.products[idx].isDeleted = true;
        result = localStore.products[idx];
      }
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product soft deleted successfully",
      data: result,
    });
  }),
);

router.patch(
  "/:id/restore",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    let result;
    if (mongoose.connection.readyState === 1) {
      try {
        result = await Product.findByIdAndUpdate(
          id,
          { isDeleted: false },
          { new: true },
        );
      } catch (err) {
        console.warn("DB restore failed, falling back to localStore:", err);
      }
    }

    if (!result) {
      const idx = localStore.products.findIndex((p) => p._id === id);
      if (idx !== -1) {
        localStore.products[idx].isDeleted = false;
        result = localStore.products[idx];
      }
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product restored successfully",
      data: result,
    });
  }),
);

export const InventoryRoutes = router;
