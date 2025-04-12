const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth, requireProfessional } = require('../middleware/auth');
const User = require('../models/User');
const AnthropometricMeasurement = require('../models/AnthropometricMeasurement');
const HealthMetrics = require('../models/HealthMetrics');
const PerformanceMetrics = require('../models/PerformanceMetrics');

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    res.json(req.user.getPublicProfile());
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error fetching profile'
      }
    });
  }
});

// Update user profile
router.put('/profile', [
  auth,
  body('name').optional().trim().notEmpty(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('age').optional().isInt({ min: 0 }),
  body('country').optional().trim().notEmpty(),
  body('settings.language').optional().isString(),
  body('settings.theme').optional().isString(),
  body('settings.notifications').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'gender', 'age', 'country', 'settings'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UPDATE',
          message: 'Invalid updates'
        }
      });
    }

    updates.forEach(update => {
      if (update === 'settings') {
        Object.keys(req.body.settings).forEach(setting => {
          req.user.settings[setting] = req.body.settings[setting];
        });
      } else {
        req.user[update] = req.body[update];
      }
    });

    await req.user.save();
    res.json(req.user.getPublicProfile());
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error updating profile'
      }
    });
  }
});

// Get list of patients (for professionals)
router.get('/patients', auth, requireProfessional, async (req, res) => {
  try {
    const { name, gender, age, sport, position, page = 1, limit = 10 } = req.query;
    const query = { professionalId: req.user._id, role: 'athlete' };
    
    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }
    if (gender) {
      query.gender = gender;
    }
    if (age) {
      query.age = age;
    }
    if (sport) {
      query.sport = sport;
    }
    if (position) {
      query.position = position;
    }

    const patients = await User.find(query)
      .select('-password -refreshToken')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      patients,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({ message: 'Error fetching patients' });
  }
});

// Get patient details (professionals only)
router.get('/patients/:id', [auth, requireProfessional], async (req, res) => {
  try {
    const patient = await User.findOne({
      _id: req.params.id,
      role: 'athlete',
      professionalId: req.user._id
    }).select('-password -__v');

    if (!patient) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Patient not found'
        }
      });
    }

    res.json(patient);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error fetching patient details'
      }
    });
  }
});

// Create new patient (athlete) - professionals only
router.post('/patients', [
  auth,
  requireProfessional,
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
  body('age').isInt({ min: 0 }).withMessage('Age must be a positive number'),
  body('country').trim().notEmpty().withMessage('Country is required'),
  body('sport').optional().trim(),
  body('position').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: errors.array().map(err => ({
            field: err.param,
            message: err.msg
          }))
        }
      });
    }

    const { name, email, password, gender, age, country, sport, position } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: {
          code: 'EMAIL_IN_USE',
          message: 'Email already in use'
        }
      });
    }

    // Create new patient
    const patient = new User({
      name,
      email,
      password,
      role: 'athlete',
      gender,
      age,
      country,
      sport,
      position,
      professionalId: req.user._id,
      isActive: true
    });

    await patient.save();
    res.status(201).json(patient.getPublicProfile());
  } catch (error) {
    console.error('Error creating patient:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error creating patient'
      }
    });
  }
});

// Update patient information (professionals only)
router.put('/patients/:id', [
  auth,
  requireProfessional,
  body('name').optional().trim().notEmpty(),
  body('email').optional().isEmail(),
  body('gender').optional().isIn(['male', 'female', 'other']),
  body('age').optional().isInt({ min: 0 }),
  body('country').optional().trim().notEmpty(),
  body('sport').optional().trim(),
  body('position').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const patient = await User.findOne({
      _id: req.params.id,
      role: 'athlete',
      professionalId: req.user._id
    });

    if (!patient) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Patient not found or not assigned to you'
        }
      });
    }

    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'gender', 'age', 'country', 'sport', 'position'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        error: {
          code: 'INVALID_UPDATE',
          message: 'Invalid updates'
        }
      });
    }

    updates.forEach(update => {
      patient[update] = req.body[update];
    });

    await patient.save();
    res.json(patient.getPublicProfile());
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error updating patient'
      }
    });
  }
});

// Delete patient (professionals only)
router.delete('/patients/:id', [auth, requireProfessional], async (req, res) => {
  try {
    const patient = await User.findOne({
      _id: req.params.id,
      role: 'athlete',
      professionalId: req.user._id
    });

    if (!patient) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Patient not found or not assigned to you'
        }
      });
    }

    // Delete all related data
    await Promise.all([
      // Delete patient's measurements
      AnthropometricMeasurement.deleteMany({ userId: patient._id }),
      // Delete patient's health data
      HealthMetrics.deleteMany({ userId: patient._id }),
      // Delete patient's performance data
      PerformanceMetrics.deleteMany({ userId: patient._id }),
      // Delete the patient
      patient.deleteOne()
    ]);

    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    console.error('Error deleting patient:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error deleting patient'
      }
    });
  }
});

module.exports = router; 