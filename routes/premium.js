const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const premiumController = require('../controllers/premiumController');

// GET /api/premium/status (requires auth)
router.get('/status', authenticate, premiumController.getStatus);

// POST /api/premium/verify (requires auth)
router.post(
  '/verify',
  authenticate,
  [
    body('plan_type').isIn(['monthly', 'yearly']).withMessage('Geçerli bir plan türü seçin.'),
    body('expires_at').notEmpty().withMessage('Bitiş tarihi gerekli.'),
  ],
  validate,
  premiumController.verify
);

// POST /api/premium/webhook (no auth — server-to-server from RevenueCat)
router.post('/webhook', premiumController.webhook);

module.exports = router;
