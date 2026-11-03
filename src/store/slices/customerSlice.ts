import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "../../services/apiService";

interface CustomerState {
  customers: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: CustomerState = {
  customers: [],
  total: 0,
  loading: false,
  error: null,
};

export const fetchCustomers = createAsyncThunk(
  "customers/fetchCustomers",
  async (
    args:
      | { search?: string; page?: number; limit?: number; range?: string }
      | undefined,
  ) => {
    return await apiService.getCustomers(
      args?.search,
      args?.page,
      args?.limit,
      args?.range,
    );
  },
);

export const createCustomer = createAsyncThunk(
  "customers/createCustomer",
  async (customerData: any) => {
    return await apiService.createCustomer(customerData);
  },
);

export const updateCustomerThunk = createAsyncThunk(
  "customers/updateCustomer",
  async ({ id, customerData }: { id: string; customerData: any }) => {
    return await apiService.updateCustomer(id, customerData);
  },
);

export const deleteCustomerThunk = createAsyncThunk(
  "customers/deleteCustomer",
  async (id: string) => {
    return await apiService.deleteCustomer(id);
  },
);

const customerSlice = createSlice({
  name: "customers",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        fetchCustomers.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.customers = action.payload.data;
          state.total = action.payload.meta?.total || 0;
        },
      )
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch customers";
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.customers.unshift(action.payload);
      })
      .addCase(updateCustomerThunk.fulfilled, (state, action) => {
        const index = state.customers.findIndex(
          (c) => (c._id || c.id) === (action.payload._id || action.payload.id),
        );
        if (index !== -1) {
          state.customers[index] = action.payload;
        }
      })
      .addCase(deleteCustomerThunk.fulfilled, (state, action) => {
        state.customers = state.customers.filter(
          (c) => (c._id || c.id) !== (action.payload._id || action.payload.id),
        );
      });
  },
});

export default customerSlice.reducer;
