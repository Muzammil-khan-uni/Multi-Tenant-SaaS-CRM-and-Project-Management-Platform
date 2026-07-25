import mongoose from 'mongoose';

const platformAnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: 5000,
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'success', 'danger'],
      default: 'info',
    },
    targetAudience: {
      type: String,
      enum: ['all', 'admins', 'specific_plan'],
      default: 'all',
    },
    targetPlan: {
      type: String,
      enum: ['free', 'starter', 'professional', 'enterprise'],
    },
    isActive: { type: Boolean, default: true },
    isPinned: { type: Boolean, default: false },
    expiresAt: Date,
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    readBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
        readAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

platformAnnouncementSchema.index({ isActive: 1, createdAt: -1 });
platformAnnouncementSchema.index({ isPinned: -1, createdAt: -1 });

export default mongoose.model('PlatformAnnouncement', platformAnnouncementSchema);
