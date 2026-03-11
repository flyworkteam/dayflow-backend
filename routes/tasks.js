const router = require('express').Router();
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const taskController = require('../controllers/taskController');

router.use(authenticate);

// GET /api/tasks?date=YYYY-MM-DD
router.get(
  '/',
  [query('date').optional().isDate().withMessage('Geçerli bir tarih giriniz (YYYY-MM-DD).')],
  validate,
  taskController.getByDate
);

// POST /api/tasks
router.post(
  '/',
  [
    body('title').notEmpty().trim().isLength({ max: 255 }).withMessage('Görev başlığı gerekli.'),
    body('color_hex').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('icon_name').optional().isString(),
    body('dates').optional().isArray(),
  ],
  validate,
  taskController.create
);

// PUT /api/tasks/:id
router.put(
  '/:id',
  [
    body('title').optional().trim().isLength({ max: 255 }),
    body('color_hex').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  ],
  validate,
  taskController.update
);

// PUT /api/tasks/:id/toggle
router.put('/:id/toggle', taskController.toggle);

// DELETE /api/tasks/:id
router.delete('/:id', taskController.remove);

module.exports = router;
