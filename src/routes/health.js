const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth } = require('../middleware/auth');
const HealthMetrics = require('../models/HealthMetrics');
const User = require('../models/User');

// Create new health record
router.post('/', [
  auth,
  body('date').optional().isISO8601(),
  body('sleep.duration').optional().isFloat({ min: 0 }),
  body('sleep.quality').optional().isFloat({ min: 0, max: 100 }),
  body('sleep.deepSleep').optional().isFloat({ min: 0 }),
  body('sleep.lightSleep').optional().isFloat({ min: 0 }),
  body('sleep.remSleep').optional().isFloat({ min: 0 }),
  body('stress').optional().isFloat({ min: 0, max: 100 }),
  body('restingHeartRate').optional().isFloat({ min: 0 }),
  body('heartRateVariability').optional().isFloat({ min: 0 }),
  body('steps').optional().isFloat({ min: 0 }),
  body('source').isIn(['garmin', 'google_fit', 'apple_health']),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const health = new HealthMetrics({
      ...req.body,
      userId: req.user._id
    });

    await health.save();
    res.status(201).json(health);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error creating health record'
      }
    });
  }
});

// Get health records
router.get('/', auth, async (req, res) => {
  try {
    const { startDate, endDate, source, page = 1, limit = 10 } = req.query;
    
    const query = { userId: req.user._id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    if (source) {
      query.source = source;
    }

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      HealthMetrics.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      HealthMetrics.countDocuments(query)
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
        message: 'Error fetching health records'
      }
    });
  }
});

// Get single health record
router.get('/:id', auth, async (req, res) => {
  try {
    const record = await HealthMetrics.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!record) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Health record not found'
        }
      });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error fetching health record'
      }
    });
  }
});

// Update health record
router.put('/:id', [
  auth,
  body('date').optional().isISO8601(),
  body('sleep.duration').optional().isFloat({ min: 0 }),
  body('sleep.quality').optional().isFloat({ min: 0, max: 100 }),
  body('sleep.deepSleep').optional().isFloat({ min: 0 }),
  body('sleep.lightSleep').optional().isFloat({ min: 0 }),
  body('sleep.remSleep').optional().isFloat({ min: 0 }),
  body('stress').optional().isFloat({ min: 0, max: 100 }),
  body('restingHeartRate').optional().isFloat({ min: 0 }),
  body('heartRateVariability').optional().isFloat({ min: 0 }),
  body('steps').optional().isFloat({ min: 0 }),
  body('source').optional().isIn(['garmin', 'google_fit', 'apple_health']),
  body('notes').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const record = await HealthMetrics.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!record) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Health record not found'
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
        message: 'Error updating health record'
      }
    });
  }
});

// Delete health record
router.delete('/:id', auth, async (req, res) => {
  try {
    const record = await HealthMetrics.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!record) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Health record not found'
        }
      });
    }

    res.json(record);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error deleting health record'
      }
    });
  }
});

module.exports = router; 