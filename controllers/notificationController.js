const pool = require('../config/db');
const { AppError } = require('../utils/errors');

// GET /api/notifications
exports.getAll = async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, user_id, title, body, icon_name, icon_bg_hex, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.userId]
    );

    // Group by date (Bugün, Dün, etc.)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const grouped = { today: [], yesterday: [], older: [] };
    for (const n of rows) {
      const created = new Date(n.created_at);
      const createdDate = new Date(created.getFullYear(), created.getMonth(), created.getDate());

      if (createdDate.getTime() === today.getTime()) {
        grouped.today.push(n);
      } else if (createdDate.getTime() === yesterday.getTime()) {
        grouped.yesterday.push(n);
      } else {
        grouped.older.push(n);
      }
    }

    res.json({ notifications: grouped });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/:id/read
exports.markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (result.affectedRows === 0) throw new AppError('Bildirim bulunamadı.', 404);
    res.json({ message: 'Bildirim okundu.' });
  } catch (err) {
    next(err);
  }
};

// PUT /api/notifications/read-all
exports.markAllRead = async (req, res, next) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.userId]
    );
    res.json({ message: 'Tüm bildirimler okundu.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/notifications/:id
exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      'DELETE FROM notifications WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (result.affectedRows === 0) throw new AppError('Bildirim bulunamadı.', 404);
    res.json({ message: 'Bildirim silindi.' });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/notifications — Delete all
exports.removeAll = async (req, res, next) => {
  try {
    await pool.execute('DELETE FROM notifications WHERE user_id = ?', [req.userId]);
    res.json({ message: 'Tüm bildirimler silindi.' });
  } catch (err) {
    next(err);
  }
};

// Internal helper: Create notification (used by other controllers)
exports.createNotification = async (userId, title, body, iconName = 'notifications', iconBgHex = '#6ACBFF') => {
  await pool.execute(
    'INSERT INTO notifications (user_id, title, body, icon_name, icon_bg_hex) VALUES (?, ?, ?, ?, ?)',
    [userId, title, body, iconName, iconBgHex]
  );
};
