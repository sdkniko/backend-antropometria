const mongoose = require('mongoose');
const User = require('./User');

const athleteSchema = new mongoose.Schema({
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  age: {
    type: Number,
    required: true,
    min: 0
  },
  country: {
    type: String,
    required: true
  },
  sport: {
    type: String,
    trim: true
  },
  position: {
    type: String,
    trim: true
  },
  professionalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

const Athlete = User.discriminator('athlete', athleteSchema);

module.exports = Athlete; 