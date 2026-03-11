const router = require('express').Router();
const { body } = require('express-validator');
const multer = require('multer');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const userController = require('../controllers/userController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
  fileFilter(_, file, cb) {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Yalnızca resim dosyası yüklenebilir.'));
  },
});

router.use(authenticate);

// GET /api/users/profile
router.get('/profile', userController.getProfile);

// PUT /api/users/profile
router.put(
  '/profile',
  [
    body('name').optional().isString().trim().isLength({ max: 100 }),
    body('age').optional().isInt({ min: 1, max: 150 }),
    body('gender').optional().isInt({ min: 0, max: 2 }),
    body('avatar_url').optional().isString().isLength({ max: 500 }),
  ],
  validate,
  userController.updateProfile
);

// PUT /api/users/language
router.put(
  '/language',
  [body('language').notEmpty().isString().isLength({ max: 5 })],
  validate,
  userController.updateLanguage
);

// POST /api/users/questionnaire
router.post(
  '/questionnaire',
  [body('answers').isArray({ min: 1 }).withMessage('Cevaplar dizisi gerekli.')],
  validate,
  userController.saveQuestionnaire
);

// GET /api/users/questionnaire
router.get('/questionnaire', userController.getQuestionnaire);

// POST /api/users/avatar
router.post('/avatar', upload.single('avatar'), userController.uploadAvatar);

module.exports = router;
