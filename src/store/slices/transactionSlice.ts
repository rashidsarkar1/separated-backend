import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "../../services/apiService";

interface TransactionState {
  transactions: any[];
  loading: boolean;
  error: string | null;
  meta: {
    page: number;
    limit: number;
    total: number;
  } | null;
}

const initialState: TransactionState = {
  transactions: [],
  loading: false,
  error: null,
  meta: null,
};

export const fetchTransactions = createAsyncThunk(
  "transactions/fetchTransactions",
  async (
    args:
      | { search?: string; page?: number; limit?: number; range?: string }
      | undefined,
  ) => {
    return await apiService.getTransactions(
      args?.search,
      args?.page,
      args?.limit,
      args?.range,
    );
  },
);

export const recordTransaction = createAsyncThunk(
  "transactions/recordTransaction",
  async (transactionData: any) => {
    return await apiService.recordTransaction(transactionData);
  },
);

const transactionSlice = createSlice({
  name: "transactions",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTransactions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchTransactions.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.transactions = action.payload.data;
          state.meta = action.payload.meta || null;
        },
      )
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch transactions";
        state.transactions = [];
        state.meta = null;
      })
      .addCase(recordTransaction.fulfilled, (state, action) => {
        state.transactions.unshift(action.payload);
      });
  },
});

export default transactionSlice.reducer;
