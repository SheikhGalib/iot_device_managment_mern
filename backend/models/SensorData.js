const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema({
  device_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },
  device_key: {
    type: String,
    required: true,
    index: true
  },
  metric_type: {
    type: String,
    enum: ['temperature', 'humidity', 'led', 'gps'],
    required: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  unit: {
    type: String,
    default: ''
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient querying
sensorDataSchema.index({ device_id: 1, metric_type: 1, timestamp: -1 });
sensorDataSchema.index({ device_key: 1, metric_type: 1, timestamp: -1 });
sensorDataSchema.index({ timestamp: -1 });

// TTL index to automatically delete old data after 1 year (optional)
sensorDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 });

// Static methods for querying
sensorDataSchema.statics.getHistoricalData = function(deviceId, metricTypes, startDate, endDate, limit = 1000) {
  const query = {
    device_id: deviceId,
    timestamp: {
      $gte: startDate,
      $lte: endDate
    }
  };

  if (metricTypes && metricTypes.length > 0) {
    query.metric_type = { $in: metricTypes };
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

sensorDataSchema.statics.getLatestValues = function(deviceId, metricTypes) {
  const pipeline = [
    {
      $match: {
        device_id: deviceId,
        ...(metricTypes && metricTypes.length > 0 ? { metric_type: { $in: metricTypes } } : {})
      }
    },
    {
      $sort: { timestamp: -1 }
    },
    {
      $group: {
        _id: '$metric_type',
        latestData: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$latestData' }
    }
  ];

  return this.aggregate(pipeline);
};

sensorDataSchema.statics.getAggregatedData = function(deviceId, metricType, startDate, endDate, interval = 'hour') {
  const groupBy = {
    hour: {
      year: { $year: '$timestamp' },
      month: { $month: '$timestamp' },
      day: { $dayOfMonth: '$timestamp' },
      hour: { $hour: '$timestamp' }
    },
    day: {
      year: { $year: '$timestamp' },
      month: { $month: '$timestamp' },
      day: { $dayOfMonth: '$timestamp' }
    },
    week: {
      year: { $year: '$timestamp' },
      week: { $week: '$timestamp' }
    },
    month: {
      year: { $year: '$timestamp' },
      month: { $month: '$timestamp' }
    }
  };

  const pipeline = [
    {
      $match: {
        device_id: deviceId,
        metric_type: metricType,
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: groupBy[interval],
        avgValue: { $avg: '$value' },
        minValue: { $min: '$value' },
        maxValue: { $max: '$value' },
        count: { $sum: 1 },
        firstTimestamp: { $min: '$timestamp' },
        lastTimestamp: { $max: '$timestamp' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ];

  return this.aggregate(pipeline);
};

module.exports = mongoose.model('SensorData', sensorDataSchema);