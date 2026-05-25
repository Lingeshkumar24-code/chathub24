/**
 * Authentication Routes
 * POST /api/auth/register - Register new user
 * POST /api/auth/login - Login user
 * GET /api/auth/me - Get current user profile
 * POST /api/auth/logout - Logout user
 */

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Register
router.post(
  '/register',
  [body('email').isEmail(), body('password').isLength({ min: 6 }), body('username').isLength({ min: 2 })],
  authController.register,
);

// Login
router.post(
  '/login',
  [body('email').isEmail(), body('password').exists()],
  authController.login,
);

// Get profile
router.get('/me', authMiddleware, authController.getProfile);

// Logout
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
