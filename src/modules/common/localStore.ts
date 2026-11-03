export interface LocalProduct {
  _id: string;
  name: string;
  displayName?: string;
  category: string;
  buyPrice: number;
  sellPrice: number;
  unit: string;
  piecesPerUnit?: number;
  sku?: string;
  lowStockThreshold?: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalStockItem {
  _id: string;
  productId: string;
  dealerId?: string;
  quantity: number;
  lastRestocked?: string;
  updatedAt: string;
}

export interface LocalCustomer {
  _id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  totalSpent: number;
  dueBalance: number; // "Koto tk ami pai" (Receivable / Due from customer)
  advanceBalance: number; // "Koto tk advance kora ache" (Customer deposit / credit balance)
  lastPurchaseDate?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalCustomerAdjustment {
  _id: string;
  customerId: string;
  amount: number;
  type: string;
  paymentMethod: string;
  notes?: string;
  direction?: string;
  referenceId?: string;
  balanceDueAfter?: number;
  balanceAdvanceAfter?: number;
  createdAt: string;
}

export interface LocalDealer {
  _id: string;
  name: string;
  address?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface LocalTransactionItem {
  productId: string;
  productName?: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  unit?: string;
  isPiece?: boolean;
  piecesPerUnit?: number;
}

export interface LocalTransaction {
  _id: string;
  type: string;
  customerId?: string;
  customerName?: string;
  totalAmount: number;
  totalProfit: number;
  amountPaid: number; // "koto tk paisi"
  dueAmount: number; // remaining due for this specific order
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID" | "OVERPAID";
  items: LocalTransactionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalSettings {
  _id: string;
  shopName: string;
  address: string;
  phone: string;
  email: string;
  footerText: string;
}

export const localStore = {
  products: [] as LocalProduct[],
  stock: [] as LocalStockItem[],
  customers: [] as LocalCustomer[],
  adjustments: [] as LocalCustomerAdjustment[],
  dealers: [] as LocalDealer[],
  transactions: [] as LocalTransaction[],
  settings: {
    _id: "settings_default",
    shopName: "Wholesale OS",
    address: "Online Distribution Network",
    phone: "+8801XXXXXXXXX",
    email: "support@wholesaleos.com",
    footerText: "Thank you for your business!",
  } as LocalSettings,
};