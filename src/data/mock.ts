import { 
  Dealer, 
  Product, 
  InventoryItem, 
  PurchaseOrder, 
  SalesOrder, 
  Customer, 
  User, 
  UserRole,
  ProfitLog
} from '../types';

export const mockUser: User = {
  id: 'admin_1',
  username: 'admin',
  role: UserRole.ADMIN,
  name: 'Admin',
  email: 'admin@wholesaleos.com'
};

export const mockDealers: Dealer[] = [];
export const mockProducts: Product[] = [];
export const mockInventory: InventoryItem[] = [];
export const mockCustomers: Customer[] = [];
export const mockPurchaseOrders: PurchaseOrder[] = [];
export const mockSalesOrders: SalesOrder[] = [];
export const mockProfitLogs: ProfitLog[] = [];
