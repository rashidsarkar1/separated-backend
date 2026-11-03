import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
});

export const apiService = {
  // Auth
  login: async (credentials: any) => {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  // Inventory
  getProducts: async () => {
    const response = await api.get("/inventory");
    return response.data.data;
  },

  getProductById: async (id: string) => {
    const response = await api.get(`/inventory/${id}`);
    return response.data.data;
  },

  addProduct: async (productData: any) => {
    const response = await api.post("/inventory", productData);
    return response.data.data;
  },

  updateProduct: async (id: string, productData: any) => {
    const response = await api.patch(`/inventory/${id}`, productData);
    return response.data.data;
  },

  // Categories
  getCategories: async (
    search = "",
    page = 1,
    limit = 10,
    sortBy = "name",
    order = "asc",
  ) => {
    const params = new URLSearchParams({
      search,
      page: String(page),
      limit: String(limit),
      sortBy,
      order,
    });
    const response = await api.get(`/categories?${params.toString()}`);
    return response.data;
  },

  createCategory: async (name: string) => {
    const response = await api.post("/categories", { name });
    return response.data.data;
  },

  getCategoryProducts: async (
    name: string,
    search = "",
    page = 1,
    limit = 10,
    sortBy = "name",
    order = "asc",
  ) => {
    const params = new URLSearchParams({
      search,
      page: String(page),
      limit: String(limit),
      sortBy,
      order,
    });
    const response = await api.get(
      `/categories/${encodeURIComponent(name)}/products?${params.toString()}`,
    );
    return response.data;
  },

  // Stock
  getStock: async () => {
    const response = await api.get("/inventory/stock");
    return response.data.data;
  },

  updateStock: async (id: string, stockData: any) => {
    const response = await api.patch(`/inventory/stock/${id}`, stockData);
    return response.data.data;
  },

  // Transactions
  getTransactions: async (search = "", page = 1, limit = 10, range = "all") => {
    const response = await api.get(
      `/transactions?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}&range=${range}`,
    );
    return response.data;
  },

  recordTransaction: async (transactionData: any) => {
    const response = await api.post("/transactions", transactionData);
    return response.data.data;
  },

  // Analytics
  getAnalyticsSummary: async (range: string) => {
    const response = await api.get(`/analytics/summary?range=${range}`);
    return response.data.data;
  },

  getAnalyticsCustomers: async (
    range: string,
    page = 1,
    limit = 10,
    sortBy = "totalPurchase",
    order = "desc",
  ) => {
    const response = await api.get(
      `/analytics/customers?range=${range}&page=${page}&limit=${limit}&sortBy=${sortBy}&order=${order}`,
    );
    return response.data;
  },

  getAnalyticsProducts: async (
    range: string,
    page = 1,
    limit = 10,
    sortBy = "totalSales",
    order = "desc",
  ) => {
    const response = await api.get(
      `/analytics/products?range=${range}&page=${page}&limit=${limit}&sortBy=${sortBy}&order=${order}`,
    );
    return response.data;
  },

  // Customers
  getCustomers: async (search = "", page = 1, limit = 10, range = "all") => {
    const response = await api.get(
      `/customers?search=${encodeURIComponent(search)}&page=${page}&limit=${limit}&range=${range}`,
    );
    return response.data;
  },

  getCustomerById: async (id: string) => {
    const response = await api.get(`/customers/${id}`);
    return response.data.data;
  },

  getCustomerOrders: async (id: string, page = 1, limit = 5, range = "all") => {
    const response = await api.get(
      `/customers/${id}/orders?page=${page}&limit=${limit}&range=${range}`,
    );
    return response.data;
  },

  adjustCustomerBalance: async (
    id: string,
    adjustmentData: {
      amount: number;
      type: string;
      paymentMethod?: string;
      notes?: string;
      direction?: string;
    },
  ) => {
    const response = await api.post(
      `/customers/${id}/adjust-balance`,
      adjustmentData,
    );
    return response.data.data;
  },

  getCustomerAdjustments: async (
    id: string,
    page = 1,
    limit = 10,
    range = "all",
  ) => {
    const response = await api.get(
      `/customers/${id}/adjustments?page=${page}&limit=${limit}&range=${range}`,
    );
    return response.data;
  },

  createCustomer: async (customerData: any) => {
    const response = await api.post("/customers", customerData);
    return response.data.data;
  },

  updateCustomer: async (id: string, customerData: any) => {
    const response = await api.patch(`/customers/${id}`, customerData);
    return response.data.data;
  },

  deleteCustomer: async (id: string) => {
    const response = await api.delete(`/customers/${id}`);
    return response.data.data;
  },

  getTransactionById: async (id: string) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data.data;
  },

  getProductSalesHistory: async (
    productId: string,
    range = "all",
    page = 1,
    limit = 10,
    unit = "",
  ) => {
    const response = await api.get(
      `/transactions/product/${productId}/history?range=${range}&page=${page}&limit=${limit}&unit=${encodeURIComponent(unit)}`,
    );
    return response.data;
  },

  getProductIntelligence: async (
    productId: string,
    range = "all",
    buyerPage = 1,
    historyPage = 1,
    buyerLimit = 10,
    historyLimit = 30,
    buyerOrder: "most" | "least" = "most",
  ) => {
    const params = new URLSearchParams({
      range,
      buyerPage: String(buyerPage),
      historyPage: String(historyPage),
      buyerLimit: String(buyerLimit),
      historyLimit: String(historyLimit),
      buyerOrder,
    });
    const response = await api.get(
      `/transactions/product/${productId}/intelligence?${params.toString()}`,
    );
    return response.data;
  },

  updateTransaction: async (id: string, transactionData: any) => {
    const response = await api.put(`/transactions/${id}`, transactionData);
    return response.data.data;
  },

  // Dealers
  getDealers: async (
    page = 1,
    limit = 10,
    range = "all",
    search = "",
    sortBy = "createdAt",
    order = "desc",
  ) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      range: String(range),
      sortBy,
      order,
    });
    if (search.trim()) params.set("search", search.trim());
    const response = await api.get(`/dealers?${params.toString()}`);
    return response.data;
  },

  getDealerById: async (id: string) => {
    const response = await api.get(`/dealers/${id}`);
    return response.data.data;
  },

  createDealer: async (dealerData: any) => {
    const response = await api.post("/dealers", dealerData);
    return response.data.data;
  },

  updateDealer: async (id: string, dealerData: any) => {
    const response = await api.patch(`/dealers/${id}`, dealerData);
    return response.data.data;
  },

  // Dealer receipts
  saveDealerReceipt: async (receipt: any) => {
    const response = await api.post("/dealer-receipts", receipt);
    return response.data.data;
  },

  getReceiptsByProduct: async (productId: string) => {
    const response = await api.get(
      `/dealer-receipts?productId=${encodeURIComponent(productId)}&page=1&limit=10`,
    );
    return Array.isArray(response.data?.data) ? response.data.data : [];
  },

  getDealerReceipts: async (options: {
    productId?: string;
    dealerId?: string;
    page?: number;
    limit?: number;
    search?: string;
    range?: string;
    order?: "asc" | "desc";
  }) => {
    const params = new URLSearchParams();
    if (options.productId) params.set("productId", options.productId);
    if (options.dealerId) params.set("dealerId", options.dealerId);
    params.set("page", String(options.page || 1));
    params.set("limit", String(options.limit || 10));
    params.set("search", options.search || "");
    params.set("range", options.range || "all");
    params.set("order", options.order || "desc");
    const response = await api.get(`/dealer-receipts?${params.toString()}`);
    return response.data;
  },

  deleteDealerReceipt: async (id: string) => {
    const response = await api.delete(
      `/dealer-receipts/${encodeURIComponent(id)}`,
    );
    return response.data.data;
  },

  // Inventory Extended
  getInventory: async (
    search = "",
    status = "all",
    sortBy = "createdAt",
    order = "desc",
    page = 1,
    limit = 10,
    range = "all",
    dealerId = "",
    category = "",
  ) => {
    const response = await api.get(
      `/inventory?search=${encodeURIComponent(search)}&status=${status}&sortBy=${sortBy}&order=${order}&page=${page}&limit=${limit}&range=${range}&dealerId=${encodeURIComponent(dealerId)}&category=${encodeURIComponent(category)}`,
    );
    return response.data;
  },

  deleteProduct: async (id: string) => {
    const response = await api.delete(`/inventory/${id}`);
    return response.data.data;
  },

  restoreProduct: async (id: string) => {
    const response = await api.patch(`/inventory/${id}/restore`);
    return response.data.data;
  },

  // Settings
  getSettings: async () => {
    const response = await api.get("/settings");
    return response.data.data;
  },

  updateSettings: async (settingsData: any) => {
    const response = await api.put("/settings", settingsData);
    return response.data.data;
  },
};
