const mongoose = require('mongoose');

const workspaceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500,
    default: ''
  },
  widgets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Widget'
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  gridSettings: {
    cols: {
      type: Number,
      default: 12
    },
    rowHeight: {
      type: Number,
      default: 30
    },
    margin: {
      type: [Number],
      default: [10, 10]
    },
    containerPadding: {
      type: [Number],
      default: [10, 10]
    }
  }
}, {
  timestamps: true
});

// Index for faster queries
workspaceSchema.index({ user: 1, createdAt: -1 });
workspaceSchema.index({ user: 1, name: 1 });

// Ensure user has only one default workspace
workspaceSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await mongoose.model('Workspace').updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Virtual to populate widgets count
workspaceSchema.virtual('widgetCount', {
  ref: 'Widget',
  localField: '_id',
  foreignField: 'workspace',
  count: true
});

// Ensure virtual fields are serialized
workspaceSchema.set('toJSON', { virtuals: true });
workspaceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Workspace', workspaceSchema);