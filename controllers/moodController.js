const pool = require('../config/db');
const { AppError } = require('../utils/errors');
const { formatDate } = require('../utils/helpers');

// POST /api/moods — Log mood for today (or specified date)
exports.log = async (req, res, next) => {
  try {
    const { mood_index, date } = req.body;
    const moodDate = date || formatDate(new Date());

    await pool.execute(
      `INSERT INTO moods (user_id, mood_index, date)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE mood_index = VALUES(mood_index)`,
      [req.userId, mood_index, moodDate]
    );

    const [rows] = await pool.execute(
      'SELECT id, user_id, mood_index, date, created_at FROM moods WHERE user_id = ? AND date = ?',
      [req.userId, moodDate]
    );

    res.status(201).json({ message: 'Ruh hali kaydedildi.', mood: rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/moods?date=YYYY-MM-DD
exports.getByDate = async (req, res, next) => {
  try {
    const { date } = req.query;
    const moodDate = date || formatDate(new Date());

    const [rows] = await pool.execute(
      'SELECT id, user_id, mood_index, date, created_at FROM moods WHERE user_id = ? AND date = ?',
      [req.userId, moodDate]
    );

    res.json({ mood: rows.length > 0 ? rows[0] : null });
  } catch (err) {
    next(err);
  }
};

// GET /api/moods/weekly?start=YYYY-MM-DD
exports.getWeekly = async (req, res, next) => {
  try {
    const { start } = req.query;
    let startDate;

    if (start) {
      startDate = new Date(start);
    } else {
      // Default: current week (Monday-based)
      startDate = new Date();
      const day = startDate.getDay();
      const diff = day === 0 ? 6 : day - 1; // Adjust to Monday
      startDate.setDate(startDate.getDate() - diff);
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const [rows] = await pool.execute(
      'SELECT id, user_id, mood_index, date, created_at FROM moods WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date',
      [req.userId, formatDate(startDate), formatDate(endDate)]
    );

    res.json({ moods: rows });
  } catch (err) {
    next(err);
  }
};

// ── Notes ──────────────────────────────────────────

// POST /api/moods/notes
exports.createNote = async (req, res, next) => {
  try {
    const { content, date } = req.body;
    const noteDate = date || formatDate(new Date());

    const [result] = await pool.execute(
      'INSERT INTO notes (user_id, content, date) VALUES (?, ?, ?)',
      [req.userId, content, noteDate]
    );

    const [rows] = await pool.execute(
      'SELECT id, user_id, content, date, created_at FROM notes WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ message: 'Not kaydedildi.', note: rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/moods/notes?date=YYYY-MM-DD
exports.getNotes = async (req, res, next) => {
  try {
    const { date } = req.query;
    const noteDate = date || formatDate(new Date());

    const [rows] = await pool.execute(
      'SELECT id, user_id, content, date, created_at FROM notes WHERE user_id = ? AND date = ? ORDER BY created_at DESC',
      [req.userId, noteDate]
    );

    res.json({ notes: rows });
  } catch (err) {
    next(err);
  }
};

// PUT /api/moods/notes/:id
exports.updateNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const [result] = await pool.execute(
      'UPDATE notes SET content = ?, updated_at = NOW() WHERE id = ? AND user_id = ?',
      [content, id, req.userId]
    );
    if (result.affectedRows === 0) throw new AppError('Not bulunamadı.', 404);

    const [rows] = await pool.execute(
      'SELECT id, user_id, content, date, created_at FROM notes WHERE id = ?',
      [id]
    );

    res.json({ message: 'Not güncellendi.', note: rows[0] });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/moods/notes/:id
exports.deleteNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      'DELETE FROM notes WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    if (result.affectedRows === 0) throw new AppError('Not bulunamadı.', 404);
    res.json({ message: 'Not silindi.' });
  } catch (err) {
    next(err);
  }
};

// ── Day Trackers ──────────────────────────────────

// GET /api/moods/trackers?date=YYYY-MM-DD
exports.getTrackers = async (req, res, next) => {
  try {
    const { date } = req.query;
    const trackerDate = date || formatDate(new Date());

    const [rows] = await pool.execute(
      'SELECT * FROM day_trackers WHERE user_id = ? AND date = ? ORDER BY id',
      [req.userId, trackerDate]
    );

    res.json({ trackers: rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/moods/trackers
exports.upsertTracker = async (req, res, next) => {
  try {
    const { title, color_hex, icon_name, tracker_type, value, date } = req.body;
    const trackerDate = date || formatDate(new Date());

    await pool.execute(
      `INSERT INTO day_trackers (user_id, title, color_hex, icon_name, tracker_type, value, date)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = NOW()`,
      [req.userId, title, color_hex, icon_name, tracker_type || 'mood', value || 0, trackerDate]
    );

    const [rows] = await pool.execute(
      'SELECT * FROM day_trackers WHERE user_id = ? AND date = ? AND title = ? ORDER BY id DESC LIMIT 1',
      [req.userId, trackerDate, title]
    );

    res.status(201).json({ message: 'Takipçi güncellendi.', tracker: rows[0] });
  } catch (err) {
    next(err);
  }
};
