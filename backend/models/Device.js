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
    enum: ['ESP32', 'ESP8266', 'Arduino', 'NodeMCU', 'Raspberry Pi', 'Orange Pi', 'Windows PC', 'Linux Server', 'Ubuntu', 'Other']
  },
  description: {
    type: String,
    trim: true,
    maxLength: 500
  },
  category: {
    type: String,
    required: true,
    enum: ['IoT', 'Computer'],
    default: function() {
      return ['ESP32', 'ESP8266', 'Arduino'].includes(this.type) ? 'IoT' : 'Computer';
    }
  },
  // User who created this device
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ip_address: {
    type: String,
    required: function() { return this.category === 'Computer'; },
    validate: {
      validator: function(v) {
        if (!v && this.category === 'IoT') return true; // IP optional for IoT devices
        return /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(v);
      },
      message: 'Invalid IP address format'
    }
  },
  ssh_port: {
    type: Number,
    default: 22,
    min: 1,
    max: 65535,
    required: function() { return this.category === 'Computer'; }
  },
  ssh_username: {
    type: String,
    required: function() { return this.category === 'Computer'; }
  },
  ssh_password: {
    type: String,
    required: function() { return this.category === 'Computer'; }
  },
  http_port: {
    type: Number,
    default: 8081,
    min: 1,
    max: 65535
  },
  mac_address: {
    type: String,
    required: false, // Made optional
    validate: {
      validator: function(v) {
        if (!v) return true; // Allow empty
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
  // IoT-specific fields
  supported_apis: [{
    type: String,
    enum: ['temperature-control', 'humidity-control', 'led-control', 'gps-control', 'camera-control']
  }],
  current_data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  last_data_received: {
    type: Date
  },
  heartbeat_interval: {
    type: Number,
    default: 30000, // 30 seconds
    min: 1000 // minimum 1 second
  },
  // Computer-specific metadata (only for Computer category)
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