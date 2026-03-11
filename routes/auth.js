const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

// POST /api/auth/register
router.post(
  '/register',
  authLimiter,
  [body('firebase_token').notEmpty().withMessage('Firebase token gerekli.')],
  validate,
  authController.register
);

// POST /api/auth/login
router.post(
  '/login',
  authLimiter,
  [body('firebase_token').notEmpty().withMessage('Firebase token gerekli.')],
  validate,
  authController.login
);

// GET /api/auth/me
router.get('/me', authenticate, authController.me);

// DELETE /api/auth/account
router.delete('/account', authenticate, authController.deleteAccount);

module.exports = router;
