/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const UserRole = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SALESMAN: 'salesman',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const OrderStatus = {
  PENDING: 'pending',
  RECEIVED: 'received',
  SHIPPED: 'shipped',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export interface User {
  id: string;
  username: string;
  role: UserRole;
  name: string;
  email: string;
}

export interface Dealer {
  id: string;
  name: string;
  contactInfo: {
    phone: string;
    email: string;
  };
  address: string;
  createdAt: string;
}

export interface Product {
  id: string;
  _id?: string;
  name: string;
  displayName?: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  unit: string;
  piecesPerUnit?: number;
  sku?: string;
  quantity: number;
  lowStockThreshold?: number;
  dealerId?: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  dealerId: string;
  quantity: number;
  lastUpdated: string;
}

export interface OrderItem {
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  unit?: string;
  isPiece?: boolean;
  piecesPerUnit?: number;
  lineTotal?: number;
  lineCost?: number;
  lineProfit?: number;
}

export interface PurchaseOrder {
  id: string;
  dealerId: string;
  orderDate: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
}

export interface SalesOrder {
  id: string;
  _id?: string;
  customerId: string;
  customerName?: string;
  orderDate?: string;
  createdAt?: string;
  updatedAt?: string;
  items: OrderItem[];
  status?: OrderStatus | string;
  totalAmount: number;
  totalProfit?: number;
  totalCost?: number;
  amountPaid?: number;
  dueAmount?: number;
  paymentStatus?: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERPAID' | string;
}

export interface Customer {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  totalSpent?: number;
  dueBalance?: number; // "Koto tk ami pai"
  advanceBalance?: number; // "Koto tk advance kora ace"
  lastPurchaseDate?: string;
  totalOrders?: number;
  totalLifetimeProfit?: number;
  totalLifetimePurchases?: number;
}

export interface ProfitLog {
  id: string;
  orderId: string;
  orderType: 'purchase' | 'sale';
  cost: number;
  revenue: number;
  profit: number;
  date: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string;
  details?: string;
  timestamp: string;
}
