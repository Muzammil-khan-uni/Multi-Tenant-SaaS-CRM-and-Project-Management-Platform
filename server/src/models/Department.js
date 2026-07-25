import mongoose from 'mongoose';

const departmentSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Department name is required'],
    trim: true
  },
  code: {
    type: String,
    uppercase: true,
    trim: true
  },
  description: String,
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  parentDepartment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department'
  },
  employees: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  budget: {
    allocated: Number,
    spent: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

departmentSchema.index({ workspace: 1, name: 1 });
departmentSchema.index({ code: 1 });

export default mongoose.model('Department', departmentSchema);