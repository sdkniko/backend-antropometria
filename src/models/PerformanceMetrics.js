const mongoose = require('mongoose');

const performanceMetricsSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  professionalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  vo2max: {
    type: Number,
    min: 0
  },
  power: {
    type: Number,
    min: 0
  },
  speed: {
    type: Number,
    min: 0
  },
  trainingLoad: {
    type: Number,
    min: 0
  },
  sport: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
performanceMetricsSchema.index({ userId: 1, date: -1 });
performanceMetricsSchema.index({ professionalId: 1, date: -1 });
performanceMetricsSchema.index({ sport: 1, date: -1 });

const PerformanceMetrics = mongoose.model('PerformanceMetrics', performanceMetricsSchema);

module.exports = PerformanceMetrics; 