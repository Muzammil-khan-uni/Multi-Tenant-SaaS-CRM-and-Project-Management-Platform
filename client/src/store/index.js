import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import clientReducer from './slices/clientSlice';
import projectReducer from './slices/projectSlice';
import taskReducer from './slices/taskSlice';
import invoiceReducer from './slices/invoiceSlice';
import uiReducer from './slices/uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    clients: clientReducer,
    projects: projectReducer,
    tasks: taskReducer,
    invoices: invoiceReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});