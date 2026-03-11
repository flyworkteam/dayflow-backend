const router = require('express').Router();
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const routineController = require('../controllers/routineController');

router.use(authenticate);

// GET /api/routines?category=X
router.get(
  '/',
  [query('category').optional().isString()],
  validate,
  routineController.getAll
);

// GET /api/routines/active
router.get('/active', routineController.getActive);

// GET /api/routines/categories
router.get('/categories', routineController.getCategories);

// POST /api/routines
router.post(
  '/',
  [
    body('title').notEmpty().trim().isLength({ max: 100 }),
    body('category').notEmpty().trim().isLength({ max: 50 }),
    body('description').optional().isString(),
  ],
  validate,
  routineController.create
);

// PUT /api/routines/:id
router.put(
  '/:id',
  [
    body('title').optional().trim().isLength({ max: 100 }),
    body('category').optional().trim().isLength({ max: 50 }),
    body('description').optional().isString(),
  ],
  validate,
  routineController.update
);

// POST /api/routines/:id/toggle
router.post('/:id/toggle', routineController.toggle);

module.exports = router;
