import { Router } from "express";
import mongoose from "mongoose";
import catchAsync from "../../shared/catchasync";
import sendResponse from "../../utils/sendResponse";
import { Customer } from "./customer.model";
import { Transaction } from "../transactions/transaction.model";
import { Product } from "../inventory/inventory.model";
import { localStore } from "../common/localStore";
import { resolveSaleUnit } from "../../utils/salesUnits";
import { getDateRangeStart } from "../../utils/dateRange";

const router = Router();

async function getCustomerTransactions(customerId: string, range = "all") {
  const rangeStart = getDateRangeStart(range);
  if (mongoose.connection.readyState === 1) {
    try {
      const customerIdCandidates: any[] = [customerId];
      if (/^[a-f\d]{24}$/i.test(customerId)) {
        customerIdCandidates.push(new mongoose.Types.ObjectId(customerId));
      }
      const filter: Record<string, any> = {
        customerId: { $in: customerIdCandidates },
        type: "SALE",
      };
      if (rangeStart) filter.createdAt = { $gte: rangeStart };
      return await Transaction.collection
        .find(filter)
        .sort({ createdAt: -1 })
        .toArray();
    } catch (err) {
      console.warn("DB get customer transactions failed:", err);
    }
  }

  return localStore.transactions.filter(
    (transaction) =>
      String(transaction.customerId) === customerId &&
      transaction.type === "SALE" &&
      (!rangeStart || new Date(transaction.createdAt) >= rangeStart),
  );
}

async function getCustomerTransactionPage(
  customerId: string,
  range: string,
  page: number,
  limit: number,
) {
  const rangeStart = getDateRangeStart(range);
  const customerIdCandidates: any[] = [customerId];
  if (/^[a-f\d]{24}$/i.test(customerId)) {
    customerIdCandidates.push(new mongoose.Types.ObjectId(customerId));
  }
  const filter: Record<string, any> = {
    customerId: { $in: customerIdCandidates },
    type: "SALE",
  };
  if (rangeStart) filter.createdAt = { $gte: rangeStart };

  if (mongoose.connection.readyState === 1) {
    try {
      const [orders, total] = await Promise.all([
        Transaction.collection
          .find(filter)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .toArray(),
        Transaction.collection.countDocuments(filter),
      ]);
      return { orders, total };
    } catch (err) {
      console.warn("DB get paginated customer transactions failed:", err);
    }
  }

  const filtered = localStore.transactions
    .filter(
      (transaction) =>
        String(transaction.customerId) === customerId &&
        transaction.type === "SALE" &&
        (!rangeStart || new Date(transaction.createdAt) >= rangeStart),
    )
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
        new Date(left.createdAt).getTime(),
    );
  return {
    orders: filtered.slice((page - 1) * limit, page * limit),
    total: filtered.length,
  };
}

async function allocateToOpenOrders(
  customerId: string,
  amount: number,
  mode: "PAYMENT" | "ADVANCE" | "DISCOUNT",
  createdAt: Date,
) {
  let remaining = amount;
  const allocations: { transactionId: string; amount: number }[] = [];

  if (mongoose.connection.readyState === 1) {
    const customerIdCandidates: any[] = [customerId];
    if (/^[a-f\d]{24}$/i.test(customerId)) {
      customerIdCandidates.push(new mongoose.Types.ObjectId(customerId));
    }
    const transactions = await Transaction.collection
      .find({ customerId: { $in: customerIdCandidates }, type: "SALE" })
      .sort({ createdAt: 1 })
      .toArray();

    for (const transaction of transactions) {
      if (remaining <= 0) break;
      const totalAmount = Number(transaction.totalAmount) || 0;
      const amountPaid = Number(transaction.amountPaid) || 0;
      const dueDiscount = Number(transaction.dueDiscount) || 0;
      const dueAmount =
        transaction.dueAmount !== undefined
          ? Number(transaction.dueAmount) || 0
          : Math.max(0, totalAmount - amountPaid - dueDiscount);
      const allocated = Math.min(remaining, dueAmount);
      if (allocated <= 0) continue;

      const nextDue = dueAmount - allocated;
      const nextPaid =
        mode === "PAYMENT" || mode === "ADVANCE"
          ? amountPaid + allocated
          : amountPaid;
      const nextDiscount =
        mode === "DISCOUNT" ? dueDiscount + allocated : dueDiscount;
      const paymentStatus =
        nextDue <= 0 ? "PAID" : nextPaid > 0 ? "PARTIAL" : "UNPAID";
      const updateFields: Record<string, any> = {
        dueAmount: nextDue,
        paymentStatus,
        updatedAt: createdAt,
      };
      if (mode === "PAYMENT") {
        updateFields.amountPaid = nextPaid;
        updateFields.cashReceived =
          (Number(transaction.cashReceived ?? transaction.amountPaid) || 0) +
          allocated;
      } else if (mode === "ADVANCE") {
        updateFields.amountPaid = nextPaid;
        updateFields.advanceUsed =
          (Number(transaction.advanceUsed) || 0) + allocated;
      } else {
        updateFields.dueDiscount = nextDiscount;
      }

      await Transaction.collection.updateOne(
        { _id: transaction._id },
        { $set: updateFields },
      );
      allocations.push({
        transactionId: String(transaction._id),
        amount: allocated,
      });
      remaining -= allocated;
    }
  } else {
    const transactions = localStore.transactions
      .filter(
        (transaction) =>
          String(transaction.customerId) === customerId &&
          transaction.type === "SALE",
      )
      .sort(
        (left, right) =>
          new Date(left.createdAt).getTime() -
          new Date(right.createdAt).getTime(),
      );

    for (const transaction of transactions as any[]) {
      if (remaining <= 0) break;
      const totalAmount = Number(transaction.totalAmount) || 0;
      const amountPaid = Number(transaction.amountPaid) || 0;
      const dueDiscount = Number(transaction.dueDiscount) || 0;
      const dueAmount =
        transaction.dueAmount !== undefined
          ? Number(transaction.dueAmount) || 0
          : Math.max(0, totalAmount - amountPaid - dueDiscount);
      const allocated = Math.min(remaining, dueAmount);
      if (allocated <= 0) continue;

      const previousCashReceived =
        Number(transaction.cashReceived ?? transaction.amountPaid) || 0;
      transaction.dueAmount = dueAmount - allocated;
      transaction.paymentStatus =
        transaction.dueAmount > 0 ? "PARTIAL" : "PAID";
      transaction.updatedAt = createdAt.toISOString();
      if (mode === "PAYMENT") {
        transaction.amountPaid = amountPaid + allocated;
        transaction.cashReceived = previousCashReceived + allocated;
      } else if (mode === "ADVANCE") {
        transaction.amountPaid = amountPaid + allocated;
        transaction.advanceUsed =
          (Number(transaction.advanceUsed) || 0) + allocated;
      } else {
        transaction.dueDiscount = dueDiscount + allocated;
      }
      allocations.push({
        transactionId: String(transaction._id),
        amount: allocated,
      });
      remaining -= allocated;
    }
  }

  return allocations;
}

router.post(
  "/",
  catchAsync(async (req, res) => {
    let result;
    if (mongoose.connection.readyState === 1) {
      try {
        result = await Customer.create(req.body);
      } catch (err) {
        console.warn(
          "DB create customer failed, falling back to localStore:",
          err,
        );
      }
    }

    if (!result) {
      result = {
        ...req.body,
        _id: `c_${Date.now()}`,
        totalSpent: 0,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      localStore.customers.unshift(result);
    }

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Customer created successfully",
      data: result,
    });
  }),
);

router.get(
  "/",
  catchAsync(async (req, res) => {
    const { search = "", page = 1, limit = 10, range = "all" } = req.query;
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    if (mongoose.connection.readyState === 1) {
      try {
        const searchStr = String(search).trim();
        const query: any = { isDeleted: false };
        const rangeStart = getDateRangeStart(String(range));
        if (rangeStart) query.createdAt = { $gte: rangeStart };

        if (searchStr) {
          query.$or = [
            { name: { $regex: searchStr, $options: "i" } },
            { phone: { $regex: searchStr, $options: "i" } },
            { email: { $regex: searchStr, $options: "i" } },
          ];
        }

        const [result, total] = await Promise.all([
          Customer.find(query)
            .skip(skip)
            .limit(limitNum)
            .sort({ createdAt: -1 }),
          Customer.countDocuments(query),
        ]);

        return sendResponse(res, {
          statusCode: 200,
          success: true,
          message: "Customers fetched successfully",
          meta: { page: pageNum, limit: limitNum, total },
          data: result,
        });
      } catch (err) {
        console.warn(
          "DB get customers failed, falling back to localStore:",
          err,
        );
      }
    }

    // In-memory fallback
    const searchStr = String(search).toLowerCase().trim();
    const rangeStart = getDateRangeStart(String(range));
    let filtered = localStore.customers.filter((c) => !c.isDeleted);
    if (rangeStart) {
      filtered = filtered.filter(
        (customer) => new Date(customer.createdAt) >= rangeStart,
      );
    }
    if (searchStr) {
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(searchStr) ||
          (c.phone && c.phone.toLowerCase().includes(searchStr)) ||
          (c.email && c.email.toLowerCase().includes(searchStr)),
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limitNum);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Customers fetched successfully",
      meta: { page: pageNum, limit: limitNum, total },
      data: paginated,
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
        result = await Customer.findByIdAndUpdate(id, req.body, { new: true });
      } catch (err) {
        console.warn(
          "DB update customer failed, falling back to localStore:",
          err,
        );
      }
    }

    if (!result) {
      const idx = localStore.customers.findIndex((c) => c._id === id);
      if (idx !== -1) {
        localStore.customers[idx] = {
          ...localStore.customers[idx],
          ...req.body,
          updatedAt: new Date().toISOString(),
        };
        result = localStore.customers[idx];
      }
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Customer updated successfully",
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
        result = await Customer.findByIdAndUpdate(
          id,
          { isDeleted: true },
          { new: true },
        );
      } catch (err) {
        console.warn(
          "DB delete customer failed, falling back to localStore:",
          err,
        );
      }
    }

    if (!result) {
      const idx = localStore.customers.findIndex((c) => c._id === id);
      if (idx !== -1) {
        localStore.customers[idx].isDeleted = true;
        result = localStore.customers[idx];
      }
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Customer deleted successfully",
      data: result,
    });
  }),
);

// GET /:id - Single customer with financial balances and stats
router.get(
  "/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    let customer: any;
    if (mongoose.connection.readyState === 1) {
      try {
        customer = await Customer.findById(id).lean();
      } catch (err) {
        console.warn("DB get customer failed:", err);
      }
    }
    if (!customer) {
      customer = localStore.customers.find((c) => c._id === id);
    }
    if (!customer) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Customer not found",
        data: null,
      });
    }

    // Compute metrics from the same database used by sales transactions.
    const custTransactions = await getCustomerTransactions(id);
    const totalOrders = custTransactions.length;
    const totalLifetimeProfit = custTransactions.reduce((sum, transaction) => {
      if (transaction.totalProfit !== undefined) {
        return sum + (Number(transaction.totalProfit) || 0);
      }
      const transactionProfit = (transaction.items || []).reduce(
        (itemSum, item) => {
          const product = localStore.products.find(
            (p) => p._id === item.productId,
          );
          const { costPrice } = resolveSaleUnit(item, product);
          return (
            itemSum +
            ((Number(item.unitPrice) || 0) - costPrice) *
              (Number(item.quantity) || 0)
          );
        },
        0,
      );
      return sum + transactionProfit;
    }, 0);
    const totalLifetimePurchases = custTransactions.reduce(
      (sum, t) => sum + (t.totalAmount || 0),
      0,
    );

    return sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Customer fetched successfully",
      data: {
        ...customer,
        totalOrders,
        totalLifetimeProfit,
        totalLifetimePurchases,
        dueBalance: customer.dueBalance !== undefined ? customer.dueBalance : 0,
        advanceBalance:
          customer.advanceBalance !== undefined ? customer.advanceBalance : 0,
      },
    });
  }),
);

// GET /:id/orders - Customer's orders with full item breakdown, buy price, sell price, profit, and pagination
router.get(
  "/:id/orders",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 5, range = "all" } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 5));

    // Filter transactions for this customer
    const { orders: allOrders, total } = await getCustomerTransactionPage(
      id,
      String(range),
      pageNum,
      limitNum,
    );

    const productIds = Array.from(
      new Set(
        allOrders.flatMap((order) =>
          (order.items || []).map((item: any) => String(item.productId)),
        ),
      ),
    );
    const databaseProductIds = productIds
      .filter((productId) => /^[a-f\d]{24}$/i.test(productId))
      .map((productId) => new mongoose.Types.ObjectId(productId));
    let databaseProducts: any[] = [];
    if (mongoose.connection.readyState === 1 && databaseProductIds.length > 0) {
      try {
        databaseProducts = await Product.collection
          .find({ _id: { $in: databaseProductIds } })
          .toArray();
      } catch (err) {
        console.warn("DB get customer order products failed:", err);
      }
    }
    const findProduct = (productId: string) =>
      databaseProducts.find((product) => String(product._id) === productId) ||
      localStore.products.find((product) => product._id === productId);

    // Enrich items with product details and buyPrice if needed
    const enrichedOrders = allOrders.map((t) => {
      const enrichedItems = (t.items || []).map((item) => {
        const product = findProduct(String(item.productId));
        const { unit, costPrice, isPiece, piecesPerUnit } = resolveSaleUnit(
          item,
          product,
        );
        const unitPrice = item.unitPrice || 0;
        const quantity = item.quantity || 0;
        const lineTotal = unitPrice * quantity;
        const lineCost = costPrice * quantity;
        const lineProfit = lineTotal - lineCost;

        return {
          ...item,
          productName:
            item.productName ||
            product?.displayName ||
            product?.name ||
            "Product",
          unit,
          isPiece,
          piecesPerUnit,
          costPrice,
          unitPrice,
          quantity,
          lineTotal,
          lineCost,
          lineProfit,
        };
      });

      const totalCost = enrichedItems.reduce(
        (sum, i) => sum + (i.lineCost || 0),
        0,
      );
      const totalAmount = t.totalAmount || 0;
      const totalProfit = enrichedItems.reduce(
        (sum, item) => sum + (item.lineProfit || 0),
        0,
      );
      const amountPaid =
        t.amountPaid !== undefined ? t.amountPaid : totalAmount;
      const dueAmount =
        t.dueAmount !== undefined
          ? t.dueAmount
          : Math.max(
              0,
              totalAmount - amountPaid - (Number((t as any).dueDiscount) || 0),
            );
      const paymentStatus =
        t.paymentStatus ||
        (dueAmount <= 0
          ? amountPaid > totalAmount
            ? "OVERPAID"
            : "PAID"
          : "PARTIAL");

      return {
        ...t,
        items: enrichedItems,
        totalCost,
        totalAmount,
        totalProfit,
        amountPaid,
        dueAmount,
        paymentStatus,
      };
    });

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Customer orders fetched successfully",
      meta: { page: pageNum, limit: limitNum, total },
      data: enrichedOrders,
    });
  }),
);

// POST /:id/adjust-balance - Adjust customer balance (Receive due, Add advance, or Discount)
router.post(
  "/:id/adjust-balance",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const {
      amount,
      type = "DUE_PAYMENT_RECEIVED",
      paymentMethod = "Cash",
      notes = "",
      direction,
    } = req.body;
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Invalid adjustment amount. Amount must be greater than zero.",
        data: null,
      });
    }

    let databaseCustomer: any = null;
    if (mongoose.connection.readyState === 1) {
      try {
        databaseCustomer = await Customer.findById(id);
      } catch (err) {
        console.warn("DB get customer for balance adjustment failed:", err);
      }
    }
    const customer =
      databaseCustomer || localStore.customers.find((c) => c._id === id);
    if (!customer) {
      return sendResponse(res, {
        statusCode: 404,
        success: false,
        message: "Customer not found",
        data: null,
      });
    }

    if (customer.dueBalance === undefined) customer.dueBalance = 0;
    if (customer.advanceBalance === undefined) customer.advanceBalance = 0;
    let adjustmentNotes = String(notes || "");
    const createdAt = new Date();
    let orderAllocations: { transactionId: string; amount: number }[] = [];
    let adjustedAmount = numAmount;

    if (type === "DUE_PAYMENT_RECEIVED") {
      // Customer pays due amount
      const requestedForDue = Math.min(numAmount, customer.dueBalance);
      orderAllocations = await allocateToOpenOrders(
        id,
        requestedForDue,
        "PAYMENT",
        createdAt,
      );
      const appliedToDue = orderAllocations.reduce(
        (sum, allocation) => sum + allocation.amount,
        0,
      );
      const addedToAdvance = numAmount - appliedToDue;
      customer.dueBalance -= appliedToDue;
      customer.advanceBalance += addedToAdvance;
      const linkedOrders = orderAllocations
        .map(
          (allocation) =>
            `#${allocation.transactionId.slice(-8).toUpperCase()}`,
        )
        .join(", ");
      adjustmentNotes ||= `৳${appliedToDue} applied to due${linkedOrders ? ` on ${linkedOrders}` : ""}; ৳${addedToAdvance} added to advance.`;
    } else if (type === "ADVANCE_DEPOSIT") {
      const requestedForDue = Math.min(numAmount, customer.dueBalance);
      orderAllocations = await allocateToOpenOrders(
        id,
        requestedForDue,
        "PAYMENT",
        createdAt,
      );
      const appliedToDue = orderAllocations.reduce(
        (sum, allocation) => sum + allocation.amount,
        0,
      );
      const addedToAdvance = numAmount - appliedToDue;
      customer.dueBalance -= appliedToDue;
      customer.advanceBalance += addedToAdvance;
      const linkedOrders = orderAllocations
        .map(
          (allocation) =>
            `#${allocation.transactionId.slice(-8).toUpperCase()}`,
        )
        .join(", ");
      adjustmentNotes ||= `৳${appliedToDue} applied to due${linkedOrders ? ` on ${linkedOrders}` : ""}; ৳${addedToAdvance} added to advance.`;
    } else if (type === "DUE_DISCOUNT") {
      if (numAmount > customer.dueBalance) {
        return sendResponse(res, {
          statusCode: 400,
          success: false,
          message:
            "Discount amount cannot exceed the customer's outstanding due.",
          data: null,
        });
      }
      // Discount or waiver on due
      orderAllocations = await allocateToOpenOrders(
        id,
        numAmount,
        "DISCOUNT",
        createdAt,
      );
      const discountedAmount = orderAllocations.reduce(
        (sum, allocation) => sum + allocation.amount,
        0,
      );
      if (discountedAmount === 0) {
        return sendResponse(res, {
          statusCode: 400,
          success: false,
          message: "There are no outstanding invoices to discount.",
          data: null,
        });
      }
      adjustedAmount = discountedAmount;
      customer.dueBalance = Math.max(0, customer.dueBalance - discountedAmount);
      const linkedOrders = orderAllocations
        .map(
          (allocation) =>
            `#${allocation.transactionId.slice(-8).toUpperCase()}`,
        )
        .join(", ");
      adjustmentNotes ||= `Due reduced by ৳${discountedAmount}${linkedOrders ? ` on ${linkedOrders}` : ""}.`;
    } else if (type === "ADVANCE_WITHDRAWAL") {
      if (numAmount > customer.advanceBalance) {
        return sendResponse(res, {
          statusCode: 400,
          success: false,
          message:
            "Withdrawal amount cannot exceed the customer's available advance.",
          data: null,
        });
      }
      customer.advanceBalance -= numAmount;
      adjustmentNotes ||= `Advance credit reduced by ৳${numAmount}.`;
    } else if (type === "ADVANCE_APPLIED") {
      if (numAmount > customer.advanceBalance) {
        return sendResponse(res, {
          statusCode: 400,
          success: false,
          message:
            "Applied amount cannot exceed the customer's available advance.",
          data: null,
        });
      }
      orderAllocations = await allocateToOpenOrders(
        id,
        numAmount,
        "ADVANCE",
        createdAt,
      );
      const appliedAmount = orderAllocations.reduce(
        (sum, allocation) => sum + allocation.amount,
        0,
      );
      if (appliedAmount === 0) {
        return sendResponse(res, {
          statusCode: 400,
          success: false,
          message: "There are no outstanding invoices to apply advance to.",
          data: null,
        });
      }
      adjustedAmount = appliedAmount;
      customer.advanceBalance -= appliedAmount;
      customer.dueBalance = Math.max(0, customer.dueBalance - appliedAmount);
      const linkedOrders = orderAllocations
        .map(
          (allocation) =>
            `#${allocation.transactionId.slice(-8).toUpperCase()}`,
        )
        .join(", ");
      adjustmentNotes ||= `৳${appliedAmount} advance applied to ${linkedOrders}.`;
    } else if (type === "BALANCE_ADJUSTMENT") {
      if (direction === "DEBIT_DUE") {
        customer.dueBalance += numAmount;
      } else if (direction === "CREDIT_ADVANCE") {
        customer.advanceBalance += numAmount;
        adjustmentNotes ||= `Advance credit increased by ৳${numAmount}.`;
      } else if (direction === "DEBIT_ADVANCE") {
        if (numAmount > customer.advanceBalance) {
          return sendResponse(res, {
            statusCode: 400,
            success: false,
            message:
              "Adjustment cannot exceed the customer's available advance.",
            data: null,
          });
        }
        customer.advanceBalance -= numAmount;
        adjustmentNotes ||= `Advance credit reduced by ৳${numAmount}.`;
      } else {
        if (numAmount > customer.dueBalance) {
          return sendResponse(res, {
            statusCode: 400,
            success: false,
            message: "Adjustment cannot exceed the customer's outstanding due.",
            data: null,
          });
        }
        customer.dueBalance -= numAmount;
        adjustmentNotes ||= `Due reduced by ৳${numAmount}.`;
      }
      if (direction === "DEBIT_DUE") {
        adjustmentNotes ||= `Due increased by ৳${numAmount}.`;
      }
    } else {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Unsupported balance adjustment type.",
        data: null,
      });
    }

    const adjustmentRecord = {
      customerId: id,
      amount: adjustedAmount,
      type,
      paymentMethod,
      notes: adjustmentNotes,
      allocations: orderAllocations,
      referenceId:
        orderAllocations.length === 1
          ? orderAllocations[0].transactionId
          : undefined,
      createdAt,
      direction:
        type === "DUE_PAYMENT_RECEIVED"
          ? "DUE_SETTLED_THEN_ADVANCE"
          : type === "ADVANCE_DEPOSIT"
            ? "DUE_SETTLED_THEN_ADVANCE"
            : type === "DUE_DISCOUNT"
              ? "DUE_REDUCED"
              : type === "ADVANCE_WITHDRAWAL"
                ? "ADVANCE_REDUCED"
                : type === "ADVANCE_APPLIED"
                  ? "ADVANCE_USED"
                  : direction || "BALANCE_ADJUSTED",
      balanceDueAfter: customer.dueBalance,
      balanceAdvanceAfter: customer.advanceBalance,
    };

    if (databaseCustomer) {
      databaseCustomer.adjustments.push(adjustmentRecord);
      await databaseCustomer.save();
    } else {
      customer.updatedAt = createdAt.toISOString();
      if (!localStore.adjustments) {
        (localStore as any).adjustments = [];
      }
      localStore.adjustments.unshift({
        ...adjustmentRecord,
        _id: `adj_${Date.now()}`,
        createdAt: createdAt.toISOString(),
      });
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Customer balance adjusted successfully",
      data: {
        customer: databaseCustomer ? databaseCustomer.toObject() : customer,
        adjustment: adjustmentRecord,
      },
    });
  }),
);

// GET /:id/adjustments - Get history of customer balance adjustments
router.get(
  "/:id/adjustments",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const pageNum = Math.max(1, Number(req.query.page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const skip = (pageNum - 1) * limitNum;
    const rangeStart = getDateRangeStart(String(req.query.range || "all"));
    let adjustments: any[] = [];
    let total = 0;
    if (mongoose.connection.readyState === 1) {
      try {
        const customer = await Customer.findById(id)
          .select("adjustments")
          .lean();
        const filtered = (customer?.adjustments || [])
          .filter(
            (adjustment: any) =>
              !rangeStart || new Date(adjustment.createdAt) >= rangeStart,
          )
          .sort(
            (left: any, right: any) =>
              new Date(right.createdAt).getTime() -
              new Date(left.createdAt).getTime(),
          );
        total = filtered.length;
        adjustments = filtered.slice(skip, skip + limitNum);
      } catch (err) {
        console.warn("DB get customer adjustments failed:", err);
      }
    }
    if (mongoose.connection.readyState !== 1) {
      const filtered = (localStore.adjustments || [])
        .filter(
          (adjustment) =>
            adjustment.customerId === id &&
            (!rangeStart || new Date(adjustment.createdAt) >= rangeStart),
        )
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() -
            new Date(left.createdAt).getTime(),
        );
      total = filtered.length;
      adjustments = filtered.slice(skip, skip + limitNum);
    }
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Customer adjustments fetched successfully",
      meta: { page: pageNum, limit: limitNum, total },
      data: adjustments,
    });
  }),
);

export const CustomerRoutes = router;
