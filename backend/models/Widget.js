const mongoose = require('mongoose');

const widgetSchema = new mongoose.Schema({
  workspace: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['temperature', 'humidity', 'led', 'gps', 'camera', 'chart', 'gauge', 'text', 'custom'],
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  settings: {
    unit: {
      type: String,
      trim: true,
      maxlength: 20,
      default: ''
    },
    sensorKey: {
      type: String,
      trim: true,
      maxlength: 50,
      default: ''
    },
    format: {
      type: String,
      enum: ['number', 'text', 'boolean', 'json'],
      default: 'number'
    },
    precision: {
      type: Number,
      min: 0,
      max: 10,
      default: 2
    },
    minValue: {
      type: Number,
      default: null
    },
    maxValue: {
      type: Number,
      default: null
    },
    thresholds: {
      warning: {
        type: Number,
        default: null
      },
      critical: {
        type: Number,
        default: null
      }
    },
    color: {
      type: String,
      match: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
      default: '#3b82f6'
    },
    refreshInterval: {
      type: Number,
      min: 1000,
      max: 300000,
      default: 5000
    },
    showHistory: {
      type: Boolean,
      default: false
    },
    historyDuration: {
      type: Number,
      min: 3600,
      max: 86400,
      default: 3600
    }
  },
  layout: {
    x: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    y: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    w: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      default: 3
    },
    h: {
      type: Number,
      required: true,
      min: 1,
      default: 4
    },
    i: {
      type: String,
      required: true,
      index: true
    },
    minW: {
      type: Number,
      min: 1,
      default: 1
    },
    minH: {
      type: Number,
      min: 1,
      default: 2
    },
    maxW: {
      type: Number,
      min: 1,
      max: 12,
      default: 12
    },
    maxH: {
      type: Number,
      min: 1,
      default: 20
    },
    static: {
      type: Boolean,
      default: false
    },
    isDraggable: {
      type: Boolean,
      default: true
    },
    isResizable: {
      type: Boolean,
      default: true
    }
  },
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    index: true,
    default: null
  },
  dataPath: {
    type: String,
    trim: true,
    maxlength: 200,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  order: {
    type: Number,
    default: 0,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
widgetSchema.index({ workspace: 1, order: 1 });
widgetSchema.index({ workspace: 1, type: 1 });
widgetSchema.index({ deviceId: 1, dataPath: 1 });
widgetSchema.index({ workspace: 1, isActive: 1, order: 1 });

// Pre-save middleware to set layout.i to widget._id if not set
widgetSchema.pre('save', function(next) {
  if (!this.layout.i) {
    this.layout.i = this._id.toString();
  }
  next();
});

// Virtual to get full data path
widgetSchema.virtual('fullDataPath').get(function() {
  if (this.deviceId && this.dataPath) {
    return `${this.deviceId}.${this.dataPath}`;
  }
  return this.dataPath || '';
});

// Method to get default layout based on widget type
widgetSchema.methods.getDefaultLayout = function() {
  const defaults = {
    temperature: { w: 3, h: 4, minW: 2, minH: 3 },
    humidity: { w: 3, h: 4, minW: 2, minH: 3 },
    led: { w: 2, h: 3, minW: 2, minH: 2 },
    gps: { w: 4, h: 5, minW: 3, minH: 4 },
    camera: { w: 6, h: 6, minW: 4, minH: 4 },
    chart: { w: 6, h: 5, minW: 4, minH: 4 },
    gauge: { w: 4, h: 4, minW: 3, minH: 3 },
    text: { w: 3, h: 2, minW: 2, minH: 1 },
    custom: { w: 3, h: 4, minW: 2, minH: 2 }
  };

  const typeDefaults = defaults[this.type] || defaults.custom;
  
  return {
    x: 0,
    y: 0,
    w: typeDefaults.w,
    h: typeDefaults.h,
    i: this._id.toString(),
    minW: typeDefaults.minW,
    minH: typeDefaults.minH,
    maxW: 12,
    maxH: 20,
    static: false,
    isDraggable: true,
    isResizable: true
  };
};

// Method to validate layout constraints
widgetSchema.methods.validateLayout = function() {
  const layout = this.layout;
  const errors = [];

  if (layout.x < 0) errors.push('x position cannot be negative');
  if (layout.y < 0) errors.push('y position cannot be negative');
  if (layout.w < 1 || layout.w > 12) errors.push('width must be between 1 and 12');
  if (layout.h < 1) errors.push('height must be at least 1');
  if (layout.minW && layout.w < layout.minW) errors.push('width cannot be less than minW');
  if (layout.minH && layout.h < layout.minH) errors.push('height cannot be less than minH');
  if (layout.maxW && layout.w > layout.maxW) errors.push('width cannot be greater than maxW');
  if (layout.maxH && layout.h > layout.maxH) errors.push('height cannot be greater than maxH');

  return errors;
};

// Ensure virtual fields are serialized
widgetSchema.set('toJSON', { virtuals: true });
widgetSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Widget', widgetSchema);