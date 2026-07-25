import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { clientsAPI } from '../../api/clients.api';

export const fetchClients = createAsyncThunk(
  'clients/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const { data } = await clientsAPI.getAll(params);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch clients'
      );
    }
  }
);

export const fetchClientById = createAsyncThunk(
  'clients/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await clientsAPI.getById(id);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch client'
      );
    }
  }
);

export const createClient = createAsyncThunk(
  'clients/create',
  async (clientData, { rejectWithValue }) => {
    try {
      const { data } = await clientsAPI.create(clientData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create client'
      );
    }
  }
);

export const updateClient = createAsyncThunk(
  'clients/update',
  async ({ id, data: clientData }, { rejectWithValue }) => {
    try {
      const { data } = await clientsAPI.update(id, clientData);
      return data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update client'
      );
    }
  }
);

export const deleteClient = createAsyncThunk(
  'clients/delete',
  async (id, { rejectWithValue }) => {
    try {
      await clientsAPI.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete client'
      );
    }
  }
);

const initialState = {
  clients: [],
  selectedClient: null,
  loading: false,
  error: null,
  totalCount: 0,
};

const clientSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    clearSelectedClient: (state) => {
      state.selectedClient = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.clients = action.payload.data || action.payload;
        state.totalCount =
          action.payload.count || action.payload.data?.length || 0;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(fetchClientById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchClientById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedClient = action.payload.data || action.payload;
      })
      .addCase(fetchClientById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(createClient.fulfilled, (state, action) => {
        state.clients.unshift(action.payload.data || action.payload);
      })

      .addCase(updateClient.fulfilled, (state, action) => {
        const index = state.clients.findIndex(
          (c) => c._id === (action.payload.data?._id || action.payload._id)
        );
        if (index !== -1) {
          state.clients[index] = action.payload.data || action.payload;
        }
        state.selectedClient = action.payload.data || action.payload;
      })

      .addCase(deleteClient.fulfilled, (state, action) => {
        state.clients = state.clients.filter((c) => c._id !== action.payload);
        state.selectedClient = null;
      });
  },
});

export const { clearSelectedClient, clearError } = clientSlice.actions;
export default clientSlice.reducer;
