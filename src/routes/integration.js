const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const User = require('../models/User');

// Connect Garmin account
router.post('/garmin', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // TODO: Implement Garmin OAuth flow
    // For now, just store the connection status
    user.integrations = user.integrations || {};
    user.integrations.garmin = {
      connected: true,
      lastSync: new Date()
    };

    await user.save();
    res.json({ message: 'Garmin account connected successfully' });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error connecting Garmin account'
      }
    });
  }
});

// Connect Google Fit account
router.post('/google-fit', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // TODO: Implement Google Fit OAuth flow
    // For now, just store the connection status
    user.integrations = user.integrations || {};
    user.integrations.googleFit = {
      connected: true,
      lastSync: new Date()
    };

    await user.save();
    res.json({ message: 'Google Fit account connected successfully' });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error connecting Google Fit account'
      }
    });
  }
});

// Connect Apple Health account
router.post('/apple-health', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // TODO: Implement Apple Health OAuth flow
    // For now, just store the connection status
    user.integrations = user.integrations || {};
    user.integrations.appleHealth = {
      connected: true,
      lastSync: new Date()
    };

    await user.save();
    res.json({ message: 'Apple Health account connected successfully' });
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error connecting Apple Health account'
      }
    });
  }
});

// Get integration status
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    res.json(user.integrations || {});
  } catch (error) {
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Error fetching integration status'
      }
    });
  }
});

module.exports = router; 