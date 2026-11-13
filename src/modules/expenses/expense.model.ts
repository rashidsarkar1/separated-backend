import { Schema, model } from "mongoose";

const expenseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0.01 },
    category: { type: String, required: true, trim: true },
    frequency: {
      type: String,
      enum: ["once", "daily", "weekly", "monthly"],
      required: true,
    },
    startDate: { type: String, required: true },
    endDate: { type: String, default: "" },
    note: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true },
);

const expenseCategorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

export const Expense = model("Expense", expenseSchema);
export const ExpenseCategory = model("ExpenseCategory", expenseCategorySchema);
