import { randomUUID } from "crypto";
import { Router } from "express";
import mongoose from "mongoose";
import catchAsync from "../../shared/catchasync";
import { AppError } from "../../utils/AppError";
import sendResponse from "../../utils/sendResponse";
import { calculateSaleLine } from "../../utils/salesUnits";
import { localStore, type LocalExpense } from "../common/localStore";
import { Product } from "../inventory/inventory.model";
import { Transaction } from "../transactions/transaction.model";
import { Expense, ExpenseCategory } from "./expense.model";

const router = Router();

const DEFAULT_CATEGORIES = [
  "Salary",
  "Shop rent",
  "Product transport",
  "Utilities",
  "Maintenance",
  "Other",
];
const FREQUENCIES = new Set(["once", "daily", "weekly", "monthly"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REPORT_DAYS = 366;
const DHAKA_TIME_ZONE = "Asia/Dhaka";

type ExpenseRecord = {
  _id: unknown;
  title: string;
  amount: number;
  category: string;
  frequency: "once" | "daily" | "weekly" | "monthly";
  startDate: string;
  endDate?: string;
  note?: string;
  createdAt: string | Date;
};

const normalizeDate = (value: unknown, field: string): string => {
  const date = String(value || "");
  if (!DATE_PATTERN.test(date)) {
    throw new AppError(400, `${field} must be a valid YYYY-MM-DD date`);
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new AppError(400, `${field} must be a valid YYYY-MM-DD date`);
  }
  return date;
};

const getDhakaDateKey = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: DHAKA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const addDays = (dateKey: string, count: number): string => {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
};

const dhakaDayStart = (dateKey: string): Date =>
  new Date(`${dateKey}T00:00:00+06:00`);

const dayCount = (from: string, to: string): number =>
  Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() -
      new Date(`${from}T00:00:00Z`).getTime()) /
      86_400_000,
  ) + 1;

const getTodayKey = (): string => getDhakaDateKey(new Date());

const parseExpenseInput = (input: Record<string, unknown>, partial = false) => {
  const result: Record<string, unknown> = {};
  if (!partial || input.title !== undefined) {
    const title = String(input.title || "").trim();
    if (!title) throw new AppError(400, "Expense name is required");
    if (title.length > 120) throw new AppError(400, "Expense name is too long");
    result.title = title;
  }
  if (!partial || input.amount !== undefined) {
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new AppError(400, "Expense amount must be greater than zero");
    }
    result.amount = amount;
  }
  if (!partial || input.category !== undefined) {
    const category = String(input.category || "").trim().replace(/\s+/g, " ");
    if (!category) throw new AppError(400, "Expense category is required");
    result.category = category;
  }
  if (!partial || input.frequency !== undefined) {
    const frequency = String(input.frequency || "");
    if (!FREQUENCIES.has(frequency)) {
      throw new AppError(400, "Choose a valid expense frequency");
    }
    result.frequency = frequency;
  }
  if (!partial || input.startDate !== undefined) {
    result.startDate = normalizeDate(input.startDate, "Expense date");
  }
  if (!partial || input.endDate !== undefined) {
    const endDate = String(input.endDate || "");
    result.endDate = endDate ? normalizeDate(endDate, "End date") : "";
  }
  if (!partial || input.note !== undefined) {
    const note = String(input.note || "").trim();
    if (note.length > 1000) throw new AppError(400, "Expense note is too long");
    result.note = note;
  }

  const frequency = String(result.frequency || input.frequency || "");
  const startDate = String(result.startDate || input.startDate || "");
  const endDate = String(result.endDate ?? input.endDate ?? "");
  if (endDate && endDate < startDate) {
    throw new AppError(400, "End date cannot be before the expense date");
  }
  if (frequency === "once" && endDate) {
    throw new AppError(400, "A one-time expense cannot have an end date");
  }
  return result;
};

const getExpenses = async (): Promise<ExpenseRecord[]> => {
  if (mongoose.connection.readyState === 1) {
    return Expense.find().lean();
  }
  return localStore.expenses;
};

const isActiveOn = (expense: ExpenseRecord, dateKey: string): boolean =>
  expense.startDate <= dateKey && (!expense.endDate || expense.endDate >= dateKey);

const getDailyExpense = (expense: ExpenseRecord, dateKey: string): number => {
  if (!isActiveOn(expense, dateKey)) return 0;
  if (expense.frequency === "once") {
    return expense.startDate === dateKey ? Number(expense.amount) : 0;
  }
  if (expense.frequency === "daily") return Number(expense.amount);
  if (expense.frequency === "weekly") return Number(expense.amount) / 7;
  const [year, month] = dateKey.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Number(expense.amount) / daysInMonth;
};

const getTransactionsForReport = async (from: string, to: string) => {
  const today = getTodayKey();
  const minDate = from < today ? from : today;
  const maxDate = to > today ? to : today;

  if (mongoose.connection.readyState !== 1) {
    return localStore.transactions.filter((transaction) => {
      if (transaction.type !== "SALE") return false;
      const dateKey = getDhakaDateKey(new Date(transaction.createdAt));
      return dateKey >= minDate && dateKey <= maxDate;
    });
  }

  const ranges = [
    { $gte: dhakaDayStart(from), $lt: dhakaDayStart(addDays(to, 1)) },
    { $gte: dhakaDayStart(today), $lt: dhakaDayStart(addDays(today, 1)) },
  ];
  return Transaction.find({
    type: "SALE",
    $or: ranges.map((createdAt) => ({ createdAt })),
  }).lean();
};

const getProductMap = async (transactions: any[]) => {
  const products = new Map<string, any>();
  for (const product of localStore.products) {
    products.set(String(product._id), product);
  }

  if (mongoose.connection.readyState !== 1) return products;

  const productIds = [
    ...new Set(
      transactions.flatMap((transaction) =>
        (transaction.items || []).map((item: any) =>
          String(item.productId?._id || item.productId || ""),
        ),
      ),
    ),
  ].filter((id) => mongoose.Types.ObjectId.isValid(id));

  if (!productIds.length) return products;
  const databaseProducts = await Product.find({
    _id: { $in: productIds },
  }).lean();
  for (const product of databaseProducts) {
    products.set(String(product._id), product);
  }
  return products;
};

router.get(
  "/categories",
  catchAsync(async (_req, res) => {
    const savedCategories =
      mongoose.connection.readyState === 1
        ? await ExpenseCategory.find().select("name normalizedName").lean()
        : localStore.expenseCategories;
    const names = new Map<string, string>();
    for (const name of DEFAULT_CATEGORIES) {
      names.set(name.toLocaleLowerCase(), name);
    }
    for (const category of savedCategories) {
      names.set(category.normalizedName, category.name);
    }

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expense categories fetched successfully",
      data: Array.from(names.values()).sort((left, right) =>
        left.localeCompare(right),
      ),
    });
  }),
);

router.post(
  "/categories",
  catchAsync(async (req, res) => {
    const name = String(req.body.name || "").trim().replace(/\s+/g, " ");
    if (!name) throw new AppError(400, "Category name is required");
    if (name.length > 60) throw new AppError(400, "Category name is too long");
    const normalizedName = name.toLocaleLowerCase();
    const defaultCategory = DEFAULT_CATEGORIES.find(
      (category) => category.toLocaleLowerCase() === normalizedName,
    );
    if (defaultCategory) {
      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Expense category already exists",
        data: { name: defaultCategory },
      });
      return;
    }

    if (mongoose.connection.readyState === 1) {
      let category = await ExpenseCategory.findOne({ normalizedName });
      if (!category) category = await ExpenseCategory.create({ name, normalizedName });
      sendResponse(res, {
        statusCode: 201,
        success: true,
        message: "Expense category saved successfully",
        data: category,
      });
      return;
    }

    const existing = localStore.expenseCategories.find(
      (category) => category.normalizedName === normalizedName,
    );
    if (existing) {
      sendResponse(res, {
        statusCode: 200,
        success: true,
        message: "Expense category already exists",
        data: existing,
      });
      return;
    }
    const category = { _id: randomUUID(), name, normalizedName };
    localStore.expenseCategories.push(category);
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Expense category saved successfully",
      data: category,
    });
  }),
);

router.get(
  "/summary",
  catchAsync(async (req, res) => {
    const today = getTodayKey();
    const firstOfMonth = `${today.slice(0, 7)}-01`;
    const from = normalizeDate(req.query.from || firstOfMonth, "Start date");
    const to = normalizeDate(req.query.to || today, "End date");
    if (from > to) throw new AppError(400, "Start date cannot be after end date");
    if (dayCount(from, to) > MAX_REPORT_DAYS) {
      throw new AppError(400, "Expense reports can cover up to 366 days");
    }

    const [expenses, transactions] = await Promise.all([
      getExpenses(),
      getTransactionsForReport(from, to),
    ]);
    const productsById = await getProductMap(transactions);
    const salesProfitByDate = new Map<string, number>();
    for (const transaction of transactions) {
      const dateKey = getDhakaDateKey(new Date(transaction.createdAt));
      if (dateKey < from || dateKey > to) continue;
      let profit = 0;
      for (const item of transaction.items || []) {
        const productId = String(item.productId || "");
        profit += calculateSaleLine(item, productsById.get(productId)).profit;
      }
      salesProfitByDate.set(
        dateKey,
        (salesProfitByDate.get(dateKey) || 0) + profit,
      );
    }

    const chart = [];
    let totalExpenses = 0;
    let totalSalesProfit = 0;
    for (let offset = 0; offset < dayCount(from, to); offset += 1) {
      const date = addDays(from, offset);
      const dailyExpenses = expenses.reduce(
        (sum, expense) => sum + getDailyExpense(expense, date),
        0,
      );
      const grossProfit = salesProfitByDate.get(date) || 0;
      totalExpenses += dailyExpenses;
      totalSalesProfit += grossProfit;
      chart.push({
        date,
        salesProfit: grossProfit,
        expenses: dailyExpenses,
        netProfit: grossProfit - dailyExpenses,
      });
    }

    const todayExpenses = expenses.reduce(
      (sum, expense) => sum + getDailyExpense(expense, today),
      0,
    );
    const todayProfit = salesProfitByDate.get(today) || 0;
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expense report fetched successfully",
      data: {
        from,
        to,
        totalExpenses,
        totalSalesProfit,
        netProfit: totalSalesProfit - totalExpenses,
        todayExpenses,
        todaySalesProfit: todayProfit,
        todayNetProfit: todayProfit - todayExpenses,
        chart,
      },
    });
  }),
);

router.get(
  "/",
  catchAsync(async (req, res) => {
    const search = String(req.query.search || "").trim().toLocaleLowerCase();
    const category = String(req.query.category || "");
    const frequency = String(req.query.frequency || "");
    const from = req.query.from
      ? normalizeDate(req.query.from, "Start date")
      : "";
    const to = req.query.to ? normalizeDate(req.query.to, "End date") : "";
    if (from && to && from > to) {
      throw new AppError(400, "Start date cannot be after end date");
    }
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const sortBy = String(req.query.sortBy || "startDate");
    const order = req.query.order === "asc" ? 1 : -1;
    const allowedSorts = new Set([
      "startDate",
      "amount",
      "title",
      "category",
      "frequency",
    ]);
    const selectedSort = allowedSorts.has(sortBy) ? sortBy : "startDate";

    let expenses = await getExpenses();
    if (category) expenses = expenses.filter((item) => item.category === category);
    if (frequency && frequency !== "all") {
      expenses = expenses.filter((item) => item.frequency === frequency);
    }
    if (from || to) {
      expenses = expenses.filter((item) => {
        const rangeStart = from || item.startDate;
        const rangeEnd = to || item.startDate;
        return item.frequency === "once"
          ? item.startDate >= rangeStart && item.startDate <= rangeEnd
          : item.startDate <= rangeEnd &&
              (!item.endDate || item.endDate >= rangeStart);
      });
    }
    if (search) {
      expenses = expenses.filter((item) =>
        [item.title, item.category, item.note]
          .join(" ")
          .toLocaleLowerCase()
          .includes(search),
      );
    }

    expenses.sort((left, right) => {
      const leftValue = left[selectedSort as keyof ExpenseRecord];
      const rightValue = right[selectedSort as keyof ExpenseRecord];
      if (selectedSort === "amount") {
        return (Number(leftValue) - Number(rightValue)) * order;
      }
      return String(leftValue || "").localeCompare(String(rightValue || "")) * order;
    });
    const total = expenses.length;
    expenses = expenses.slice((page - 1) * limit, page * limit);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expenses fetched successfully",
      meta: { page, limit, total },
      data: expenses,
    });
  }),
);

router.post(
  "/",
  catchAsync(async (req, res) => {
    const expense = parseExpenseInput(req.body);
    let savedExpense: ExpenseRecord;
    if (mongoose.connection.readyState === 1) {
      const created = await Expense.create(expense);
      savedExpense = { ...created.toObject(), _id: String(created._id) };
    } else {
      const localExpense = {
        ...expense,
        _id: randomUUID(),
        createdAt: new Date().toISOString(),
      } as LocalExpense;
      savedExpense = localExpense;
      localStore.expenses.push(localExpense);
    }
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Expense saved successfully",
      data: savedExpense,
    });
  }),
);

router.patch(
  "/:id",
  catchAsync(async (req, res) => {
    const updates = parseExpenseInput(req.body, true);
    let expense: ExpenseRecord | null;
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new AppError(400, "Invalid expense ID");
      }
      const current = await Expense.findById(req.params.id).lean();
      if (!current) throw new AppError(404, "Expense not found");
      const validatedUpdates = parseExpenseInput({ ...current, ...updates });
      expense = (await Expense.findByIdAndUpdate(req.params.id, validatedUpdates, {
        new: true,
        runValidators: true,
      }).lean()) as ExpenseRecord | null;
    } else {
      const index = localStore.expenses.findIndex(
        (item) => item._id === req.params.id,
      );
      const current = index < 0 ? null : localStore.expenses[index];
      if (!current) throw new AppError(404, "Expense not found");
      const validatedUpdates = parseExpenseInput({ ...current, ...updates });
      Object.assign(current, validatedUpdates);
      expense = current;
    }
    if (!expense) throw new AppError(404, "Expense not found");
    if (expense.endDate && expense.endDate < expense.startDate) {
      throw new AppError(400, "End date cannot be before the expense date");
    }
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expense updated successfully",
      data: expense,
    });
  }),
);

router.delete(
  "/:id",
  catchAsync(async (req, res) => {
    let deleted: ExpenseRecord | null;
    if (mongoose.connection.readyState === 1) {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new AppError(400, "Invalid expense ID");
      }
      deleted = (await Expense.findByIdAndDelete(req.params.id).lean()) as
        | ExpenseRecord
        | null;
    } else {
      const index = localStore.expenses.findIndex(
        (item) => item._id === req.params.id,
      );
      deleted = index < 0 ? null : localStore.expenses.splice(index, 1)[0];
    }
    if (!deleted) throw new AppError(404, "Expense not found");
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Expense deleted successfully",
      data: deleted,
    });
  }),
);

export const ExpenseRoutes = router;
