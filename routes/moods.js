const router = require('express').Router();
const { body, query } = require('express-validator');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const moodController = require('../controllers/moodController');

router.use(authenticate);

// ── Moods ──────────────────────────────────────────

// POST /api/moods
router.post(
  '/',
  [
    body('mood_index').isInt({ min: 0, max: 5 }).withMessage('Ruh hali 0-5 arasında olmalı.'),
    body('date').optional().isDate(),
  ],
  validate,
  moodController.log
);

// GET /api/moods?date=YYYY-MM-DD
router.get(
  '/',
  [query('date').optional().isDate()],
  validate,
  moodController.getByDate
);

// GET /api/moods/weekly?start=YYYY-MM-DD
router.get(
  '/weekly',
  [query('start').optional().isDate()],
  validate,
  moodController.getWeekly
);

// ── Notes ──────────────────────────────────────────

// POST /api/moods/notes
router.post(
  '/notes',
  [
    body('content').notEmpty().trim().withMessage('Not içeriği gerekli.'),
    body('date').optional().isDate(),
  ],
  validate,
  moodController.createNote
);

// GET /api/moods/notes?date=YYYY-MM-DD
router.get(
  '/notes',
  [query('date').optional().isDate()],
  validate,
  moodController.getNotes
);

// PUT /api/moods/notes/:id
router.put(
  '/notes/:id',
  [body('content').notEmpty().trim()],
  validate,
  moodController.updateNote
);

// DELETE /api/moods/notes/:id
router.delete('/notes/:id', moodController.deleteNote);

// ── Day Trackers ──────────────────────────────────

// GET /api/moods/trackers?date=YYYY-MM-DD
router.get(
  '/trackers',
  [query('date').optional().isDate()],
  validate,
  moodController.getTrackers
);

// POST /api/moods/trackers
router.post(
  '/trackers',
  [
    body('title').notEmpty().trim(),
    body('color_hex').matches(/^#[0-9A-Fa-f]{6}$/),
    body('icon_name').notEmpty().isString(),
    body('tracker_type').optional().isIn(['mood', 'counter']),
    body('value').optional().isInt(),
    body('date').optional().isDate(),
  ],
  validate,
  moodController.upsertTracker
);

module.exports = router;
