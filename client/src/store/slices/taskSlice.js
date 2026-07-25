import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tasks: [],
  selectedTask: null,
  loading: false,
  error: null,
  filters: {
    status: null,
    priority: null,
    project: null,
    assignedTo: null,
  },
};

const taskSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action) => {
      state.tasks = action.payload;
    },
    setSelectedTask: (state, action) => {
      state.selectedTask = action.payload;
    },
    addTask: (state, action) => {
      state.tasks.unshift(action.payload);
    },
    updateTask: (state, action) => {
      const index = state.tasks.findIndex((t) => t._id === action.payload._id);
      if (index !== -1) {
        state.tasks[index] = action.payload;
      }
      if (state.selectedTask?._id === action.payload._id) {
        state.selectedTask = action.payload;
      }
    },
    removeTask: (state, action) => {
      state.tasks = state.tasks.filter((t) => t._id !== action.payload);
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = initialState.filters;
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
  setTasks,
  setSelectedTask,
  addTask,
  updateTask,
  removeTask,
  setFilters,
  clearFilters,
  setLoading,
  setError,
  clearError,
} = taskSlice.actions;

export default taskSlice.reducer;
