const mongoose = require('mongoose');
const User = require('./User');

const professionalSchema = new mongoose.Schema({
  specialization: {
    type: String,
    required: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: true,
    trim: true
  },
  yearsOfExperience: {
    type: Number,
    required: true,
    min: 0
  },
  patients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

const Professional = User.discriminator('professional', professionalSchema);

module.exports = Professional; 