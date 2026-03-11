const router = require('express').Router();
const authenticate = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

router.use(authenticate);

// GET /api/notifications
router.get('/', notificationController.getAll);

// PUT /api/notifications/read-all
router.put('/read-all', notificationController.markAllRead);

// PUT /api/notifications/:id/read
router.put('/:id/read', notificationController.markRead);

// DELETE /api/notifications (all)
router.delete('/', notificationController.removeAll);

// DELETE /api/notifications/:id
router.delete('/:id', notificationController.remove);

module.exports = router;
