import { Router } from "express";
import mongoose from "mongoose";
import catchAsync from "../../shared/catchasync";
import sendResponse from "../../utils/sendResponse";
import { Transaction } from "../transactions/transaction.model";
import { Product } from "../inventory/inventory.model";
import { localStore } from "../common/localStore";
import { calculateSaleLine, resolveSaleUnit } from "../../utils/salesUnits";
import { getDateRangeStart } from "../../utils/dateRange";
import { AppError } from "../../utils/AppError";

const router = Router();

router.use((_req, _res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return next(new AppError(503, "Analytics database is unavailable"));
  }
  next();
});

const getTimeFilter = (range: string) => {
  return getDateRangeStart(range) || new Date(0);
};

const getProductMap = async (
  transactions: any[],
): Promise<Map<string, any>> => {
  const map = new Map<string, any>();
  // 1. Populate from localStore first
  for (const p of localStore.products) {
    if (p._id) map.set(String(p._id), p);
    if ((p as any).id) map.set(String((p as any).id), p);
  }

  // 2. If MongoDB is ready, fetch from MongoDB as well
  if (mongoose.connection.readyState === 1) {
    try {
      const productIds = [
        ...new Set(
          transactions.flatMap((transaction: any) =>
            (transaction.items || []).map((item: any) =>
              String(
                item.productId?._id ||
                  item.productId?.id ||
                  item.productId ||
                  "",
              ),
            ),
          ),
        ),
      ].filter(Boolean);

      const objectIds = productIds.filter((id) =>
        mongoose.Types.ObjectId.isValid(id),
      );
      const queries: any[] = [];
      if (objectIds.length > 0) queries.push({ _id: { $in: objectIds } });
      if (productIds.length > 0) queries.push({ _id: { $in: productIds } });

      const docs =
        queries.length > 0
          ? await Product.find({ $or: queries })
              .lean()
              .catch(() => [])
          : [];

      for (const d of docs) {
        if (d._id) map.set(String(d._id), d);
      }
    } catch (e) {
      console.warn("Error fetching products for analytics:", e);
    }
  }

  return map;
};

const buildProductPerformance = (
  transactions: any[],
  productsById: Map<string, any>,
) => {
  const performance = new Map<string, any>();

  for (const transaction of transactions) {
    for (const item of transaction.items || []) {
      const productId = String(
        item.productId?._id || item.productId?.id || item.productId || "",
      );
      const product = productsById.get(productId);
      const line = calculateSaleLine(item, product);
      if (!performance.has(productId)) {
        performance.set(productId, {
          _id: productId,
          name:
            product?.displayName ||
            product?.name ||
            item.productName ||
            "Unknown Product",
          category: product?.category || "General",
          unit: product?.unit || item.unit || "Unit",
          totalSales: 0,
          totalProfit: 0,
          totalQuantity: 0,
          quantityByUnit: {},
          lastSoldAt: transaction.createdAt,
        });
      }

      const entry = performance.get(productId);
      entry.totalSales += line.revenue;
      entry.totalProfit += line.profit;
      entry.totalQuantity += line.baseUnitQuantity;
      entry.quantityByUnit[line.unit] =
        (entry.quantityByUnit[line.unit] || 0) + line.quantity;
      if (new Date(transaction.createdAt) > new Date(entry.lastSoldAt)) {
        entry.lastSoldAt = transaction.createdAt;
      }
    }
  }

  return Array.from(performance.values()).map((product) => ({
    ...product,
    profitMargin:
      product.totalSales > 0
        ? (product.totalProfit / product.totalSales) * 100
        : 0,
  }));
};

router.get(
  "/summary",
  catchAsync(async (req, res) => {
    const { range = "all" } = req.query;
    const timeFilter = getTimeFilter(range as string);

    let transactions: any[] = [];
    let databaseQuerySucceeded = false;
    if (mongoose.connection.readyState === 1) {
      try {
        transactions = await Transaction.find({
          createdAt: { $gte: timeFilter },
          type: "SALE",
        }).lean();
        databaseQuerySucceeded = true;
      } catch (err) {
        throw err;
      }
    }

    if (!databaseQuerySucceeded) {
      transactions = localStore.transactions.filter(
        (t) => t.type === "SALE" && new Date(t.createdAt) >= timeFilter,
      );
    }

    const productMap = await getProductMap(transactions);
    const performance = buildProductPerformance(transactions, productMap);

    const totalSales = transactions.reduce(
      (sum: number, transaction: any) =>
        sum +
        (Number(transaction.totalAmount) ||
          (transaction.items || []).reduce(
            (lineSum: number, item: any) =>
              lineSum +
              (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0),
            0,
          )),
      0,
    );
    const totalProfit = performance.reduce(
      (sum: number, product: any) => sum + product.totalProfit,
      0,
    );
    const uniqueCustomers = new Set(
      transactions.map((t: any) => t.customerId).filter(Boolean),
    );

    const stats = {
      totalSales,
      totalProfit,
      totalCustomers: uniqueCustomers.size,
    };

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Summary analytics fetched successfully",
      data: stats,
    });
  }),
);

router.get(
  "/customers",
  catchAsync(async (req, res) => {
    const {
      range = "all",
      page = 1,
      limit = 10,
      sortBy = "totalPurchase",
      order = "desc",
    } = req.query;
    const timeFilter = getTimeFilter(range as string);
    const skip = (Number(page) - 1) * Number(limit);

    let transactions: any[] = [];
    let databaseQuerySucceeded = false;
    if (mongoose.connection.readyState === 1) {
      try {
        transactions = await Transaction.find({
          createdAt: { $gte: timeFilter },
          type: "SALE",
        }).lean();
        databaseQuerySucceeded = true;
      } catch (err) {
        throw err;
      }
    }

    if (!databaseQuerySucceeded) {
      transactions = localStore.transactions.filter(
        (t) => t.type === "SALE" && new Date(t.createdAt) >= timeFilter,
      );
    }

    const productMap = await getProductMap(transactions);

    const customerMap = new Map<string, any>();
    for (const t of transactions) {
      const cId = t.customerId || "walk-in";
      if (!customerMap.has(cId)) {
        customerMap.set(cId, {
          _id: cId,
          name: t.customerName || "Walk-in Customer",
          totalPurchase: 0,
          totalProfit: 0,
          purchaseCount: 0,
          lastPurchase: t.createdAt,
        });
      }
      const entry = customerMap.get(cId);
      entry.totalPurchase += Number(t.totalAmount) || 0;
      entry.purchaseCount += 1;
      if (new Date(t.createdAt) > new Date(entry.lastPurchase)) {
        entry.lastPurchase = t.createdAt;
      }

      // Calculate profit per item accurately using calculateSaleLine
      for (const item of t.items || []) {
        const productId = String(
          item.productId?._id || item.productId?.id || item.productId || "",
        );
        const product = productMap.get(productId);
        const line = calculateSaleLine(item, product);
        entry.totalProfit += line.profit;
      }
    }

    let customers = Array.from(customerMap.values());
    const total = customers.length;
    customers.sort((a, b) => {
      const valA = a[sortBy as string] ?? 0;
      const valB = b[sortBy as string] ?? 0;
      if (sortBy === "lastPurchase") {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        return order === "desc" ? timeB - timeA : timeA - timeB;
      }
      return order === "desc" ? valB - valA : valA - valB;
    });

    customers = customers.slice(skip, skip + Number(limit));

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Customer analytics fetched successfully",
      meta: { page: Number(page), limit: Number(limit), total },
      data: customers,
    });
  }),
);

router.get(
  "/products",
  catchAsync(async (req, res) => {
    const {
      range = "all",
      page = 1,
      limit = 10,
      sortBy = "totalSales",
      order = "desc",
    } = req.query;
    const timeFilter = getTimeFilter(range as string);
    const skip = (Number(page) - 1) * Number(limit);

    let transactions: any[] = [];
    let databaseQuerySucceeded = false;
    if (mongoose.connection.readyState === 1) {
      try {
        transactions = await Transaction.find({
          createdAt: { $gte: timeFilter },
          type: "SALE",
        }).lean();
        databaseQuerySucceeded = true;
      } catch (err) {
        throw err;
      }
    }

    if (!databaseQuerySucceeded) {
      transactions = localStore.transactions.filter(
        (t) => t.type === "SALE" && new Date(t.createdAt) >= timeFilter,
      );
    }

    const productMap = await getProductMap(transactions);
    let products = buildProductPerformance(transactions, productMap);
    const total = products.length;

    products.sort((a, b) => {
      const valA = a[sortBy as string] ?? 0;
      const valB = b[sortBy as string] ?? 0;
      return order === "desc" ? valB - valA : valA - valB;
    });

    products = products.slice(skip, skip + Number(limit));

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product analytics fetched successfully",
      meta: { page: Number(page), limit: Number(limit), total },
      data: products,
    });
  }),
);

export const AnalyticsRoutes = router;
