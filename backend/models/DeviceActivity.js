const mongoose = require('mongoose');

const deviceActivitySchema = new mongoose.Schema({
  device_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  action_type: {
    type: String,
    required: true,
    enum: [
      'deploy_code', 
      'check_logs', 
      'run_script', 
      'terminal_session', 
      'file_operation', 
      'system_check',
      'restart',
      'shutdown'
    ]
  },
  status: {
    type: String,
    enum: ['in_progress', 'success', 'failed'],
    default: 'in_progress'
  },
  log_output: {
    type: String,
    default: ''
  },
  command: {
    type: String // The actual command executed
  },
  start_time: {
    type: Date,
    default: Date.now
  },
  end_time: {
    type: Date
  },
  triggered_by: {
    type: String,
    required: true // Username or user_id who triggered the action
  },
  session_id: {
    type: String // For terminal sessions
  },
  error_message: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
deviceActivitySchema.index({ device_id: 1, createdAt: -1 });
deviceActivitySchema.index({ session_id: 1 });
deviceActivitySchema.index({ action_type: 1 });

module.exports = mongoose.model('DeviceActivity', deviceActivitySchema);