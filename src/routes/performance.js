const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth, requireProfessional } = require('../middleware/auth');
const PerformanceMetrics = require('../models/PerformanceMetrics');
const User = require('../models/User');

// Create new performance record
router.post('/', [
  auth,
  requireProfessional,
  body('userId').isMongoId().withMessage('Valid user ID is required'),
  body('date').optional().isISO8601().withMessage('Valid date is required'),
  body('vo2max').optional().isFloat({ min: 0 }).withMessage('VO2 max must be a positive number'),
  body('power').optional().isFloat({ min: 0 }).withMessage('Power must be a positive number'),
  body('speed').optional().isFloat({ min: 0 }).withMessage('Speed must be a positive number'),
  body('trainingLoad').optional().isFloat({ min: 0 }).withMessage('Training load must be a positive number'),
  body('sport').optional().isString().withMessage('Sport must be a string'),
  body('position').optional().isString().withMessage('Position must be a string'),
  body('notes').optional().isString().withMessage('Notes must be a string')
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

    const performance = new PerformanceMetrics({
      ...req.body,
      professionalId: req.user._id
    });

    await performance.save();
    res.status(201).json(performance);
  } catch (error) {
    console.error('Error creating performance record:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error creating performance record'
      }
    });
  }
});

// Get performance records
router.get('/', auth, async (req, res) => {
  try {
    const { userId, startDate, endDate, sport, page = 1, limit = 10 } = req.query;
    
    const query = {};
    
    if (req.user.role === 'professional') {
      query.professionalId = req.user._id;
      if (userId) {
        query.userId = userId;
      }
    } else {
      query.userId = req.user._id;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (sport) {
      query.sport = { $regex: sport, $options: 'i' };
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      PerformanceMetrics.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PerformanceMetrics.countDocuments(query)
    ]);

    res.json({
      data: records,
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
        message: 'Error fetching performance records'
      }
    });
  }
});

// Get single performance record
router.get('/:id', auth, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    if (req.user.role === 'professional') {
      query.professionalId = req.user._id;
    } else {
      query.userId = req.user._id;
    }

    const record = await PerformanceMetrics.findOne(query);

    if (!record) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Performance record not found'
        }
      });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error fetching performance record'
      }
    });
  }
});

// Update performance record
router.put('/:id', [
  auth,
  requireProfessional,
  body('date').optional().isISO8601(),
  body('vo2max').optional().isFloat({ min: 0 }),
  body('power').optional().isFloat({ min: 0 }),
  body('speed').optional().isFloat({ min: 0 }),
  body('trainingLoad').optional().isFloat({ min: 0 }),
  body('sport').optional().isString(),
  body('position').optional().isString(),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const record = await PerformanceMetrics.findOne({
      _id: req.params.id,
      professionalId: req.user._id
    });

    if (!record) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Performance record not found'
        }
      });
    }

    const updates = Object.keys(req.body);
    updates.forEach(update => {
      record[update] = req.body[update];
    });

    await record.save();
    res.json(record);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error updating performance record'
      }
    });
  }
});

// Delete performance record
router.delete('/:id', [auth, requireProfessional], async (req, res) => {
  try {
    const record = await PerformanceMetrics.findOneAndDelete({
      _id: req.params.id,
      professionalId: req.user._id
    });

    if (!record) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Performance record not found'
        }
      });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error deleting performance record'
      }
    });
  }
});

module.exports = router; 