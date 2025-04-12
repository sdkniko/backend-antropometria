const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Athlete = require('../models/Athlete');
const Professional = require('../models/Professional');
const { body, validationResult } = require('express-validator');
const { check } = require('express-validator');

// Register new user
router.post('/register', [
  check('name').trim().notEmpty().withMessage('Name is required'),
  check('email').isEmail().withMessage('Please enter a valid email'),
  check('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  check('role')
    .isIn(['athlete', 'professional'])
    .withMessage('Role must be either athlete or professional'),
  check('gender')
    .if(check('role').equals('athlete'))
    .isIn(['male', 'female', 'other'])
    .withMessage('Invalid gender'),
  check('age')
    .if(check('role').equals('athlete'))
    .isInt({ min: 0 })
    .withMessage('Age must be a positive integer'),
  check('country')
    .if(check('role').equals('athlete'))
    .trim()
    .notEmpty()
    .withMessage('Country is required'),
  check('professionalId')
    .if(check('role').equals('athlete'))
    .trim()
    .notEmpty()
    .withMessage('Professional ID is required')
    .custom(async (value, { req }) => {
      if (!/^[0-9a-fA-F]{24}$/.test(value)) {
        throw new Error('Professional ID must be a valid MongoDB ObjectId');
      }
      // Check if professional exists
      const professional = await User.findOne({ 
        _id: value, 
        role: 'professional' 
      });
      if (!professional) {
        throw new Error('Professional not found');
      }
      return true;
    }),
  check('specialization')
    .if(check('role').equals('professional'))
    .trim()
    .notEmpty()
    .withMessage('Specialization is required'),
  check('licenseNumber')
    .if(check('role').equals('professional'))
    .trim()
    .notEmpty()
    .withMessage('License number is required'),
  check('yearsOfExperience')
    .if(check('role').equals('professional'))
    .isInt({ min: 0 })
    .withMessage('Years of experience must be a positive integer'),
], async (req, res) => {
  try {
    console.log('Registration request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: errors.array().map(err => ({
            field: err.param,
            message: err.msg
          }))
        }
      });
    }

    const { name, email, password, role, gender, age, country, sport, position, professionalId, specialization, licenseNumber, yearsOfExperience } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        error: {
          message: 'User already exists',
          details: [{ field: 'email', message: 'Email is already registered' }]
        }
      });
    }

    // Create new user
    if (role === 'athlete') {
      user = new Athlete({
        name,
        email,
        password,
        role,
        gender,
        age,
        country,
        sport,
        position,
        professionalId
      });
    } else {
      user = new Professional({
        name,
        email,
        password,
        role,
        specialization,
        licenseNumber,
        yearsOfExperience
      });
    }

    await user.save();

    // Generate tokens
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token,
      refreshToken
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          details: Object.entries(err.errors).map(([field, error]) => ({
            field,
            message: error.message
          }))
        }
      });
    }
    res.status(500).json({
      error: {
        message: 'Server error',
        details: [{ message: 'An unexpected error occurred' }]
      }
    });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Generate tokens
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    res.json({
      user: user.getPublicProfile(),
      token,
      refreshToken
    });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error logging in'
      }
    });
  }
});

// Refresh token
router.post('/refresh', [
  body('refreshToken').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { refreshToken } = req.body;

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid refresh token'
        }
      });
    }

    // Generate new tokens
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const newRefreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid refresh token'
      }
    });
  }
});

module.exports = router; 