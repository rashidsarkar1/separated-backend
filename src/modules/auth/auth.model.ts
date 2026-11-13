import { Schema, model } from "mongoose";

const adminAccountSchema = new Schema(
  {
    _id: { type: String, default: "primary-admin" },
    username: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true, collection: "adminaccounts" },
);

export const AdminAccount = model("AdminAccount", adminAccountSchema);
