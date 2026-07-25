import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  invoices: [],
  selectedInvoice: null,
  loading: false,
  error: null,
};

const invoiceSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    setInvoices: (state, action) => {
      state.invoices = action.payload;
    },
    setSelectedInvoice: (state, action) => {
      state.selectedInvoice = action.payload;
    },
    addInvoice: (state, action) => {
      state.invoices.unshift(action.payload);
    },
    updateInvoice: (state, action) => {
      const index = state.invoices.findIndex(
        (i) => i._id === action.payload._id
      );
      if (index !== -1) {
        state.invoices[index] = action.payload;
      }
    },
    removeInvoice: (state, action) => {
      state.invoices = state.invoices.filter((i) => i._id !== action.payload);
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setInvoices,
  setSelectedInvoice,
  addInvoice,
  updateInvoice,
  removeInvoice,
  setLoading,
  setError,
  clearError,
} = invoiceSlice.actions;

export default invoiceSlice.reducer;
