import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '../../services/apiService';

interface SettingsState {
  config: {
    shopName: string;
    address: string;
    phone: string;
    secondaryPhone?: string;
    email: string;
    footerText: string;
  } | null;
  loading: boolean;
  error: string | null;
}

const initialState: SettingsState = {
  config: null,
  loading: false,
  error: null,
};

export const fetchSettings = createAsyncThunk(
  'settings/fetchSettings',
  async () => {
    return await apiService.getSettings();
  }
);

export const updateSettingsThunk = createAsyncThunk(
  'settings/updateSettings',
  async (settingsData: any) => {
    return await apiService.updateSettings(settingsData);
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSettings.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchSettings.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.config = action.payload;
      })
      .addCase(fetchSettings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch settings';
      })
      .addCase(updateSettingsThunk.fulfilled, (state, action: PayloadAction<any>) => {
        state.config = action.payload;
      });
  },
});

export default settingsSlice.reducer;
