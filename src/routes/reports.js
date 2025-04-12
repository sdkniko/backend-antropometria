const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { auth, requireProfessional } = require('../middleware/auth');
const Report = require('../models/Report');
const User = require('../models/User');
const AnthropometricMeasurement = require('../models/AnthropometricMeasurement');
const PerformanceMetrics = require('../models/PerformanceMetrics');
const HealthMetrics = require('../models/HealthMetrics');

// Generate new report
router.post('/', [
  auth,
  requireProfessional,
  body('userId').isMongoId(),
  body('type').isIn(['individual', 'group']),
  body('format').isIn(['pdf', 'excel']),
  body('startDate').optional().isISO8601(),
  body('endDate').optional().isISO8601(),
  body('metrics').optional().isArray(),
  body('shared').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify user exists and is assigned to the professional
    const user = await User.findOne({
      _id: req.body.userId,
      role: 'user',
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

    // Gather data for the report
    const query = {
      userId: req.body.userId,
      date: {}
    };

    if (req.body.startDate) {
      query.date.$gte = new Date(req.body.startDate);
    }
    if (req.body.endDate) {
      query.date.$lte = new Date(req.body.endDate);
    }

    const [measurements, performance, health] = await Promise.all([
      AnthropometricMeasurement.find(query),
      PerformanceMetrics.find(query),
      HealthMetrics.find(query)
    ]);

    // Generate report content
    const content = {
      user: {
        name: user.name,
        age: user.age,
        gender: user.gender,
        sport: user.sport,
        position: user.position
      },
      measurements,
      performance,
      health,
      period: {
        start: req.body.startDate,
        end: req.body.endDate
      }
    };

    const report = new Report({
      userId: req.body.userId,
      professionalId: req.user._id,
      type: req.body.type,
      format: req.body.format,
      content,
      shared: req.body.shared || false
    });

    await report.save();
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error generating report'
      }
    });
  }
});

// Get reports
router.get('/', auth, async (req, res) => {
  try {
    const { type, format, startDate, endDate, page = 1, limit = 10 } = req.query;
    
    const query = {};
    
    if (req.user.role === 'professional') {
      query.professionalId = req.user._id;
    } else {
      query.userId = req.user._id;
    }

    if (type) {
      query.type = type;
    }

    if (format) {
      query.format = format;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find(query)
        .sort({ date: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Report.countDocuments(query)
    ]);

    res.json({
      data: reports,
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
        message: 'Error fetching reports'
      }
    });
  }
});

// Get single report
router.get('/:id', auth, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    
    if (req.user.role === 'professional') {
      query.professionalId = req.user._id;
    } else {
      query.userId = req.user._id;
    }

    const report = await Report.findOne(query);

    if (!report) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error fetching report'
      }
    });
  }
});

// Share report
router.post('/:id/share', [auth, requireProfessional], async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      professionalId: req.user._id
    });

    if (!report) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    report.shared = true;
    await report.save();

    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error sharing report'
      }
    });
  }
});

// Access shared report
router.get('/shared/:accessCode', async (req, res) => {
  try {
    const report = await Report.findOne({
      accessCode: req.params.accessCode,
      shared: true
    });

    if (!report) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found or not shared'
        }
      });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error accessing shared report'
      }
    });
  }
});

// Delete report
router.delete('/:id', [auth, requireProfessional], async (req, res) => {
  try {
    const report = await Report.findOneAndDelete({
      _id: req.params.id,
      professionalId: req.user._id
    });

    if (!report) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Report not found'
        }
      });
    }

    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error deleting report'
      }
    });
  }
});

module.exports = router; 