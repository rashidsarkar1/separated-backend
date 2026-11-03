import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "../../services/apiService";

interface AnalyticsState {
  summary: {
    totalSales: number;
    totalProfit: number;
    totalCustomers: number;
  };
  products: any[];
  customers: any[];
  productsMeta: { page: number; limit: number; total: number } | null;
  customersMeta: { page: number; limit: number; total: number } | null;
  loading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  summary: {
    totalSales: 0,
    totalProfit: 0,
    totalCustomers: 0,
  },
  products: [],
  customers: [],
  productsMeta: null,
  customersMeta: null,
  loading: false,
  error: null,
};

export const fetchAnalyticsSummary = createAsyncThunk(
  "analytics/fetchSummary",
  async (range: string) => {
    return await apiService.getAnalyticsSummary(range);
  },
);

export const fetchAnalyticsProducts = createAsyncThunk(
  "analytics/fetchProducts",
  async (args: {
    range: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: string;
  }) => {
    return await apiService.getAnalyticsProducts(
      args.range,
      args.page,
      args.limit,
      args.sortBy,
      args.order,
    );
  },
);

export const fetchAnalyticsCustomers = createAsyncThunk(
  "analytics/fetchCustomers",
  async (args: {
    range: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: string;
  }) => {
    return await apiService.getAnalyticsCustomers(
      args.range,
      args.page,
      args.limit,
      args.sortBy,
      args.order,
    );
  },
);

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnalyticsSummary.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAnalyticsSummary.fulfilled, (state, action) => {
        state.loading = false;
        state.summary = action.payload;
      })
      .addCase(fetchAnalyticsSummary.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch summary";
      })
      .addCase(fetchAnalyticsProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAnalyticsProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.products = action.payload.data || [];
        state.productsMeta = action.payload.meta || null;
      })
      .addCase(fetchAnalyticsProducts.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch products analytics";
      })
      .addCase(fetchAnalyticsCustomers.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAnalyticsCustomers.fulfilled, (state, action) => {
        state.loading = false;
        state.customers = action.payload.data || [];
        state.customersMeta = action.payload.meta || null;
      })
      .addCase(fetchAnalyticsCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.error.message || "Failed to fetch customers analytics";
      });
  },
});

export default analyticsSlice.reducer;
