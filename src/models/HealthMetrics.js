const mongoose = require('mongoose');

const healthMetricsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  sleep: {
    duration: {
      type: Number,
      min: 0
    },
    quality: {
      type: Number,
      min: 0,
      max: 100
    },
    deepSleep: {
      type: Number,
      min: 0
    },
    lightSleep: {
      type: Number,
      min: 0
    },
    remSleep: {
      type: Number,
      min: 0
    }
  },
  stress: {
    type: Number,
    min: 0,
    max: 100
  },
  restingHeartRate: {
    type: Number,
    min: 0
  },
  heartRateVariability: {
    type: Number,
    min: 0
  },
  steps: {
    type: Number,
    min: 0
  },
  source: {
    type: String,
    enum: ['garmin', 'google_fit', 'apple_health'],
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
healthMetricsSchema.index({ userId: 1, date: -1 });
healthMetricsSchema.index({ source: 1, date: -1 });

const HealthMetrics = mongoose.model('HealthMetrics', healthMetricsSchema);

module.exports = HealthMetrics; 