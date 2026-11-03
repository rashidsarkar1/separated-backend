import { Schema, model } from "mongoose";

const transactionSchema = new Schema(
  {
    productId: { type: String },
    quantity: { type: Number },
    totalAmount: { type: Number, required: true },
    type: { type: String, enum: ["SALE", "PURCHASE"], default: "SALE" },
    customerName: { type: String },
    customerId: { type: String },
    items: [
      {
        productId: { type: String },
        productName: { type: String },
        quantity: { type: Number },
        unitPrice: { type: Number },
        costPrice: { type: Number },
        unit: { type: String },
        isPiece: { type: Boolean, default: false },
        piecesPerUnit: { type: Number, default: 1 },
      },
    ],
    totalProfit: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    cashReceived: { type: Number },
    advanceUsed: { type: Number, default: 0 },
    dueDiscount: { type: Number, default: 0 },
    dueAmount: { type: Number, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["PAID", "PARTIAL", "UNPAID", "OVERPAID"],
      default: "PAID",
    },
  },
  { timestamps: true },
);

export const Transaction = model("Transaction", transactionSchema);
