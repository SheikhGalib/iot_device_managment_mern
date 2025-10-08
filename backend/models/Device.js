const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Raspberry Pi', 'Orange Pi', 'Windows PC', 'Linux Server', 'Other']
  },
  ip_address: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v);
      },
      message: 'Invalid IP address format'
    }
  },
  ssh_port: {
    type: Number,
    default: 22,
    min: 1,
    max: 65535
  },
  ssh_username: {
    type: String,
    required: true
  },
  ssh_password: {
    type: String,
    required: true // Note: Replace with SSH keys in production
  },
  mac_address: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(v);
      },
      message: 'Invalid MAC address format'
    }
  },
  device_key: {
    type: String,
    unique: true,
    required: true
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },
  api_status: {
    type: String,
    enum: ['not-connected', 'connected', 'error'],
    default: 'not-connected'
  },
  last_seen: {
    type: Date,
    default: Date.now
  },
  cpu_usage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  ram_usage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  temperature: {
    type: Number,
    default: 0,
    min: 0,
    max: 200
  },
  active_sessions: {
    type: Number,
    default: 0,
    min: 0
  },
  deployment_status: {
    type: String,
    enum: ['idle', 'running', 'error'],
    default: 'idle'
  },
  metadata: {
    os: String,
    version: String,
    architecture: String,
    total_memory: String,
    total_storage: String
  }
}, {
  timestamps: true
});

// Index for faster queries
deviceSchema.index({ ip_address: 1 });
deviceSchema.index({ status: 1 });
deviceSchema.index({ type: 1 });

module.exports = mongoose.model('Device', deviceSchema);