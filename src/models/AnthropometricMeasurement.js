const mongoose = require('mongoose');

const anthropometricMeasurementSchema = new mongoose.Schema({
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
  weight: {
    type: Number,
    required: true,
    min: 0
  },
  height: {
    type: Number,
    required: true,
    min: 0
  },
  skinfolds: {
    triceps: {
      type: Number,
      min: 0
    },
    subscapular: {
      type: Number,
      min: 0
    },
    biceps: {
      type: Number,
      min: 0
    },
    iliac: {
      type: Number,
      min: 0
    },
    supraspinal: {
      type: Number,
      min: 0
    },
    abdominal: {
      type: Number,
      min: 0
    },
    thigh: {
      type: Number,
      min: 0
    },
    calf: {
      type: Number,
      min: 0
    }
  },
  perimeters: {
    arm: {
      type: Number,
      min: 0
    },
    forearm: {
      type: Number,
      min: 0
    },
    chest: {
      type: Number,
      min: 0
    },
    waist: {
      type: Number,
      min: 0
    },
    hip: {
      type: Number,
      min: 0
    },
    thigh: {
      type: Number,
      min: 0
    },
    calf: {
      type: Number,
      min: 0
    }
  },
  bodyFatPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  leanMass: {
    type: Number,
    min: 0
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Calculate body fat percentage and lean mass before saving
anthropometricMeasurementSchema.pre('save', function(next) {
  if (this.isModified('weight') || this.isModified('bodyFatPercentage')) {
    if (this.bodyFatPercentage && this.weight) {
      this.leanMass = this.weight * (1 - this.bodyFatPercentage / 100);
    }
  }
  next();
});

// Indexes for better query performance
anthropometricMeasurementSchema.index({ userId: 1, date: -1 });
anthropometricMeasurementSchema.index({ professionalId: 1, date: -1 });

const AnthropometricMeasurement = mongoose.model('AnthropometricMeasurement', anthropometricMeasurementSchema);

module.exports = AnthropometricMeasurement; 