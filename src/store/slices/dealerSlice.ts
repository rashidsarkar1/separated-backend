import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { apiService } from "../../services/apiService";

interface DealerState {
  dealers: any[];
  loading: boolean;
  error: string | null;
  currentRequestId?: string;
  meta: {
    page: number;
    limit: number;
    total: number;
  } | null;
}

const initialState: DealerState = {
  dealers: [],
  loading: false,
  error: null,
  meta: null,
};

export const fetchDealers = createAsyncThunk(
  "dealers/fetchDealers",
  async (
    args:
      | {
          page?: number;
          limit?: number;
          range?: string;
          search?: string;
          sortBy?: string;
          order?: string;
        }
      | undefined,
  ) => {
    return await apiService.getDealers(
      args?.page,
      args?.limit,
      args?.range,
      args?.search,
      args?.sortBy,
      args?.order,
    );
  },
);

export const createDealer = createAsyncThunk(
  "dealers/createDealer",
  async (dealerData: any) => {
    return await apiService.createDealer(dealerData);
  },
);

export const updateDealer = createAsyncThunk(
  "dealers/updateDealer",
  async ({ id, dealerData }: { id: string; dealerData: any }) => {
    return await apiService.updateDealer(id, dealerData);
  },
);

const dealerSlice = createSlice({
  name: "dealers",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDealers.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.currentRequestId = action.meta.requestId;
      })
      .addCase(fetchDealers.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.dealers = action.payload?.data || [];
        state.meta = action.payload.meta || null;
        state.currentRequestId = undefined;
      })
      .addCase(fetchDealers.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.error = action.error.message || "Failed to fetch dealers";
        state.dealers = [];
        state.meta = null;
        state.currentRequestId = undefined;
      })
      .addCase(createDealer.fulfilled, (state, action) => {
        state.dealers.unshift(action.payload);
      })
      .addCase(updateDealer.fulfilled, (state, action) => {
        const updatedId = String(action.payload?._id || action.payload?.id);
        const index = state.dealers.findIndex(
          (dealer) => String(dealer._id || dealer.id) === updatedId,
        );
        if (index >= 0) state.dealers[index] = action.payload;
      });
  },
});

export default dealerSlice.reducer;
