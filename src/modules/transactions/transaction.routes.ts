import { Router } from "express";
import mongoose from "mongoose";
import catchAsync from "../../shared/catchasync";
import sendResponse from "../../utils/sendResponse";
import { Transaction } from "./transaction.model";
import { Product, StockItem } from "../inventory/inventory.model";
import { Customer } from "../customers/customer.model";
import { localStore } from "../common/localStore";
import { resolveSaleUnit } from "../../utils/salesUnits";
import { getDateRangeStart } from "../../utils/dateRange";
import { AppError } from "../../utils/AppError";

const router = Router();

router.use((_req, _res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return next(new AppError(503, "Sales database is unavailable"));
  }
  next();
});

router.get(
  "/",
  catchAsync(async (req, res) => {
    const { search = "", page = 1, limit = 10, range = "all" } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));
    const skip = (pageNum - 1) * limitNum;
    const rangeStart = getDateRangeStart(String(range));
    const searchTerm = String(search).trim();

    let result;
    let resultTotal = 0;
    if (mongoose.connection.readyState === 1) {
      try {
        const searchMatch: any = { type: "SALE" };
        if (searchTerm) {
          searchMatch.$or = [
            { stringId: { $regex: searchTerm, $options: "i" } },
            { customerName: { $regex: searchTerm, $options: "i" } },
          ];
        }
        if (rangeStart) searchMatch.createdAt = { $gte: rangeStart };

        const countPipeline: any[] = [];
        if (searchTerm) {
          countPipeline.push({
            $addFields: { stringId: { $toString: "$_id" } },
          });
        }
        if (Object.keys(searchMatch).length > 0) {
          countPipeline.push({ $match: searchMatch });
        }
        countPipeline.push({ $count: "total" });
        const [countResult] = await Transaction.aggregate(countPipeline);
        resultTotal = countResult?.total || 0;

        if (searchTerm) {
          // Create an aggregation to allow string matching on _id
          const pipeline: any[] = [
            {
              $addFields: {
                stringId: { $toString: "$_id" },
              },
            },
            { $match: searchMatch },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "products",
                let: { productId: "$items.productId" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$_id",
                          {
                            $convert: {
                              input: "$$productId",
                              to: "objectId",
                              onError: null,
                              onNull: null,
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
                as: "productDetails",
              },
            },
            {
              $unwind: {
                path: "$productDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "customers",
                let: { customerId: "$customerId" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$_id",
                          {
                            $convert: {
                              input: "$$customerId",
                              to: "objectId",
                              onError: null,
                              onNull: null,
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
                as: "customerDetails",
              },
            },
            {
              $unwind: {
                path: "$customerDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $group: {
                _id: "$_id",
                customerId: { $first: "$customerId" },
                customerNameFromDetails: { $first: "$customerDetails.name" },
                customerNameFromDoc: { $first: "$customerName" },
                totalAmount: { $first: "$totalAmount" },
                totalProfit: { $first: "$totalProfit" },
                amountPaid: { $first: "$amountPaid" },
                dueAmount: { $first: "$dueAmount" },
                cashReceived: { $first: "$cashReceived" },
                advanceUsed: { $first: "$advanceUsed" },
                dueDiscount: { $first: "$dueDiscount" },
                paymentStatus: { $first: "$paymentStatus" },
                type: { $first: "$type" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                items: {
                  $push: {
                    productId: "$items.productId",
                    quantity: "$items.quantity",
                    unitPrice: "$items.unitPrice",
                    costPrice: "$items.costPrice",
                    unit: "$items.unit",
                    isPiece: "$items.isPiece",
                    piecesPerUnit: "$items.piecesPerUnit",
                    productName: {
                      $ifNull: [
                        "$productDetails.displayName",
                        {
                          $ifNull: ["$productDetails.name", "Deleted Product"],
                        },
                      ],
                    },
                  },
                },
              },
            },
            {
              $addFields: {
                customerName: {
                  $ifNull: [
                    "$customerNameFromDetails",
                    { $ifNull: ["$customerNameFromDoc", "Walk-in Customer"] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
          ];
          result = await Transaction.aggregate(pipeline);
        } else {
          // Standard aggregation without heavy match
          result = await Transaction.aggregate([
            {
              $match: {
                type: "SALE",
                ...(rangeStart ? { createdAt: { $gte: rangeStart } } : {}),
              },
            },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
            {
              $lookup: {
                from: "products",
                let: { productId: "$items.productId" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$_id",
                          {
                            $convert: {
                              input: "$$productId",
                              to: "objectId",
                              onError: null,
                              onNull: null,
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
                as: "productDetails",
              },
            },
            {
              $unwind: {
                path: "$productDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $lookup: {
                from: "customers",
                let: { customerId: "$customerId" },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: [
                          "$_id",
                          {
                            $convert: {
                              input: "$$customerId",
                              to: "objectId",
                              onError: null,
                              onNull: null,
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
                as: "customerDetails",
              },
            },
            {
              $unwind: {
                path: "$customerDetails",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $group: {
                _id: "$_id",
                customerId: { $first: "$customerId" },
                customerNameFromDetails: { $first: "$customerDetails.name" },
                customerNameFromDoc: { $first: "$customerName" },
                totalAmount: { $first: "$totalAmount" },
                totalProfit: { $first: "$totalProfit" },
                amountPaid: { $first: "$amountPaid" },
                dueAmount: { $first: "$dueAmount" },
                cashReceived: { $first: "$cashReceived" },
                advanceUsed: { $first: "$advanceUsed" },
                dueDiscount: { $first: "$dueDiscount" },
                paymentStatus: { $first: "$paymentStatus" },
                type: { $first: "$type" },
                createdAt: { $first: "$createdAt" },
                updatedAt: { $first: "$updatedAt" },
                items: {
                  $push: {
                    productId: "$items.productId",
                    quantity: "$items.quantity",
                    unitPrice: "$items.unitPrice",
                    costPrice: "$items.costPrice",
                    unit: "$items.unit",
                    isPiece: "$items.isPiece",
                    piecesPerUnit: "$items.piecesPerUnit",
                    productName: {
                      $ifNull: [
                        "$productDetails.displayName",
                        {
                          $ifNull: ["$productDetails.name", "Deleted Product"],
                        },
                      ],
                    },
                  },
                },
              },
            },
            {
              $addFields: {
                customerName: {
                  $ifNull: [
                    "$customerNameFromDetails",
                    { $ifNull: ["$customerNameFromDoc", "Walk-in Customer"] },
                  ],
                },
              },
            },
            { $sort: { createdAt: -1 } },
          ]);
        }
      } catch (err) {
        throw err;
      }
    }

    if (!result) {
      const searchStr = searchTerm.toLowerCase();
      let filtered = localStore.transactions;
      if (searchStr) {
        filtered = filtered.filter(
          (t) =>
            (t._id && t._id.toLowerCase().includes(searchStr)) ||
            (t.customerName &&
              t.customerName.toLowerCase().includes(searchStr)),
        );
      }
      if (rangeStart) {
        filtered = filtered.filter(
          (transaction) => new Date(transaction.createdAt) >= rangeStart,
        );
      }

      // Enrich customerName and item product names if needed
      result = filtered.map((t) => {
        let custName = t.customerName;
        if (!custName && t.customerId) {
          const cust = localStore.customers.find((c) => c._id === t.customerId);
          custName = cust ? cust.name : "Walk-in Customer";
        }
        if (!custName) custName = "Walk-in Customer";

        const enrichedItems = t.items.map((item) => {
          if (!item.productName) {
            const prod = localStore.products.find(
              (p) => p._id === item.productId,
            );
            return {
              ...item,
              productName: prod?.displayName || prod?.name || "Product",
            };
          }
          return item;
        });

        const totalAmt = t.totalAmount || 0;
        const amtPaid = t.amountPaid !== undefined ? t.amountPaid : totalAmt;
        const dueAmt =
          t.dueAmount !== undefined
            ? t.dueAmount
            : Math.max(0, totalAmt - amtPaid);
        const payStatus =
          t.paymentStatus ||
          (dueAmt <= 0
            ? amtPaid > totalAmt
              ? "OVERPAID"
              : "PAID"
            : "PARTIAL");

        return {
          ...t,
          customerName: custName,
          items: enrichedItems,
          amountPaid: amtPaid,
          dueAmount: dueAmt,
          paymentStatus: payStatus,
        };
      });

      resultTotal = result.length;
      const paginatedResult = result.slice(skip, skip + limitNum);

      return sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Transactions fetched successfully",
        meta: { page: pageNum, limit: limitNum, total: resultTotal },
        data: paginatedResult,
      });
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Transactions fetched successfully",
      meta: { page: pageNum, limit: limitNum, total: resultTotal },
      data: result,
    });
  }),
);

// GET /:id - Single order details
router.get(
  "/product/:productId/intelligence",
  catchAsync(async (req, res) => {
    const { productId } = req.params;
    const range = String(req.query.range || "all");
    const buyerPage = Math.max(1, Number(req.query.buyerPage) || 1);
    const historyPage = Math.max(1, Number(req.query.historyPage) || 1);
    const buyerLimit = Math.min(
      Math.max(Number(req.query.buyerLimit) || 10, 1),
      50,
    );
    const historyLimit = Math.min(
      Math.max(Number(req.query.historyLimit) || 30, 1),
      50,
    );
    const buyerOrder = req.query.buyerOrder === "least" ? "least" : "most";
    const rangeStart = getDateRangeStart(range);
    const filter: Record<string, any> = {
      type: "SALE",
      "items.productId": productId,
    };
    if (rangeStart) filter.createdAt = { $gte: rangeStart };

    let orders: any[] = [];
    let buyerGroups: any[] = [];
    let transactionTotal = 0;
    if (mongoose.connection.readyState === 1) {
      try {
        [orders, buyerGroups, transactionTotal] = await Promise.all([
          Transaction.collection
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((historyPage - 1) * historyLimit)
            .limit(historyLimit)
            .toArray(),
          Transaction.collection
            .aggregate([
              { $match: filter },
              { $unwind: "$items" },
              { $match: { "items.productId": productId } },
              {
                $group: {
                  _id: {
                    customerId: { $ifNull: ["$customerId", "walk-in"] },
                    unit: { $ifNull: ["$items.unit", "Unit"] },
                  },
                  name: {
                    $first: { $ifNull: ["$customerName", "Walk-in Customer"] },
                  },
                  quantity: { $sum: { $ifNull: ["$items.quantity", 0] } },
                  totalUnits: {
                    $sum: {
                      $cond: [
                        { $eq: ["$items.isPiece", true] },
                        {
                          $divide: [
                            { $ifNull: ["$items.quantity", 0] },
                            {
                              $max: [
                                1,
                                { $ifNull: ["$items.piecesPerUnit", 1] },
                              ],
                            },
                          ],
                        },
                        { $ifNull: ["$items.quantity", 0] },
                      ],
                    },
                  },
                  totalSpent: {
                    $sum: {
                      $multiply: [
                        { $ifNull: ["$items.quantity", 0] },
                        { $ifNull: ["$items.unitPrice", 0] },
                      ],
                    },
                  },
                  totalProfit: {
                    $sum: {
                      $multiply: [
                        { $ifNull: ["$items.quantity", 0] },
                        {
                          $subtract: [
                            { $ifNull: ["$items.unitPrice", 0] },
                            { $ifNull: ["$items.costPrice", 0] },
                          ],
                        },
                      ],
                    },
                  },
                  orderIds: { $addToSet: "$_id" },
                  lastPurchaseDate: { $max: "$createdAt" },
                },
              },
              { $sort: { "_id.customerId": 1, "_id.unit": 1 } },
            ])
            .toArray(),
          Transaction.collection.countDocuments(filter),
        ]);
      } catch (err) {
        console.warn("DB product intelligence query failed:", err);
      }
    }

    if (mongoose.connection.readyState !== 1) {
      const localOrders = localStore.transactions.filter((transaction) => {
        const matchesProduct = transaction.items?.some(
          (item) => String(item.productId) === productId,
        );
        const matchesRange =
          !rangeStart || new Date(transaction.createdAt) >= rangeStart;
        return transaction.type === "SALE" && matchesProduct && matchesRange;
      });
      transactionTotal = localOrders.length;
      orders = localOrders
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )
        .slice((historyPage - 1) * historyLimit, historyPage * historyLimit);

      const buyers = new Map<string, any>();
      for (const transaction of localOrders) {
        const item = transaction.items.find(
          (line) => String(line.productId) === productId,
        );
        if (!item) continue;
        const customerId = String(transaction.customerId || "walk-in");
        const unit = item.unit || "Unit";
        const key = `${customerId}:${unit}`;
        const entry = buyers.get(key) || {
          _id: { customerId, unit },
          name: transaction.customerName || "Walk-in Customer",
          quantity: 0,
          totalUnits: 0,
          totalSpent: 0,
          totalProfit: 0,
          orderIds: [],
          lastPurchaseDate: transaction.createdAt,
        };
        const quantity = Number(item.quantity) || 0;
        const isPiece = item.isPiece === true || unit.toLowerCase() === "piece";
        const piecesPerUnit = Math.max(1, Number(item.piecesPerUnit) || 1);
        const costPrice = Number(item.costPrice) || 0;
        entry.quantity += quantity;
        entry.totalUnits += isPiece ? quantity / piecesPerUnit : quantity;
        entry.totalSpent += quantity * (Number(item.unitPrice) || 0);
        entry.totalProfit +=
          quantity * ((Number(item.unitPrice) || 0) - costPrice);
        entry.orderIds.push(transaction._id);
        entry.lastPurchaseDate =
          new Date(transaction.createdAt) > new Date(entry.lastPurchaseDate)
            ? transaction.createdAt
            : entry.lastPurchaseDate;
        buyers.set(key, entry);
      }
      buyerGroups = Array.from(buyers.values());
    }

    const buyerMap = new Map<string, any>();
    for (const group of buyerGroups) {
      const customerId = String(group._id.customerId || "walk-in");
      const entry = buyerMap.get(customerId) || {
        customerId,
        name: group.name || "Walk-in Customer",
        totalUnits: 0,
        quantitiesByUnit: {},
        totalSpent: 0,
        totalProfit: 0,
        orderIds: new Set<string>(),
        lastPurchaseDate: group.lastPurchaseDate,
      };
      entry.totalUnits += Number(group.totalUnits) || 0;
      entry.quantitiesByUnit[group._id.unit || "Unit"] =
        (entry.quantitiesByUnit[group._id.unit || "Unit"] || 0) +
        (Number(group.quantity) || 0);
      entry.totalSpent += Number(group.totalSpent) || 0;
      entry.totalProfit += Number(group.totalProfit) || 0;
      for (const orderId of group.orderIds || []) {
        entry.orderIds.add(String(orderId));
      }
      if (new Date(group.lastPurchaseDate) > new Date(entry.lastPurchaseDate)) {
        entry.lastPurchaseDate = group.lastPurchaseDate;
      }
      buyerMap.set(customerId, entry);
    }

    const allBuyers = Array.from(buyerMap.values()).map((buyer) => ({
      ...buyer,
      orderCount: buyer.orderIds.size,
      orderIds: undefined,
    }));
    allBuyers.sort((left, right) =>
      buyerOrder === "most"
        ? right.totalUnits - left.totalUnits
        : left.totalUnits - right.totalUnits,
    );
    const buyers = allBuyers.slice(
      (buyerPage - 1) * buyerLimit,
      buyerPage * buyerLimit,
    );

    const receiptProductIds = Array.from(
      new Set(
        orders.flatMap((order) =>
          (order.items || []).map((item: any) => String(item.productId)),
        ),
      ),
    );
    const objectIds = receiptProductIds
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    let dbProducts: any[] = [];
    if (mongoose.connection.readyState === 1 && objectIds.length > 0) {
      dbProducts = await Product.collection
        .find({ _id: { $in: objectIds } })
        .toArray()
        .catch(() => []);
    }
    const findProduct = (id: string) =>
      dbProducts.find((product) => String(product._id) === id) ||
      localStore.products.find((product) => product._id === id);
    const history = orders.map((order) => ({
      ...order,
      items: (order.items || []).map((item: any) => {
        const receiptProduct = findProduct(String(item.productId));
        const unitPrice = Number(
          item.unitPrice ?? item.price ?? item.sellPrice ?? 0,
        );
        return {
          ...item,
          unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
          productName:
            item.productName ||
            receiptProduct?.displayName ||
            receiptProduct?.name ||
            "Product",
        };
      }),
    }));
    const summary = allBuyers.reduce(
      (totals, buyer) => ({
        totalUnits: totals.totalUnits + buyer.totalUnits,
        totalRevenue: totals.totalRevenue + buyer.totalSpent,
        totalProfit: totals.totalProfit + buyer.totalProfit,
      }),
      { totalUnits: 0, totalRevenue: 0, totalProfit: 0 },
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product intelligence fetched successfully",
      meta: { page: historyPage, limit: historyLimit, total: transactionTotal },
      data: {
        buyers,
        buyerMeta: {
          page: buyerPage,
          limit: buyerLimit,
          total: allBuyers.length,
        },
        history,
        historyMeta: {
          page: historyPage,
          limit: historyLimit,
          total: transactionTotal,
        },
        summary,
      },
    });
  }),
);

router.get(
  "/product/:productId/history",
  catchAsync(async (req, res) => {
    const { productId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 30);
    const rangeStart = getDateRangeStart(String(req.query.range || "all"));
    const unit = String(req.query.unit || "");
    const itemFilter: Record<string, any> = { productId };
    if (unit) itemFilter.unit = unit;
    const filter: Record<string, any> = {
      items: { $elemMatch: itemFilter },
      type: "SALE",
    };
    if (rangeStart) filter.createdAt = { $gte: rangeStart };
    let orders: any[] = [];
    let total = 0;

    if (mongoose.connection.readyState === 1) {
      try {
        [orders, total] = await Promise.all([
          Transaction.collection
            .find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray(),
          Transaction.collection.countDocuments(filter),
        ]);
      } catch (err) {
        console.warn("DB get product sales history failed:", err);
      }
    }

    if (mongoose.connection.readyState !== 1) {
      const localOrders = localStore.transactions.filter(
        (transaction) =>
          transaction.type === "SALE" &&
          (!rangeStart || new Date(transaction.createdAt) >= rangeStart) &&
          transaction.items?.some(
            (item) =>
              String(item.productId) === productId &&
              (!unit || (item.unit || "Unit") === unit),
          ),
      );
      total = localOrders.length;
      orders = localOrders
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        )
        .slice((page - 1) * limit, page * limit);
    }

    orders.sort(
      (left, right) =>
        new Date(right.createdAt || right.orderDate || right.date).getTime() -
        new Date(left.createdAt || left.orderDate || left.date).getTime(),
    );

    const matchingSales = orders.flatMap((order) =>
      (order.items || [])
        .filter(
          (item: any) =>
            String(item.productId) === productId &&
            (!unit || (item.unit || "Unit") === unit),
        )
        .map((item: any) => ({ order, item })),
    );
    const recentSales = matchingSales;
    const receiptProductIds = Array.from(
      new Set(
        recentSales.flatMap(({ order }) =>
          (order.items || []).map((item: any) => String(item.productId)),
        ),
      ),
    );
    const databaseProductIds = receiptProductIds
      .filter((id) => /^[a-f\d]{24}$/i.test(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    let databaseProducts: any[] = [];
    if (mongoose.connection.readyState === 1 && databaseProductIds.length > 0) {
      try {
        databaseProducts = await Product.collection
          .find({ _id: { $in: databaseProductIds } })
          .toArray();
      } catch (err) {
        console.warn("DB enrich product sales history failed:", err);
      }
    }
    const findProduct = (id: string) =>
      databaseProducts.find((product) => String(product._id) === id) ||
      localStore.products.find((product) => product._id === id);
    const data = recentSales.map(({ order, item }) => {
      const receipt = {
        ...order,
        items: (order.items || []).map((receiptItem: any) => {
          const receiptProduct = findProduct(String(receiptItem.productId));
          return {
            ...receiptItem,
            productName:
              receiptItem.productName ||
              receiptProduct?.displayName ||
              receiptProduct?.name ||
              "Product",
          };
        }),
      };
      const product = findProduct(String(item.productId));
      return {
        orderId: String(order._id || order.id),
        date: order.createdAt || order.orderDate || order.date,
        customerName: order.customerName || "Walk-in Customer",
        productName:
          item.productName ||
          product?.displayName ||
          product?.name ||
          "Product",
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        unit: item.unit || product?.unit || "Unit",
        receipt,
      };
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Product sales history fetched successfully",
      meta: { page, limit, total },
      data,
    });
  }),
);

router.get(
  "/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    let order: any = null;
    if (mongoose.connection.readyState === 1) {
      try {
        order = (await Transaction.findById(id).lean()) as any;
      } catch (err) {
        console.warn("DB get transaction failed:", err);
      }
    }
    if (!order) {
      order = localStore.transactions.find((t) => t._id === id);
    }

    if (!order) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Order not found",
        data: null,
      });
    }

    let custName = order.customerName;
    if (!custName && order.customerId) {
      const cust = localStore.customers.find((c) => c._id === order.customerId);
      custName = cust ? cust.name : "Walk-in Customer";
    }

    const enrichedItems = (order.items || []).map((item) => {
      const prod = localStore.products.find((p) => p._id === item.productId);
      return {
        ...item,
        productName:
          item.productName || prod?.displayName || prod?.name || "Product",
        costPrice:
          item.costPrice !== undefined ? item.costPrice : prod?.buyPrice || 0,
      };
    });

    const totalAmt = order.totalAmount || 0;
    const amtPaid =
      order.amountPaid !== undefined ? order.amountPaid : totalAmt;
    const dueAmt =
      order.dueAmount !== undefined
        ? order.dueAmount
        : Math.max(0, totalAmt - amtPaid);
    const payStatus =
      order.paymentStatus ||
      (dueAmt <= 0 ? (amtPaid > totalAmt ? "OVERPAID" : "PAID") : "PARTIAL");

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Transaction fetched successfully",
      data: {
        ...order,
        customerName: custName || "Walk-in Customer",
        items: enrichedItems,
        amountPaid: amtPaid,
        dueAmount: dueAmt,
        paymentStatus: payStatus,
      },
    });
  }),
);

router.post(
  "/",
  catchAsync(async (req, res) => {
    let result;
    const items = req.body.items || [];
    const requestedTotal = Number(req.body.totalAmount) || 0;
    // Calculate total amount from items if not directly provided
    const computedTotal = items.reduce(
      (sum: number, it: any) =>
        sum + (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0),
      0,
    );
    const totalAmount = requestedTotal > 0 ? requestedTotal : computedTotal;

    // Paid amount entered by user ("koto tk paisi")
    const cashReceived =
      req.body.cashReceived !== undefined && req.body.cashReceived !== ""
        ? Math.max(0, Number(req.body.cashReceived) || 0)
        : req.body.amountPaid !== undefined && req.body.amountPaid !== ""
          ? Math.max(0, Number(req.body.amountPaid) || 0)
          : totalAmount;
    let advanceUsed = 0;
    let amountPaid = cashReceived;

    // Remaining due ("baki tk gula oi customer er kas theke pabo tar hisab e ode jabe")
    let dueAmount = Math.max(0, totalAmount - amountPaid);

    // Payment status
    let paymentStatus: "PAID" | "PARTIAL" | "UNPAID" | "OVERPAID" = "PAID";
    if (amountPaid === 0) {
      paymentStatus = "UNPAID";
    } else if (dueAmount > 0) {
      paymentStatus = "PARTIAL";
    } else if (amountPaid > totalAmount) {
      paymentStatus = "OVERPAID";
    }

    if (mongoose.connection.readyState === 1) {
      try {
        const customerId = String(req.body.customerId || "");
        const databaseCustomer =
          customerId && customerId !== "unknown"
            ? await Customer.findById(customerId).catch(() => null)
            : null;
        const requestedAdvanceUsed = Math.max(
          0,
          Number(req.body.advanceUsed) || 0,
        );
        advanceUsed = databaseCustomer
          ? Math.min(
              requestedAdvanceUsed,
              Number(databaseCustomer.advanceBalance) || 0,
              Math.max(0, totalAmount - cashReceived),
            )
          : 0;
        amountPaid = cashReceived + advanceUsed;
        dueAmount = Math.max(0, totalAmount - amountPaid);
        paymentStatus =
          amountPaid === 0
            ? "UNPAID"
            : dueAmount > 0
              ? "PARTIAL"
              : amountPaid > totalAmount
                ? "OVERPAID"
                : "PAID";

        const enrichedItems = [];
        let totalProfit = 0;

        for (const item of items) {
          const product =
            (await Product.findById(item.productId).catch(() => null)) ||
            (await Product.findOne({ _id: item.productId }).catch(
              () => null,
            )) ||
            localStore.products.find((p) => p._id === item.productId);

          const resolved = resolveSaleUnit(item, product as any);
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          const costPrice = resolved.costPrice;
          const lineProfit = (unitPrice - costPrice) * quantity;
          totalProfit += lineProfit;

          enrichedItems.push({
            ...item,
            quantity,
            unitPrice,
            costPrice,
            unit: resolved.unit,
            isPiece: resolved.isPiece,
            piecesPerUnit: resolved.piecesPerUnit,
            productName:
              item.productName ||
              (product as any)?.displayName ||
              (product as any)?.name ||
              "Product",
          });

          // Deduct stock from StockItem
          const deductQty = resolved.isPiece
            ? quantity / resolved.piecesPerUnit
            : quantity;
          await StockItem.findOneAndUpdate(
            { productId: item.productId },
            {
              $inc: {
                quantity: -deductQty,
              },
            },
          ).catch(() => null);
        }

        result = await Transaction.create({
          ...req.body,
          items: enrichedItems,
          totalAmount,
          totalProfit,
          amountPaid,
          cashReceived,
          advanceUsed,
          dueAmount,
          paymentStatus,
        });

        if (databaseCustomer) {
          const now = new Date();
          const previousDue = Number(databaseCustomer.dueBalance) || 0;
          const previousAdvance = Number(databaseCustomer.advanceBalance) || 0;
          const surplusAdvance = Math.max(
            0,
            cashReceived - (totalAmount - advanceUsed),
          );
          databaseCustomer.totalSpent =
            (Number(databaseCustomer.totalSpent) || 0) + totalAmount;
          databaseCustomer.dueBalance = previousDue + dueAmount;
          databaseCustomer.advanceBalance = Math.max(
            0,
            previousAdvance - advanceUsed + surplusAdvance,
          );
          databaseCustomer.lastPurchaseDate = now;
          const ledgerEvents = [];
          if (cashReceived > 0) {
            ledgerEvents.push({
              amount: cashReceived,
              type: "SALE_PAYMENT",
              paymentMethod: req.body.paymentMethod || "Cash",
              direction: "CASH_RECEIVED",
              referenceId: String(result._id),
              balanceDueAfter: databaseCustomer.dueBalance,
              balanceAdvanceAfter: databaseCustomer.advanceBalance,
              createdAt: now,
            });
          }
          if (advanceUsed > 0) {
            ledgerEvents.push({
              amount: advanceUsed,
              type: "ADVANCE_APPLIED",
              paymentMethod: "Advance Credit",
              direction: "ADVANCE_USED",
              referenceId: String(result._id),
              balanceDueAfter: databaseCustomer.dueBalance,
              balanceAdvanceAfter: databaseCustomer.advanceBalance,
              createdAt: now,
            });
          }
          if (dueAmount > 0) {
            ledgerEvents.push({
              amount: dueAmount,
              type: "SALE_DUE_CREATED",
              paymentMethod: "Account",
              direction: "DUE_CREATED",
              referenceId: String(result._id),
              balanceDueAfter: databaseCustomer.dueBalance,
              balanceAdvanceAfter: databaseCustomer.advanceBalance,
              createdAt: now,
            });
          }
          if (surplusAdvance > 0) {
            ledgerEvents.push({
              amount: surplusAdvance,
              type: "SALE_OVERPAYMENT",
              paymentMethod: req.body.paymentMethod || "Cash",
              direction: "ADVANCE_CREATED",
              referenceId: String(result._id),
              balanceDueAfter: databaseCustomer.dueBalance,
              balanceAdvanceAfter: databaseCustomer.advanceBalance,
              createdAt: now,
            });
          }
          databaseCustomer.adjustments.push(...ledgerEvents);
          await databaseCustomer.save();
        }
      } catch (err) {
        throw err;
      }
    }

    if (!result) {
      let totalProfit = 0;
      const enrichedItems = items.map((item: any) => {
        const prod = localStore.products.find(
          (p) => p._id === item.productId || (p as any).id === item.productId,
        );
        const resolved = resolveSaleUnit(item, prod);
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        const costPrice = resolved.costPrice;
        const lineProfit = (unitPrice - costPrice) * quantity;
        totalProfit += lineProfit;

        // Deduct from in-memory stock
        const stockItem = localStore.stock.find(
          (s) => s.productId === item.productId,
        );
        const deductQty = resolved.isPiece
          ? quantity / resolved.piecesPerUnit
          : quantity;
        if (stockItem) {
          stockItem.quantity = Math.max(0, stockItem.quantity - deductQty);
          stockItem.updatedAt = new Date().toISOString();
        }

        return {
          ...item,
          quantity,
          unitPrice,
          productName:
            prod?.displayName || prod?.name || item.productName || "Product",
          costPrice,
          unit: resolved.unit,
          isPiece: resolved.isPiece,
          piecesPerUnit: resolved.piecesPerUnit,
        };
      });

      // Update customer totalSpent and due/advance balances if customer specified
      const localTransactionId = `t_${Date.now()}`;
      let customerName = req.body.customerName;
      if (req.body.customerId && req.body.customerId !== "unknown") {
        const cust = localStore.customers.find(
          (c) => c._id === req.body.customerId,
        );
        if (cust) {
          customerName = cust.name;
          if (cust.dueBalance === undefined) cust.dueBalance = 0;
          if (cust.advanceBalance === undefined) cust.advanceBalance = 0;
          advanceUsed = Math.min(
            Math.max(0, Number(req.body.advanceUsed) || 0),
            cust.advanceBalance,
            Math.max(0, totalAmount - cashReceived),
          );
          amountPaid = cashReceived + advanceUsed;
          dueAmount = Math.max(0, totalAmount - amountPaid);
          paymentStatus =
            amountPaid === 0
              ? "UNPAID"
              : dueAmount > 0
                ? "PARTIAL"
                : amountPaid > totalAmount
                  ? "OVERPAID"
                  : "PAID";

          const now = new Date().toISOString();
          const previousDue = cust.dueBalance;
          const previousAdvance = cust.advanceBalance;
          const surplusAdvance = Math.max(
            0,
            cashReceived - (totalAmount - advanceUsed),
          );
          cust.totalSpent = (cust.totalSpent || 0) + totalAmount;
          cust.dueBalance = previousDue + dueAmount;
          cust.advanceBalance = Math.max(
            0,
            previousAdvance - advanceUsed + surplusAdvance,
          );
          cust.lastPurchaseDate = now;
          cust.updatedAt = now;

          if (!localStore.adjustments) {
            (localStore as any).adjustments = [];
          }
          const paymentEvents = [
            ...(cashReceived > 0
              ? [
                  {
                    amount: cashReceived,
                    type: "SALE_PAYMENT",
                    direction: "CASH_RECEIVED",
                  },
                ]
              : []),
            ...(advanceUsed > 0
              ? [
                  {
                    amount: advanceUsed,
                    type: "ADVANCE_APPLIED",
                    direction: "ADVANCE_USED",
                  },
                ]
              : []),
            ...(dueAmount > 0
              ? [
                  {
                    amount: dueAmount,
                    type: "SALE_DUE_CREATED",
                    direction: "DUE_CREATED",
                  },
                ]
              : []),
            ...(surplusAdvance > 0
              ? [
                  {
                    amount: surplusAdvance,
                    type: "SALE_OVERPAYMENT",
                    direction: "ADVANCE_CREATED",
                  },
                ]
              : []),
          ];
          paymentEvents.forEach((event) => {
            (localStore.adjustments as any[]).unshift({
              ...event,
              _id: `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              customerId: req.body.customerId,
              paymentMethod: req.body.paymentMethod || "Cash",
              referenceId: localTransactionId,
              balanceDueAfter: cust.dueBalance,
              balanceAdvanceAfter: cust.advanceBalance,
              createdAt: now,
            });
          });
        }
      }

      result = {
        _id: localTransactionId,
        type: req.body.type || "SALE",
        customerId: req.body.customerId || "unknown",
        customerName: customerName || "Walk-in Customer",
        totalAmount,
        totalProfit,
        amountPaid,
        cashReceived,
        advanceUsed,
        dueAmount,
        paymentStatus,
        items: enrichedItems,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      localStore.transactions.unshift(result);
    }

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Transaction recorded successfully",
      data: result,
    });
  }),
);

// PUT /:id - Edit sales order / receipt items, prices, quantities, and paid amount
// ("sels oder e recipt er item producty proice sob edit korte parbo ..cz recipt korar por jodi costomer oi kiso product na nete cay ...tai")
router.put(
  "/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const existingIndex = localStore.transactions.findIndex(
      (t) => t._id === id,
    );
    let databaseOrder: any = null;
    if (existingIndex === -1 && mongoose.connection.readyState === 1) {
      try {
        const orderIdCandidates: any[] = [id];
        if (/^[a-f\d]{24}$/i.test(id)) {
          orderIdCandidates.unshift(new mongoose.Types.ObjectId(id));
        }
        for (const candidate of orderIdCandidates) {
          databaseOrder = await Transaction.collection.findOne({
            _id: candidate,
          });
          if (databaseOrder) break;
        }
      } catch {
        databaseOrder = null;
      }
    }

    if (existingIndex === -1 && !databaseOrder) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Order not found",
        data: null,
      });
    }

    const isDatabaseOrder = existingIndex === -1;
    const oldOrder = isDatabaseOrder
      ? databaseOrder
      : localStore.transactions[existingIndex];
    const newItems = req.body.items || [];
    const customerId = oldOrder.customerId;
    const affectedProductIds = Array.from(
      new Set([
        ...(oldOrder.items || []).map((item: any) => String(item.productId)),
        ...newItems.map((item: any) => String(item.productId)),
      ]),
    );
    const databaseProducts = isDatabaseOrder
      ? await Product.find({ _id: { $in: affectedProductIds } }).lean()
      : [];
    const findProduct = (productId: string) =>
      databaseProducts.find(
        (product: any) => String(product._id) === productId,
      ) || localStore.products.find((product) => product._id === productId);

    // 1. Stock Adjustment Logic:
    // For each old item, track what was deducted
    const oldQtyMap = new Map<string, number>();
    (oldOrder.items || []).forEach((it) => {
      const product = findProduct(String(it.productId));
      const { isPiece, piecesPerUnit } = resolveSaleUnit(it, product);
      const stockQuantity = isPiece
        ? (Number(it.quantity) || 0) / piecesPerUnit
        : Number(it.quantity) || 0;
      oldQtyMap.set(
        it.productId,
        (oldQtyMap.get(it.productId) || 0) + stockQuantity,
      );
    });

    const newQtyMap = new Map<string, number>();
    newItems.forEach((it: any) => {
      const product = findProduct(String(it.productId));
      const { isPiece, piecesPerUnit } = resolveSaleUnit(it, product);
      const stockQuantity = isPiece
        ? (Number(it.quantity) || 0) / piecesPerUnit
        : Number(it.quantity) || 0;
      newQtyMap.set(
        it.productId,
        (newQtyMap.get(it.productId) || 0) + stockQuantity,
      );
    });

    // Reconcile stock for all affected products
    const allProductIds = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
    for (const pId of allProductIds) {
      const oldQty = oldQtyMap.get(pId) || 0;
      const newQty = newQtyMap.get(pId) || 0;
      const diff = newQty - oldQty; // positive: more sold (deduct stock), negative: returned/removed (return stock)

      if (isDatabaseOrder) {
        const stockItem = await StockItem.findOne({ productId: pId });
        if (stockItem) {
          stockItem.quantity = Math.max(0, stockItem.quantity - diff);
          await stockItem.save();
        }
      } else {
        const stockItem = localStore.stock.find((s) => s.productId === pId);
        if (stockItem) {
          stockItem.quantity = Math.max(0, stockItem.quantity - diff);
          stockItem.updatedAt = new Date().toISOString();
        }
      }
    }

    // 2. Recompute Order Totals and Profits
    let newTotalAmount = 0;
    let newTotalProfit = 0;
    const enrichedNewItems = newItems.map((item: any) => {
      const prod = findProduct(String(item.productId));
      const { unit, isPiece, piecesPerUnit, costPrice } = resolveSaleUnit(
        item,
        prod,
      );
      const unitPrice = Number(item.unitPrice) || 0;
      const quantity = Number(item.quantity) || 0;
      const lineTotal = unitPrice * quantity;
      newTotalAmount += lineTotal;
      newTotalProfit += (unitPrice - costPrice) * quantity;

      return {
        productId: item.productId,
        productName:
          item.productName || prod?.displayName || prod?.name || "Product",
        quantity,
        unitPrice,
        costPrice,
        unit,
        isPiece,
        piecesPerUnit,
      };
    });

    // 3. Paid & Due amounts calculation
    const requestedAmountPaid =
      req.body.amountPaid !== undefined && req.body.amountPaid !== ""
        ? Number(req.body.amountPaid)
        : oldOrder.amountPaid !== undefined
          ? oldOrder.amountPaid
          : newTotalAmount;
    const oldAdvanceUsed = Math.max(0, Number(oldOrder.advanceUsed) || 0);
    const oldCashReceived = Math.max(
      0,
      Number(
        oldOrder.cashReceived ?? oldOrder.amountPaid ?? oldOrder.totalAmount,
      ) || 0,
    );
    const newAdvanceUsed = Math.min(
      oldAdvanceUsed,
      Math.max(0, requestedAmountPaid),
      newTotalAmount,
    );
    const newCashReceived = Math.max(0, requestedAmountPaid - newAdvanceUsed);
    const newAmountPaid = newCashReceived + newAdvanceUsed;
    const newDueDiscount = Math.min(
      Math.max(0, Number(oldOrder.dueDiscount) || 0),
      Math.max(0, newTotalAmount - newAmountPaid),
    );

    const newDueAmount = Math.max(
      0,
      newTotalAmount - newAmountPaid - newDueDiscount,
    );
    const oldSurplusAdvance = Math.max(
      0,
      oldCashReceived - ((Number(oldOrder.totalAmount) || 0) - oldAdvanceUsed),
    );
    const newSurplusAdvance = Math.max(
      0,
      newCashReceived - (newTotalAmount - newAdvanceUsed),
    );
    const advanceBalanceChange =
      newSurplusAdvance - oldSurplusAdvance - (newAdvanceUsed - oldAdvanceUsed);

    let newPaymentStatus: "PAID" | "PARTIAL" | "UNPAID" | "OVERPAID" = "PAID";
    if (newAmountPaid === 0) {
      newPaymentStatus = "UNPAID";
    } else if (newDueAmount > 0) {
      newPaymentStatus = "PARTIAL";
    } else if (newAmountPaid > newTotalAmount) {
      newPaymentStatus = "OVERPAID";
    }

    // 4. Adjust Customer Balance
    if (customerId && customerId !== "unknown") {
      const cust: any = isDatabaseOrder
        ? await Customer.findById(customerId)
        : localStore.customers.find((c) => c._id === customerId);
      if (cust) {
        if (cust.dueBalance === undefined) cust.dueBalance = 0;
        if (cust.advanceBalance === undefined) cust.advanceBalance = 0;

        // Reconcile totalSpent
        const spentDiff = newTotalAmount - (oldOrder.totalAmount || 0);
        cust.totalSpent = Math.max(0, (cust.totalSpent || 0) + spentDiff);

        // Reconcile dueBalance: reverse old due impact, apply new due impact
        const oldDue =
          oldOrder.dueAmount !== undefined
            ? Number(oldOrder.dueAmount) || 0
            : Math.max(
                0,
                (Number(oldOrder.totalAmount) || 0) -
                  oldCashReceived -
                  oldAdvanceUsed -
                  (Number(oldOrder.dueDiscount) || 0),
              );
        const dueDiff = newDueAmount - oldDue;
        cust.dueBalance = Math.max(0, cust.dueBalance + dueDiff);
        cust.advanceBalance = Math.max(
          0,
          (Number(cust.advanceBalance) || 0) + advanceBalanceChange,
        );

        if (dueDiff !== 0 || advanceBalanceChange !== 0) {
          const event = {
            amount: Math.abs(dueDiff) + Math.abs(advanceBalanceChange),
            type: "SALE_RECONCILIATION",
            paymentMethod: "Receipt edit",
            notes: `Receipt ${id} updated; due change ${dueDiff}, advance change ${advanceBalanceChange}`,
            direction: "RECONCILED",
            referenceId: id,
            balanceDueAfter: cust.dueBalance,
            balanceAdvanceAfter: cust.advanceBalance,
            createdAt: new Date(),
          };
          if (isDatabaseOrder) {
            cust.adjustments.push(event);
          } else {
            (localStore.adjustments as any[]).unshift({
              ...event,
              _id: `ledger_${Date.now()}`,
              customerId,
              createdAt: event.createdAt.toISOString(),
            });
          }
        }

        if (isDatabaseOrder) {
          await cust.save();
        } else {
          cust.updatedAt = new Date().toISOString();
        }
      }
    }

    // 5. Save updated transaction
    const updatedTransaction = {
      ...oldOrder,
      items: enrichedNewItems,
      totalAmount: newTotalAmount,
      totalProfit: newTotalProfit,
      amountPaid: newAmountPaid,
      cashReceived: newCashReceived,
      advanceUsed: newAdvanceUsed,
      dueDiscount: newDueDiscount,
      dueAmount: newDueAmount,
      paymentStatus: newPaymentStatus,
      updatedAt: new Date().toISOString(),
    };

    if (isDatabaseOrder) {
      const { _id: unchangedId, ...fieldsToUpdate } = updatedTransaction;
      fieldsToUpdate.updatedAt = new Date();
      await Transaction.collection.updateOne(
        { _id: unchangedId },
        { $set: fieldsToUpdate },
      );
    } else {
      localStore.transactions[existingIndex] = updatedTransaction;
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Order and receipt updated successfully",
      data: updatedTransaction,
    });
  }),
);

export const TransactionRoutes = router;
