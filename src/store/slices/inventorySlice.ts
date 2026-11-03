import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "../../services/apiService";

interface InventoryState {
  products: any[];
  loading: boolean;
  error: string | null;
  currentRequestId?: string;
  meta: {
    page: number;
    limit: number;
    total: number;
  } | null;
}

const initialState: InventoryState = {
  products: [],
  loading: false,
  error: null,
  meta: null,
};

export const fetchProducts = createAsyncThunk(
  "inventory/fetchProducts",
  async () => {
    return await apiService.getProducts();
  },
);

export const addProduct = createAsyncThunk(
  "inventory/addProduct",
  async (productData: any) => {
    return await apiService.addProduct(productData);
  },
);

export const updateStock = createAsyncThunk(
  "inventory/updateStock",
  async ({ id, quantity }: { id: string; quantity: number }) => {
    return await apiService.updateStock(id, { quantity });
  },
);

export const fetchInventory = createAsyncThunk(
  "inventory/fetchInventory",
  async (
    args:
      | {
          search?: string;
          status?: string;
          sortBy?: string;
          order?: string;
          page?: number;
          limit?: number;
          range?: string;
          dealerId?: string;
          category?: string;
        }
      | undefined,
  ) => {
    return await apiService.getInventory(
      args?.search,
      args?.status,
      args?.sortBy,
      args?.order,
      args?.page,
      args?.limit,
      args?.range,
      args?.dealerId,
      args?.category,
    );
  },
);

export const updateProduct = createAsyncThunk(
  "inventory/updateProduct",
  async ({ id, productData }: { id: string; productData: any }) => {
    return await apiService.updateProduct(id, productData);
  },
);

export const deleteProductThunk = createAsyncThunk(
  "inventory/deleteProduct",
  async (id: string) => {
    return await apiService.deleteProduct(id);
  },
);

export const restoreProductThunk = createAsyncThunk(
  "inventory/restoreProduct",
  async (id: string) => {
    return await apiService.restoreProduct(id);
  },
);

const inventorySlice = createSlice({
  name: "inventory",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        fetchProducts.fulfilled,
        (state, action: PayloadAction<any[]>) => {
          state.loading = false;
          state.products = action.payload;
        },
      )
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch products";
      })
      .addCase(fetchInventory.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(
        fetchInventory.fulfilled,
        (state, action) => {
          if (state.currentRequestId !== action.meta.requestId) return;
          state.loading = false;
          state.products = Array.isArray(action.payload?.data)
            ? action.payload.data
            : [];
          state.meta = action.payload.meta || null;
          state.currentRequestId = undefined;
        },
      )
      .addCase(fetchInventory.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.error = action.error.message || "Failed to fetch inventory";
        state.products = [];
        state.meta = null;
        state.currentRequestId = undefined;
      })
      .addCase(addProduct.fulfilled, (state, action) => {
        state.products.unshift(action.payload);
      })
      .addCase(updateProduct.fulfilled, (state, action) => {
        const payloadId = action.payload?._id || action.payload?.id;
        if (!payloadId) return;
        const index = state.products.findIndex(
          (p) =>
            String(p._id || p.id) === String(payloadId),
        );
        if (index !== -1) {
          state.products[index] = {
            ...state.products[index],
            ...action.payload,
          };
        }
      })
      .addCase(updateStock.fulfilled, (state, action) => {
        // action.payload is a StockItem. Find product with matching productId.
        const index = state.products.findIndex(
          (p) =>
            (p._id || p.id).toString() === action.payload.productId.toString(),
        );
        if (index !== -1) {
          state.products[index] = {
            ...state.products[index],
            quantity: action.payload.quantity,
            // If StockItem has other fields we joined, update them too
          };
        }
      })
      .addCase(deleteProductThunk.fulfilled, (state, action) => {
        state.products = state.products.filter(
          (p) =>
            (p._id || p.id).toString() !==
            (action.payload._id || action.payload.id).toString(),
        );
      })
      .addCase(restoreProductThunk.fulfilled, (state, action) => {
        state.products = state.products.filter(
          (p) =>
            (p._id || p.id).toString() !==
            (action.payload._id || action.payload.id).toString(),
        );
      });
  },
});

export default inventorySlice.reducer;
