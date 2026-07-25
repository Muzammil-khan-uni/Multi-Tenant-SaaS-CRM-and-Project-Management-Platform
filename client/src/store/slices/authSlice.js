import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authAPI } from '../../api/auth.api';

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.login(credentials);
      const payload = data.data;

      if (payload.requiresWorkspaceSelection) {
        return payload; // { requiresWorkspaceSelection, workspaces, tempToken }
      }

      // Single-workspace path OR super admin — persist tokens immediately
      localStorage.setItem('accessToken', payload.accessToken);
      localStorage.setItem('refreshToken', payload.refreshToken);

      // Super admin: no workspace slug to store
      if (!payload.isSuperAdmin && payload.user?.workspace?.slug) {
        localStorage.setItem('workspaceSlug', payload.user.workspace.slug);
      }
      return payload; // { user, accessToken, refreshToken } or { isSuperAdmin, user, ... }
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData?.requiresEmailVerification) {
        return {
          requiresEmailVerification: true,
          email: responseData.email,
        };
      }
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.register(userData);
      return data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Registration failed'
      );
    }
  }
);

export const selectWorkspaceThunk = createAsyncThunk(
  'auth/selectWorkspace',
  async ({ tempToken, workspaceId }, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.selectWorkspace(tempToken, workspaceId);
      const payload = data.data; // { user, accessToken, refreshToken }
      localStorage.setItem('accessToken', payload.accessToken);
      localStorage.setItem('refreshToken', payload.refreshToken);
      if (payload.user?.workspace?.slug) {
        localStorage.setItem('workspaceSlug', payload.user.workspace.slug);
      }
      return payload;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to select workspace'
      );
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await authAPI.getMe();
      return data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to get user'
      );
    }
  }
);

const initialState = {
  user: null,
  workspace: null,

  pendingWorkspaces: null,
  tempToken: null,

  pendingVerificationEmail: null,

  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      if (action.payload.accessToken) state.isAuthenticated = true;
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
    },
    setWorkspace: (state, action) => {
      state.workspace = action.payload;
      if (action.payload?.slug) {
        localStorage.setItem('workspaceSlug', action.payload.slug);
      }
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    clearPendingWorkspaces: (state) => {
      state.pendingWorkspaces = null;
      state.tempToken = null;
    },
    logout: (state) => {
      state.user = null;
      state.workspace = null;
      state.pendingWorkspaces = null;
      state.tempToken = null;
      state.pendingVerificationEmail = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('workspaceSlug');
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder

      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;

        if (action.payload.requiresWorkspaceSelection) {
          state.pendingWorkspaces = action.payload.workspaces;
          state.tempToken = action.payload.tempToken;
          return;
        }

        if (action.payload.requiresEmailVerification) {
          state.pendingVerificationEmail = action.payload.email || null;
          return;
        }

        const isSuperAdmin =
          action.payload.isSuperAdmin || action.payload.user?.isSuperAdmin;

        state.user = action.payload.user;
        state.workspace = isSuperAdmin
          ? null
          : action.payload.user?.workspace || null;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.pendingWorkspaces = null;
        state.tempToken = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(selectWorkspaceThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(selectWorkspaceThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.workspace = action.payload.user?.workspace || null;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.pendingWorkspaces = null;
        state.tempToken = null;
      })
      .addCase(selectWorkspaceThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingVerificationEmail = action.payload.email || null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        // Super admin has no workspace context
        if (action.payload?.isSuperAdmin) {
          state.workspace = null;
        } else {
          state.workspace = action.payload.workspace;
        }
        state.isAuthenticated = true;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });
  },
});

export const {
  setCredentials,
  setWorkspace,
  setUser,
  clearPendingWorkspaces,
  logout,
  clearError,
} = authSlice.actions;

export default authSlice.reducer;
