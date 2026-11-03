import { configureStore } from '@reduxjs/toolkit';
import inventoryReducer from './slices/inventorySlice';
import transactionReducer from './slices/transactionSlice';
import customerReducer from './slices/customerSlice';
import dealerReducer from './slices/dealerSlice';
import analyticsReducer from './slices/analyticsSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    inventory: inventoryReducer,
    transactions: transactionReducer,
    customers: customerReducer,
    dealers: dealerReducer,
    analytics: analyticsReducer,
    settings: settingsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
