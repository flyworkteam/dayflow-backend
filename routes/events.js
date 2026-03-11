const router = require('express').Router();
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const eventController = require('../controllers/eventController');

router.use(authenticate);

// GET /api/events?month=M&year=Y
router.get(
  '/',
  [
    query('month').optional().isInt({ min: 1, max: 12 }),
    query('year').optional().isInt({ min: 2020, max: 2100 }),
  ],
  validate,
  eventController.getByMonth
);

// GET /api/events/:id
router.get('/:id', eventController.getById);

// POST /api/events
router.post(
  '/',
  [
    body('title').notEmpty().trim().isLength({ max: 255 }).withMessage('Etkinlik başlığı gerekli.'),
    body('description').optional({ nullable: true }).isString(),
    body('start_date').notEmpty().isDate().withMessage('Başlangıç tarihi gerekli.'),
    body('end_date').optional({ nullable: true }).isDate(),
    body('start_time').optional({ nullable: true }).isString(),
    body('end_time').optional({ nullable: true }).isString(),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('repeat_type').optional().isIn(['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']),
    body('is_all_day').optional().isBoolean(),
  ],
  validate,
  eventController.create
);

// PUT /api/events/:id
router.put(
  '/:id',
  [
    body('title').optional().trim().isLength({ max: 255 }),
    body('description').optional({ nullable: true }).isString(),
    body('start_date').optional().isDate(),
    body('end_date').optional({ nullable: true }).isDate(),
    body('start_time').optional({ nullable: true }).isString(),
    body('end_time').optional({ nullable: true }).isString(),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('repeat_type').optional().isIn(['none', 'daily', 'weekly', 'biweekly', 'monthly', 'yearly']),
    body('is_all_day').optional().isBoolean(),
  ],
  validate,
  eventController.update
);

// DELETE /api/events/:id
router.delete('/:id', eventController.remove);

module.exports = router;
