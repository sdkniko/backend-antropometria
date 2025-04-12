const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
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
  type: {
    type: String,
    enum: ['individual', 'group'],
    required: true
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  content: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  format: {
    type: String,
    enum: ['pdf', 'excel'],
    required: true
  },
  shared: {
    type: Boolean,
    default: false
  },
  accessCode: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Generate access code before saving if shared is true
reportSchema.pre('save', function(next) {
  if (this.shared && !this.accessCode) {
    this.accessCode = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
  }
  next();
});

// Indexes for better query performance
reportSchema.index({ userId: 1, date: -1 });
reportSchema.index({ professionalId: 1, date: -1 });
reportSchema.index({ accessCode: 1 }, { sparse: true });

const Report = mongoose.model('Report', reportSchema);

module.exports = Report; 