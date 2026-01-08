import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/userModel.js';
import logger from '../config/logger.js';

const router = express.Router();

// Add a route to get user details by username
router.get('/:username', protect, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    logger.error('Error fetching user by username:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router; 