import { Schema, model } from "mongoose";

const customerSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true, unique: true },
    address: { type: String },
    totalSpent: { type: Number, default: 0 },
    dueBalance: { type: Number, default: 0 },
    advanceBalance: { type: Number, default: 0 },
    lastPurchaseDate: { type: Date },
    adjustments: [
      {
        amount: { type: Number, required: true },
        type: { type: String, required: true },
        paymentMethod: { type: String, default: "Cash" },
        notes: { type: String, default: "" },
        direction: { type: String },
        referenceId: { type: String },
        allocations: [
          {
            transactionId: { type: String, required: true },
            amount: { type: Number, required: true },
          },
        ],
        balanceDueAfter: { type: Number },
        balanceAdvanceAfter: { type: Number },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Customer = model("Customer", customerSchema);
