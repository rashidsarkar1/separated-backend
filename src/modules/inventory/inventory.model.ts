import { Schema, model } from 'mongoose';

const productSchema = new Schema({
  name: { type: String, required: true },
  displayName: { type: String },
  category: { type: String, required: true },
  unit: { type: String, required: true },
  buyPrice: { type: Number, required: true },
  sellPrice: { type: Number, required: true },
  lowStockThreshold: { type: Number, default: 15 },
  piecesPerUnit: { type: Number, default: 1 },
  dealerId: { type: String },
  sku: { 
    type: String, 
    unique: true,
    default: function() {
      return 'SKU-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    }
  },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

const stockItemSchema = new Schema({
  productId: { type: String, required: true },
  dealerId: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  lastRestocked: { type: Date, default: Date.now },
}, { timestamps: true });

export const Product = model('Product', productSchema);
export const StockItem = model('StockItem', stockItemSchema);
