import { Router } from "express";
import mongoose from "mongoose";
import catchAsync from "../../shared/catchasync";
import { AppError } from "../../utils/AppError";
import sendResponse from "../../utils/sendResponse";
import { Product } from "../inventory/inventory.model";
import { Transaction } from "../transactions/transaction.model";
import { Category } from "./category.model";

const router = Router();

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.use((_req, _res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return next(new AppError(503, "Category database is unavailable"));
  }
  next();
});

router.get(
  "/",
  catchAsync(async (req, res) => {
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 10));
    const sortBy = String(req.query.sortBy || "name");
    const order = req.query.order === "desc" ? -1 : 1;
    const expression = search ? new RegExp(escapeRegex(search), "i") : null;

    const [savedCategories, productGroups] = await Promise.all([
      Category.find(expression ? { name: expression } : {})
        .select("name normalizedName")
        .lean(),
      Product.aggregate([
        { $match: { isDeleted: { $ne: true }, category: { $type: "string", $ne: "" } } },
        { $group: { _id: "$category", productCount: { $sum: 1 } } },
      ]),
    ]);

    const categoryMap = new Map<string, { name: string; productCount: number }>();
    for (const category of savedCategories) {
      categoryMap.set(category.normalizedName, {
        name: category.name,
        productCount: 0,
      });
    }
    for (const group of productGroups) {
      const name = String(group._id).trim();
      const normalizedName = name.toLocaleLowerCase();
      const existing = categoryMap.get(normalizedName);
      categoryMap.set(normalizedName, {
        name: existing?.name || name,
        productCount: group.productCount,
      });
    }

    let categories = Array.from(categoryMap.values()).filter((category) =>
      expression ? expression.test(category.name) : true,
    );
    const allowedSorts = new Set(["name", "productCount"]);
    const selectedSort = allowedSorts.has(sortBy) ? sortBy : "name";
    categories.sort((left, right) => {
      if (selectedSort === "productCount") {
        return (left.productCount - right.productCount) * order;
      }
      return left.name.localeCompare(right.name) * order;
    });

    const total = categories.length;
    categories = categories.slice((page - 1) * limit, page * limit);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Categories fetched successfully",
      meta: { page, limit, total },
      data: categories,
    });
  }),
);

router.post(
  "/",
  catchAsync(async (req, res) => {
    const name = String(req.body.name || "").trim().replace(/\s+/g, " ");
    if (!name) {
      throw new AppError(400, "Category name is required");
    }

    const normalizedName = name.toLocaleLowerCase();
    let category = await Category.findOne({ normalizedName });
    let created = false;
    if (!category) {
      category = await Category.create({ name, normalizedName });
      created = true;
    }

    sendResponse(res, {
      statusCode: created ? 201 : 200,
      success: true,
      message: "Category saved successfully",
      data: category,
    });
  }),
);

router.get(
  "/:name/products",
  catchAsync(async (req, res) => {
    const category = String(req.params.name || "").trim();
    const search = String(req.query.search || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(10, Math.max(1, Number(req.query.limit) || 10));
    const sortBy = String(req.query.sortBy || "name");
    const direction = req.query.order === "desc" ? -1 : 1;
    const match: Record<string, any> = {
      category: { $regex: `^${escapeRegex(category)}$`, $options: "i" },
      isDeleted: { $ne: true },
    };
    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      match.$or = [{ name: expression }, { displayName: expression }, { sku: expression }];
    }

    const allowedSorts: Record<string, string> = {
      name: "name",
      stock: "quantity",
      sold: "soldQuantity",
      revenue: "salesRevenue",
      profit: "salesProfit",
    };
    const sortField = allowedSorts[sortBy] || "name";
    const [total, products] = await Promise.all([
      Product.countDocuments(match),
      Product.aggregate([
        { $match: match },
        {
          $lookup: {
            from: "stockitems",
            let: { productId: { $toString: "$_id" } },
            pipeline: [
              { $match: { $expr: { $eq: ["$productId", "$$productId"] } } },
              { $group: { _id: null, quantity: { $sum: "$quantity" } } },
            ],
            as: "stockSummary",
          },
        },
        {
          $lookup: {
            from: "transactions",
            let: {
              productId: { $toString: "$_id" },
              buyPrice: { $ifNull: ["$buyPrice", 0] },
            },
            pipeline: [
              { $match: { type: "SALE" } },
              { $unwind: "$items" },
              { $match: { $expr: { $eq: ["$items.productId", "$$productId"] } } },
              {
                $group: {
                  _id: null,
                  soldQuantity: { $sum: { $ifNull: ["$items.quantity", 0] } },
                  salesRevenue: {
                    $sum: {
                      $multiply: [
                        { $ifNull: ["$items.quantity", 0] },
                        { $ifNull: ["$items.unitPrice", 0] },
                      ],
                    },
                  },
                  salesProfit: {
                    $sum: {
                      $multiply: [
                        { $ifNull: ["$items.quantity", 0] },
                        {
                          $subtract: [
                            { $ifNull: ["$items.unitPrice", 0] },
                            { $ifNull: ["$items.costPrice", "$$buyPrice"] },
                          ],
                        },
                      ],
                    },
                  },
                },
              },
            ],
            as: "salesSummary",
          },
        },
        {
          $addFields: {
            quantity: { $ifNull: [{ $arrayElemAt: ["$stockSummary.quantity", 0] }, 0] },
            soldQuantity: { $ifNull: [{ $arrayElemAt: ["$salesSummary.soldQuantity", 0] }, 0] },
            salesRevenue: { $ifNull: [{ $arrayElemAt: ["$salesSummary.salesRevenue", 0] }, 0] },
            salesProfit: { $ifNull: [{ $arrayElemAt: ["$salesSummary.salesProfit", 0] }, 0] },
          },
        },
        { $sort: { [sortField]: direction, _id: 1 } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { name: 1, displayName: 1, sku: 1, category: 1, buyPrice: 1, sellPrice: 1, quantity: 1, soldQuantity: 1, salesRevenue: 1, salesProfit: 1 } },
      ]),
    ]);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Category products fetched successfully",
      meta: { page, limit, total },
      data: products,
    });
  }),
);

export const CategoryRoutes = router;