const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth, requireProfessional } = require('../middleware/auth');
const AnthropometricMeasurement = require('../models/AnthropometricMeasurement');
const User = require('../models/User');

// Create new measurement
router.post('/anthropometric', [
  auth,
  requireProfessional,
  body('userId').isMongoId(),
  body('date').optional().isISO8601(),
  body('weight').isFloat({ min: 0 }),
  body('height').isFloat({ min: 0 }),
  body('skinfolds.triceps').optional().isFloat({ min: 0 }),
  body('skinfolds.subscapular').optional().isFloat({ min: 0 }),
  body('skinfolds.biceps').optional().isFloat({ min: 0 }),
  body('skinfolds.iliac').optional().isFloat({ min: 0 }),
  body('skinfolds.supraspinal').optional().isFloat({ min: 0 }),
  body('skinfolds.abdominal').optional().isFloat({ min: 0 }),
  body('skinfolds.thigh').optional().isFloat({ min: 0 }),
  body('skinfolds.calf').optional().isFloat({ min: 0 }),
  body('perimeters.arm').optional().isFloat({ min: 0 }),
  body('perimeters.forearm').optional().isFloat({ min: 0 }),
  body('perimeters.chest').optional().isFloat({ min: 0 }),
  body('perimeters.waist').optional().isFloat({ min: 0 }),
  body('perimeters.hip').optional().isFloat({ min: 0 }),
  body('perimeters.thigh').optional().isFloat({ min: 0 }),
  body('perimeters.calf').optional().isFloat({ min: 0 }),
  body('bodyFatPercentage').optional().isFloat({ min: 0, max: 100 }),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify user exists and is assigned to the professional
    const user = await User.findOne({
      _id: req.body.userId,
      role: 'athlete',
      professionalId: req.user._id
    });

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found or not assigned to you'
        }
      });
    }

    const measurement = new AnthropometricMeasurement({
      ...req.body,
      professionalId: req.user._id
    });

    await measurement.save();
    res.status(201).json(measurement);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error creating measurement'
      }
    });
  }
});

// Get measurements
router.get('/anthropometric', auth, async (req, res) => {
  try {
    const { athleteId, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    const query = {};
    
    if (req.user.role === 'professional') {
      query.professionalId = req.user._id;
      if (athleteId) {
        query.athleteId = athleteId;
      }
    } else {
      query.athleteId = req.user._id;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [measurements, total] = await Promise.all([
      AnthropometricMeasurement.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AnthropometricMeasurement.countDocuments(query)
    ]);

    res.json({
      data: measurements,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error fetching measurements'
      }
    });
  }
});

// Get single measurement
router.get('/anthropometric/:id', auth, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    if (req.user.role === 'professional') {
      query.professionalId = req.user._id;
    } else {
      query.athleteId = req.user._id;
    }

    const measurement = await AnthropometricMeasurement.findOne(query);

    if (!measurement) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Measurement not found'
        }
      });
    }

    res.json(measurement);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error fetching measurement'
      }
    });
  }
});

// Update measurement
router.put('/anthropometric/:id', [
  auth,
  requireProfessional,
  body('date').optional().isISO8601(),
  body('weight').optional().isFloat({ min: 0 }),
  body('height').optional().isFloat({ min: 0 }),
  body('skinfolds.triceps').optional().isFloat({ min: 0 }),
  body('skinfolds.subscapular').optional().isFloat({ min: 0 }),
  body('skinfolds.biceps').optional().isFloat({ min: 0 }),
  body('skinfolds.iliac').optional().isFloat({ min: 0 }),
  body('skinfolds.supraspinal').optional().isFloat({ min: 0 }),
  body('skinfolds.abdominal').optional().isFloat({ min: 0 }),
  body('skinfolds.thigh').optional().isFloat({ min: 0 }),
  body('skinfolds.calf').optional().isFloat({ min: 0 }),
  body('perimeters.arm').optional().isFloat({ min: 0 }),
  body('perimeters.forearm').optional().isFloat({ min: 0 }),
  body('perimeters.chest').optional().isFloat({ min: 0 }),
  body('perimeters.waist').optional().isFloat({ min: 0 }),
  body('perimeters.hip').optional().isFloat({ min: 0 }),
  body('perimeters.thigh').optional().isFloat({ min: 0 }),
  body('perimeters.calf').optional().isFloat({ min: 0 }),
  body('bodyFatPercentage').optional().isFloat({ min: 0, max: 100 }),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const measurement = await AnthropometricMeasurement.findOne({
      _id: req.params.id,
      professionalId: req.user._id
    });

    if (!measurement) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Measurement not found'
        }
      });
    }

    const updates = Object.keys(req.body);
    updates.forEach(update => {
      measurement[update] = req.body[update];
    });

    await measurement.save();
    res.json(measurement);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error updating measurement'
      }
    });
  }
});

// Delete measurement
router.delete('/anthropometric/:id', [auth, requireProfessional], async (req, res) => {
  try {
    const measurement = await AnthropometricMeasurement.findOneAndDelete({
      _id: req.params.id,
      professionalId: req.user._id
    });

    if (!measurement) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Measurement not found'
        }
      });
    }

    res.json(measurement);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error deleting measurement'
      }
    });
  }
});

module.exports = router; 